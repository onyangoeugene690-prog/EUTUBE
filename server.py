from flask import Flask, request, send_file, jsonify, after_this_request
import yt_dlp
import os
import shutil
import tempfile
import urllib.request
import json
import re
import time
import threading
import imageio_ffmpeg

app = Flask(__name__, static_folder='.', static_url_path='')

FFMPEG_EXE = imageio_ffmpeg.get_ffmpeg_exe()
MAX_SEARCH_RESULTS = 100
SEARCH_TIMEOUT_SECONDS = 8
SEARCH_REQUEST_TIMEOUT_SECONDS = 4

# In-memory TTL Cache
CACHE = {}
CACHE_TTL = 900  # 15 minutes cache

def get_from_cache(key):
    if key in CACHE:
        data, timestamp = CACHE[key]
        if time.time() - timestamp < CACHE_TTL:
            return data
    return None

def set_in_cache(key, data):
    CACHE[key] = (data, time.time())

def clean_error_message(err):
    msg = str(err)
    # Remove ANSI terminal escape codes
    clean_msg = re.sub(r'\x1b\[[0-9;]*m', '', msg).strip()
    return clean_msg

@app.after_request
def after_request(response):
    response.headers.add('Access-Control-Allow-Origin', '*')
    response.headers.add('Access-Control-Allow-Headers', 'Content-Type,Authorization,Range')
    response.headers.add('Access-Control-Allow-Methods', 'GET,POST,OPTIONS')
    response.headers.add('Access-Control-Expose-Headers', 'Content-Disposition,Content-Range,Content-Length,Accept-Ranges')
    return response

@app.route('/')
def index():
    return app.send_static_file('index.html')

def extract_video_id(url):
    if not url:
        return None
    url = url.strip()
    if re.fullmatch(r'[0-9A-Za-z_-]{11}', url):
        return url
    patterns = [
        r'(?:v=|\/v\/|\/embed\/|\/shorts\/|\/live\/|youtu\.be\/)([0-9A-Za-z_-]{11})',
        r'select_pm_video\?v=([0-9A-Za-z_-]{11})'
    ]
    for pattern in patterns:
        match = re.search(pattern, url)
        if match:
            return match.group(1)
    return None

def fast_youtube_search(query, max_results=MAX_SEARCH_RESULTS):
    cached = get_from_cache(f"search:{query.lower()}:{max_results}")
    if cached:
        return cached

    url = 'https://www.youtube.com/youtubei/v1/search'
    results = []
    seen_ids = set()

    def extract_videos(data):
        if isinstance(data, dict):
            if 'videoRenderer' in data:
                vr = data['videoRenderer']
                v_id = vr.get('videoId')
                if v_id and v_id not in seen_ids and len(results) < max_results:
                    seen_ids.add(v_id)
                    title_runs = vr.get('title', {}).get('runs', [])
                    title = title_runs[0].get('text') if title_runs else 'Unknown Title'
                    duration = vr.get('lengthText', {}).get('simpleText') or 'N/A'
                    owner_runs = vr.get('ownerText', {}).get('runs', [])
                    uploader = owner_runs[0].get('text') if owner_runs else 'YouTube Channel'
                    views = vr.get('viewCountText', {}).get('simpleText') or ''
                    thumbs = vr.get('thumbnail', {}).get('thumbnails', [])
                    thumb = thumbs[-1].get('url') if thumbs else f'https://i.ytimg.com/vi/{v_id}/hqdefault.jpg'

                    results.append({
                        'id': v_id,
                        'title': title,
                        'thumbnail': thumb,
                        'duration': duration,
                        'uploader': uploader,
                        'views': views,
                        'url': f'https://www.youtube.com/watch?v={v_id}'
                    })
            else:
                for k, v in data.items():
                    extract_videos(v)
        elif isinstance(data, list):
            for item in data:
                extract_videos(item)

    def find_continuation_token(data):
        tokens = []
        def search(d):
            if isinstance(d, dict):
                if 'continuationCommand' in d:
                    tokens.append(d['continuationCommand']['token'])
                else:
                    for k, v in d.items():
                        search(v)
            elif isinstance(d, list):
                for item in d:
                    search(item)
        search(data)
        return tokens[0] if tokens else None

    try:
        cont_token = None
        seen_continuation_tokens = set()
        search_deadline = time.monotonic() + SEARCH_TIMEOUT_SECONDS
        while len(results) < max_results and time.monotonic() < search_deadline:
            req_payload = {'context': {'client': {'clientName': 'WEB', 'clientVersion': '2.20260101.00.00'}}}
            if cont_token:
                if cont_token in seen_continuation_tokens:
                    break
                seen_continuation_tokens.add(cont_token)
                req_payload['continuation'] = cont_token
            else:
                req_payload['query'] = query

            req = urllib.request.Request(
                url,
                data=json.dumps(req_payload).encode('utf-8'),
                headers={'Content-Type': 'application/json', 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)'}
            )
            request_timeout = min(
                SEARCH_REQUEST_TIMEOUT_SECONDS,
                max(0.1, search_deadline - time.monotonic())
            )
            res = json.loads(urllib.request.urlopen(req, timeout=request_timeout).read())
            extract_videos(res)
            cont_token = find_continuation_token(res)
            if not cont_token:
                break

        if results:
            set_in_cache(f"search:{query.lower()}:{max_results}", results)
            return results
    except Exception as e:
        print(f"InnerTube search failed for '{query}': {e}")
        if results:
            set_in_cache(f"search:{query.lower()}:{max_results}", results)
            return results

    # Fallback to yt_dlp
    return fallback_yt_dlp_search(query, max_results)

def fallback_yt_dlp_search(query, max_results=MAX_SEARCH_RESULTS):
    ydl_opts = {
        'default_search': 'ytsearch',
        'noplaylist': True,
        'quiet': True,
        'no_warnings': True,
        'no_color': True,
        'extract_flat': True,
        'skip_download': True,
        'socket_timeout': SEARCH_REQUEST_TIMEOUT_SECONDS,
        'retries': 1,
        'extractor_retries': 1
    }
    try:
        with yt_dlp.YoutubeDL(ydl_opts) as ydl:
            search_results = ydl.extract_info(f"ytsearch{max_results}:{query}", download=False)
            entries = search_results.get('entries', []) if search_results else []
            results = []
            for entry in entries:
                if entry:
                    v_id = entry.get('id')
                    if not v_id:
                        continue
                    thumbs = entry.get('thumbnails', [])
                    thumb = entry.get('thumbnail') or (thumbs[-1].get('url') if thumbs else f"https://i.ytimg.com/vi/{v_id}/hqdefault.jpg")
                    results.append({
                        'id': v_id,
                        'title': entry.get('title', 'Unknown Title'),
                        'thumbnail': thumb,
                        'duration': entry.get('duration_string') or 'N/A',
                        'uploader': entry.get('uploader') or entry.get('channel') or 'YouTube Channel',
                        'views': f"{entry.get('view_count'):,}" if entry.get('view_count') else '',
                        'url': entry.get('webpage_url') or f"https://www.youtube.com/watch?v={v_id}"
                    })
            if results:
                set_in_cache(f"search:{query.lower()}:{max_results}", results)
            return results
    except Exception as e:
        print(f"Fallback yt_dlp search failed for '{query}': {e}")
        return []

def fast_oembed_info(url):
    v_id = extract_video_id(url)
    if not v_id:
        return None

    cached = get_from_cache(f"info:{v_id}")
    if cached:
        return cached

    try:
        oembed_url = f"https://www.youtube.com/oembed?url=https://www.youtube.com/watch?v={v_id}&format=json"
        req = urllib.request.Request(oembed_url, headers={'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)'})
        res = json.loads(urllib.request.urlopen(req, timeout=5).read())

        info = {
            'is_search': False,
            'id': v_id,
            'title': res.get('title', 'YouTube Video'),
            'thumbnail': f"https://i.ytimg.com/vi/{v_id}/hqdefault.jpg",
            'duration': 'N/A',
            'uploader': res.get('author_name', 'YouTube Channel'),
            'views': '',
            'url': f"https://www.youtube.com/watch?v={v_id}"
        }
        set_in_cache(f"info:{v_id}", info)
        return info
    except Exception as e:
        print(f"oEmbed failed for {v_id}: {e}")
        return None

@app.route('/api/trending')
def trending():
    category = request.args.get('category', 'trending')
    results = fast_youtube_search(category, max_results=MAX_SEARCH_RESULTS)
    return jsonify({"results": results})

@app.route('/api/info')
def get_info():
    url = request.args.get('url')
    if not url:
        return jsonify({"error": "No URL provided"}), 400

    url = url.strip()
    v_id = extract_video_id(url)
    is_search = False if v_id else not (url.startswith('http://') or url.startswith('https://') or 'youtube.com' in url or 'youtu.be' in url)

    if is_search:
        results = fast_youtube_search(url, max_results=MAX_SEARCH_RESULTS)
        return jsonify({"is_search": True, "results": results})
    else:
        target_url = f"https://www.youtube.com/watch?v={v_id}" if v_id else url
        info = fast_oembed_info(target_url)
        if info:
            return jsonify(info)

        try:
            ydl_opts = {'quiet': True, 'no_warnings': True, 'no_color': True, 'skip_download': True, 'extract_flat': True}
            with yt_dlp.YoutubeDL(ydl_opts) as ydl:
                raw_info = ydl.extract_info(target_url, download=False)
                extracted_id = raw_info.get('id') or v_id or extract_video_id(target_url)
                info = {
                    'is_search': False,
                    'id': extracted_id,
                    'title': raw_info.get('title', 'YouTube Video'),
                    'thumbnail': raw_info.get('thumbnail') or (f"https://i.ytimg.com/vi/{extracted_id}/hqdefault.jpg" if extracted_id else ""),
                    'duration': raw_info.get('duration_string') or 'N/A',
                    'uploader': raw_info.get('uploader') or raw_info.get('channel') or 'YouTube Channel',
                    'views': f"{raw_info.get('view_count'):,}" if raw_info.get('view_count') else '',
                    'url': raw_info.get('webpage_url') or target_url
                }
                if extracted_id:
                    set_in_cache(f"info:{extracted_id}", info)
                return jsonify(info)
        except Exception as e:
            return jsonify({"error": clean_error_message(e)}), 500

@app.route('/api/stream')
def stream():
    url = request.args.get('url')
    if not url:
        return jsonify({"error": "No URL provided"}), 400

    url = url.strip()
    v_id = extract_video_id(url)
    target_url = f"https://www.youtube.com/watch?v={v_id}" if v_id else url

    cached = get_from_cache(f"stream:{target_url}")
    if cached:
        return jsonify(cached)

    ydl_opts = {
        'quiet': True,
        'no_warnings': True,
        'no_color': True,
        'ffmpeg_location': FFMPEG_EXE,
    }

    try:
        with yt_dlp.YoutubeDL(ydl_opts) as ydl:
            info = ydl.extract_info(target_url, download=False)
            formats = info.get('formats', [])

            # 1. Look for combined video + audio
            combined_formats = [
                f for f in formats
                if f.get('vcodec') not in (None, 'none')
                and f.get('acodec') not in (None, 'none')
                and f.get('url')
            ]

            # 2. Look for best video stream
            video_formats = [
                f for f in formats
                if f.get('vcodec') not in (None, 'none')
                and f.get('url')
            ]
            video_formats.sort(key=lambda f: (f.get('height') or 0, f.get('tbr') or 0, f.get('fps') or 0), reverse=True)

            best_format = combined_formats[0] if combined_formats else (video_formats[0] if video_formats else None)
            stream_url = best_format.get('url') if best_format else info.get('url')

            if stream_url:
                proxy_url = f"/api/proxy_stream?url={urllib.parse.quote(stream_url)}"
                data = {
                    'stream_url': stream_url,
                    'proxy_url': proxy_url,
                    'title': info.get('title'),
                    'id': info.get('id') or v_id
                }
                set_in_cache(f"stream:{target_url}", data)
                return jsonify(data)
            else:
                return jsonify({"error": "No streamable format found for this video"}), 404
    except Exception as e:
        return jsonify({"error": clean_error_message(e)}), 500

@app.route('/api/proxy_stream')
def proxy_stream():
    target_url = request.args.get('url')
    if not target_url:
        return jsonify({"error": "No stream URL provided"}), 400

    range_header = request.headers.get('Range')
    headers = {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    }
    if range_header:
        headers['Range'] = range_header

    try:
        req = urllib.request.Request(target_url, headers=headers)
        upstream = urllib.request.urlopen(req, timeout=10)

        status_code = upstream.status
        res_headers = {}
        for h in ['Content-Type', 'Content-Length', 'Accept-Ranges', 'Content-Range']:
            val = upstream.headers.get(h)
            if val:
                res_headers[h] = val

        def generate():
            while True:
                chunk = upstream.read(64 * 1024)
                if not chunk:
                    break
                yield chunk

        return app.response_class(generate(), status=status_code, headers=res_headers)
    except Exception as e:
        return jsonify({"error": clean_error_message(e)}), 500

@app.route('/api/formats')
def get_formats():
    url = request.args.get('url')
    if not url:
        return jsonify({"error": "No URL provided"}), 400

    url = url.strip()
    v_id = extract_video_id(url)
    target_url = f"https://www.youtube.com/watch?v={v_id}" if v_id else url

    ydl_opts = {
        'quiet': True,
        'no_warnings': True,
        'no_color': True,
        'ffmpeg_location': FFMPEG_EXE,
    }

    try:
        with yt_dlp.YoutubeDL(ydl_opts) as ydl:
            info = ydl.extract_info(target_url, download=False)
            raw_formats = info.get('formats', [])
            duration = info.get('duration')

            def estimate_size_bytes(stream_format):
                size = stream_format.get('filesize') or stream_format.get('filesize_approx')
                if size:
                    return size
                bitrate = stream_format.get('tbr')
                if duration and bitrate:
                    return bitrate * 1000 * duration / 8
                return None

            def format_size_label(size_bytes):
                if size_bytes is None:
                    return ''
                if size_bytes >= 1024 ** 3:
                    return f' (about {size_bytes / (1024 ** 3):.2f} GB)'
                return f' (about {size_bytes / (1024 ** 2):.0f} MB)'

            available_heights = set()
            raw_streams = []
            audio_candidates = [
                stream_format for stream_format in raw_formats
                if stream_format.get('acodec') not in (None, 'none')
                and stream_format.get('vcodec') == 'none'
            ]
            best_audio = max(
                audio_candidates,
                key=lambda stream_format: stream_format.get('abr') or stream_format.get('tbr') or 0,
                default=None
            )

            for f in raw_formats:
                height = f.get('height')
                vcodec = f.get('vcodec', 'none')
                if height and vcodec != 'none':
                    available_heights.add(height)

                fid = f.get('format_id')
                ext = f.get('ext', 'mp4')
                fps = f.get('fps')

                if fid and vcodec != 'none':
                    stream_size = estimate_size_bytes(f)
                    if f.get('acodec') in (None, 'none') and best_audio:
                        audio_size = estimate_size_bytes(best_audio)
                        if stream_size is not None and audio_size is not None:
                            stream_size += audio_size
                        else:
                            stream_size = None
                    size_str = format_size_label(stream_size)
                    fps_str = f"{int(fps)}fps" if fps and fps > 30 else ""
                    res_str = f"{height}p" if height else "Video"
                    raw_streams.append({
                        'id': f'raw_{fid}',
                        'label': f"Direct Stream: {res_str}{' ' + fps_str if fps_str else ''} ({ext.upper()}, {vcodec.split('.')[0]}){size_str}"
                    })

            sorted_res = sorted(list(available_heights), reverse=True)

            best_formats = [
                {'id': 'video_best_mp4', 'label': '🌟 Best Quality Available (MP4)'},
                {'id': 'video_best_webm', 'label': '🌟 Best Quality Available (WEBM)'},
                {'id': 'video_best_mkv', 'label': '🌟 Best Quality Available (MKV)'},
                {'id': 'video_best_mov', 'label': '🌟 Best Quality Available (MOV)'},
                {'id': 'video_best_avi', 'label': '🌟 Best Quality Available (AVI)'},
            ]

            video_formats = []
            video_containers = ['mp4', 'webm', 'mkv', 'mov', 'avi', 'flv', '3gp']

            for res in sorted_res:
                if res >= 4320:
                    label = f"8K Ultra HD ({res}p)"
                elif res >= 2160:
                    label = f"4K Ultra HD ({res}p)"
                elif res >= 1440:
                    label = f"2K QHD ({res}p)"
                elif res >= 1080:
                    label = f"1080p Full HD ({res}p)"
                elif res >= 720:
                    label = f"720p HD ({res}p)"
                elif res >= 480:
                    label = f"480p SD ({res}p)"
                elif res >= 360:
                    label = f"360p SD ({res}p)"
                elif res >= 240:
                    label = f"240p SD ({res}p)"
                else:
                    label = f"144p SD ({res}p)"

                video_candidates = [
                    stream_format for stream_format in raw_formats
                    if stream_format.get('height')
                    and stream_format.get('height') <= res
                    and stream_format.get('vcodec') not in (None, 'none')
                ]
                best_video = max(
                    video_candidates,
                    key=lambda stream_format: (stream_format.get('height') or 0, stream_format.get('tbr') or 0),
                    default=None
                )
                webm_video = max(
                    [stream_format for stream_format in video_candidates if stream_format.get('ext') == 'webm'],
                    key=lambda stream_format: (stream_format.get('height') or 0, stream_format.get('tbr') or 0),
                    default=best_video
                )
                webm_audio = max(
                    [stream_format for stream_format in audio_candidates if stream_format.get('ext') == 'webm'],
                    key=lambda stream_format: stream_format.get('abr') or stream_format.get('tbr') or 0,
                    default=best_audio
                )

                containers_to_use = video_containers if res <= 720 else ['mp4', 'webm', 'mkv', 'mov', 'avi']
                for ext in containers_to_use:
                    source_video = webm_video if ext == 'webm' else best_video
                    source_audio = webm_audio if ext == 'webm' else best_audio
                    estimated_size = None
                    if source_video:
                        video_size = estimate_size_bytes(source_video)
                        if source_audio:
                            audio_size = estimate_size_bytes(source_audio)
                            if video_size is not None and audio_size is not None:
                                estimated_size = video_size + audio_size
                        elif source_video.get('acodec') not in (None, 'none'):
                            estimated_size = video_size

                    video_formats.append({
                        'id': f'video_{res}_{ext}',
                        'label': f'{label} - {ext.upper()}{format_size_label(estimated_size)}'
                    })

            audio_formats = [
                {'id': 'audio_mp3', 'label': '🎵 High Quality MP3 Audio (320kbps)'},
                {'id': 'audio_m4a', 'label': '🎵 High Quality M4A / AAC Audio'},
                {'id': 'audio_wav', 'label': '🎵 Uncompressed WAV Audio'},
                {'id': 'audio_flac', 'label': '🎵 Lossless FLAC Audio'},
                {'id': 'audio_ogg', 'label': '🎵 OGG / Vorbis Audio'},
                {'id': 'audio_webm', 'label': '🎵 WEBM / Opus Audio'},
                {'id': 'audio_aac', 'label': '🎵 AAC Audio'},
            ]

            all_flat_formats = best_formats + video_formats + audio_formats + raw_streams[:15]

            return jsonify({
                'title': info.get('title'),
                'formats': all_flat_formats,
                'groups': [
                    {'group': '🌟 Best Quality Video Options', 'formats': best_formats},
                    {'group': '🎬 Video Formats & Resolutions', 'formats': video_formats},
                    {'group': '🎵 Audio Only Formats', 'formats': audio_formats},
                    {'group': '⚡ Direct Stream Raw Formats', 'formats': raw_streams[:15]}
                ]
            })
    except Exception as e:
        return jsonify({"error": clean_error_message(e)}), 500

@app.route('/api/download')
def download():
    url = request.args.get('url')
    format_id = request.args.get('format_id') or request.args.get('format', 'video_1080_mp4')

    if not url:
        return jsonify({"error": "No URL provided"}), 400

    url = url.strip()
    v_id = extract_video_id(url)
    target_url = f"https://www.youtube.com/watch?v={v_id}" if v_id else url

    download_dir = tempfile.mkdtemp(prefix='eutube-')

    ydl_opts = {
        'outtmpl': os.path.join(download_dir, '%(title)s.%(ext)s'),
        'noplaylist': True,
        'quiet': True,
        'no_warnings': True,
        'no_color': True,
        'ffmpeg_location': FFMPEG_EXE,
    }

    mimetype = 'video/mp4'
    target_ext = 'mp4'

    if format_id.startswith('video_'):
        parts = format_id.split('_')
        res_str = parts[1] if len(parts) > 1 else '1080'
        target_ext = parts[2] if len(parts) > 2 else 'mp4'

        mimetypes_map = {
            'mp4': 'video/mp4',
            'webm': 'video/webm',
            'mkv': 'video/x-matroska',
            'avi': 'video/x-msvideo',
            'mov': 'video/quicktime',
            'flv': 'video/x-flv',
            '3gp': 'video/3gpp'
        }
        mimetype = mimetypes_map.get(target_ext, f'video/{target_ext}')

        if target_ext == 'webm':
            if res_str == 'best':
                ydl_opts['format'] = (
                    'bestvideo[ext=webm]+bestaudio[ext=webm]/'
                    'bestvideo[ext=webm]+bestaudio/'
                    'bestvideo+bestaudio[ext=webm]/'
                    'bestvideo+bestaudio/best'
                )
            else:
                try:
                    height = int(res_str)
                    ydl_opts['format'] = (
                        f'bestvideo[height<={height}][ext=webm]+bestaudio[ext=webm]/'
                        f'bestvideo[height<={height}][ext=webm]+bestaudio/'
                        f'bestvideo[height<={height}]+bestaudio[ext=webm]/'
                        f'bestvideo[height<={height}]+bestaudio/best[height<={height}]/best'
                    )
                except ValueError:
                    ydl_opts['format'] = (
                        'bestvideo[ext=webm]+bestaudio[ext=webm]/'
                        'bestvideo[ext=webm]+bestaudio/'
                        'bestvideo+bestaudio[ext=webm]/'
                        'bestvideo+bestaudio/best'
                    )
            ydl_opts['merge_output_format'] = 'webm'
            ydl_opts['postprocessor_args'] = {
                'merger': ['-c:v', 'copy', '-c:a', 'libopus']
            }
        else:
            if res_str == 'best':
                ydl_opts['format'] = 'bestvideo+bestaudio/best'
            else:
                try:
                    height = int(res_str)
                    ydl_opts['format'] = f'bestvideo[height<={height}]+bestaudio/best[height<={height}]/best'
                except ValueError:
                    ydl_opts['format'] = 'bestvideo+bestaudio/best'

            ydl_opts['merge_output_format'] = target_ext

            if target_ext in ['mp4', 'mov', 'm4v']:
                ydl_opts['postprocessor_args'] = {
                    'ffmpeg': ['-c:a', 'aac', '-movflags', '+faststart']
                }

    elif format_id.startswith('audio_'):
        audio_type = format_id.replace('audio_', '')
        target_ext = audio_type

        audio_mime_map = {
            'mp3': 'audio/mpeg',
            'm4a': 'audio/mp4',
            'aac': 'audio/aac',
            'wav': 'audio/wav',
            'flac': 'audio/flac',
            'ogg': 'audio/ogg',
            'webm': 'audio/webm',
            'opus': 'audio/webm'
        }
        mimetype = audio_mime_map.get(audio_type, 'audio/mpeg')

        if audio_type == 'm4a':
            ydl_opts['format'] = 'bestaudio[ext=m4a]/bestaudio/best'
            ydl_opts['postprocessors'] = [{
                'key': 'FFmpegExtractAudio',
                'preferredcodec': 'm4a',
            }]
        elif audio_type in ['webm', 'opus']:
            target_ext = 'webm'
            ydl_opts['format'] = 'bestaudio[ext=webm]/bestaudio/best'
            ydl_opts['postprocessors'] = [{
                'key': 'FFmpegExtractAudio',
                'preferredcodec': 'opus',
            }]
        else:
            ydl_opts['format'] = 'bestaudio/best'
            codec_name = 'vorbis' if audio_type == 'ogg' else audio_type
            postproc = {
                'key': 'FFmpegExtractAudio',
                'preferredcodec': codec_name,
            }
            if audio_type == 'mp3':
                postproc['preferredquality'] = '320'
            ydl_opts['postprocessors'] = [postproc]

    elif format_id.startswith('raw_'):
        raw_id = format_id.replace('raw_', '')
        ydl_opts['format'] = f'{raw_id}+bestaudio/best'
        mimetype = 'video/mp4'
        target_ext = 'mp4'
        ydl_opts['postprocessor_args'] = {
            'ffmpeg': ['-c:a', 'aac', '-movflags', '+faststart']
        }
    else:
        if format_id in {'mp4', 'webm', 'mkv', 'avi', 'mov', 'flv', '3gp'}:
            target_ext = format_id
            mimetype = f'video/{format_id}'
            if format_id == 'webm':
                ydl_opts['format'] = (
                    'bestvideo[ext=webm]+bestaudio[ext=webm]/'
                    'bestvideo[ext=webm]+bestaudio/'
                    'bestvideo+bestaudio[ext=webm]/'
                    'bestvideo+bestaudio/best'
                )
                ydl_opts['merge_output_format'] = 'webm'
                ydl_opts['postprocessor_args'] = {
                    'merger': ['-c:v', 'copy', '-c:a', 'libopus']
                }
            else:
                ydl_opts['format'] = 'bestvideo+bestaudio/best'
                ydl_opts['merge_output_format'] = format_id
                if format_id in ['mp4', 'mov']:
                    ydl_opts['postprocessor_args'] = {
                        'ffmpeg': ['-c:a', 'aac', '-movflags', '+faststart']
                    }
        elif format_id in {'mp3', 'wav', 'flac', 'ogg', 'm4a', 'aac', 'webm', 'opus'}:
            target_ext = format_id
            audio_mime_map = {
                'mp3': 'audio/mpeg',
                'm4a': 'audio/mp4',
                'aac': 'audio/aac',
                'wav': 'audio/wav',
                'flac': 'audio/flac',
                'ogg': 'audio/ogg',
                'webm': 'audio/webm',
                'opus': 'audio/webm'
            }
            mimetype = audio_mime_map.get(format_id, 'audio/mpeg')
            if format_id in ['webm', 'opus']:
                target_ext = 'webm'
                ydl_opts['format'] = 'bestaudio[ext=webm]/bestaudio/best'
                ydl_opts['postprocessors'] = [{
                    'key': 'FFmpegExtractAudio',
                    'preferredcodec': 'opus',
                }]
            else:
                ydl_opts['format'] = 'bestaudio/best'
                codec_name = 'vorbis' if format_id == 'ogg' else format_id
                postproc = {
                    'key': 'FFmpegExtractAudio',
                    'preferredcodec': codec_name,
                }
                if format_id == 'mp3':
                    postproc['preferredquality'] = '320'
                ydl_opts['postprocessors'] = [postproc]
        else:
            ydl_opts['format'] = format_id

    try:
        with yt_dlp.YoutubeDL(ydl_opts) as ydl:
            info = ydl.extract_info(target_url, download=True)
            prep_filename = ydl.prepare_filename(info)

        actual_filename = None
        base_prep, _ = os.path.splitext(prep_filename)

        if target_ext:
            possible_exts = [target_ext]
            if target_ext == 'webm':
                possible_exts.extend(['opus', 'mkv', 'webm'])
            elif target_ext == 'mp3':
                possible_exts.extend(['m4a', 'wav'])

            for ext in possible_exts:
                cand = f"{base_prep}.{ext}"
                if os.path.exists(cand):
                    actual_filename = cand
                    break

        if not actual_filename:
            if os.path.exists(prep_filename):
                actual_filename = prep_filename
            else:
                files = [f for f in os.listdir(download_dir) if not f.endswith('.part') and not f.endswith('.ytdl')]
                if files:
                    files.sort(key=lambda f: os.path.getsize(os.path.join(download_dir, f)), reverse=True)
                    actual_filename = os.path.join(download_dir, files[0])
                else:
                    raise FileNotFoundError('The downloaded file could not be found.')

        out_basename = os.path.basename(actual_filename)
        actual_ext = os.path.splitext(out_basename)[1].lower().replace('.', '')

        if actual_ext:
            mimetypes_map = {
                'mp4': 'video/mp4',
                'webm': 'video/webm',
                'mkv': 'video/x-matroska',
                'avi': 'video/x-msvideo',
                'mov': 'video/quicktime',
                'flv': 'video/x-flv',
                '3gp': 'video/3gpp',
                'mp3': 'audio/mpeg',
                'm4a': 'audio/mp4',
                'aac': 'audio/aac',
                'wav': 'audio/wav',
                'flac': 'audio/flac',
                'ogg': 'audio/ogg',
            }
            mimetype = mimetypes_map.get(actual_ext, mimetype)

        @after_this_request
        def remove_download(response):
            shutil.rmtree(download_dir, ignore_errors=True)
            return response

        return send_file(
            actual_filename,
            as_attachment=True,
            download_name=out_basename,
            mimetype=mimetype,
        )
    except Exception as error:
        shutil.rmtree(download_dir, ignore_errors=True)
        return jsonify({"error": clean_error_message(error)}), 500

def prewarm_cache():
    categories = ['trending', 'music', 'gaming', 'news', 'tech']
    for cat in categories:
        try:
            fast_youtube_search(cat, max_results=MAX_SEARCH_RESULTS)
        except Exception:
            pass

if __name__ == '__main__':
    print("Starting EuTube Server at http://localhost:5000")
    threading.Thread(target=prewarm_cache, daemon=True).start()
    app.run(host='0.0.0.0', debug=False, port=int(os.environ.get('PORT', 5000)))
