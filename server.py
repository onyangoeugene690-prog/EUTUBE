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

app = Flask(__name__, static_folder='.')

FFMPEG_EXE = imageio_ffmpeg.get_ffmpeg_exe()

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

@app.after_request
def after_request(response):
    response.headers.add('Access-Control-Allow-Origin', '*')
    response.headers.add('Access-Control-Allow-Headers', 'Content-Type,Authorization')
    response.headers.add('Access-Control-Allow-Methods', 'GET,POST,OPTIONS')
    response.headers.add('Access-Control-Expose-Headers', 'Content-Disposition')
    return response

@app.route('/')
def index():
    return app.send_static_file('index.html')

def extract_video_id(url):
    patterns = [
        r'(?:v=|\/)([0-9A-Za-z_-]{11}).*',
        r'youtu\.be\/([0-9A-Za-z_-]{11})',
        r'embed\/([0-9A-Za-z_-]{11})'
    ]
    for pattern in patterns:
        match = re.search(pattern, url)
        if match:
            return match.group(1)
    return None

def fast_youtube_search(query, max_results=50):
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
        for page in range(2):
            if len(results) >= max_results:
                break
            req_payload = {'context': {'client': {'clientName': 'WEB', 'clientVersion': '2.20240101.00.00'}}}
            if cont_token:
                req_payload['continuation'] = cont_token
            else:
                req_payload['query'] = query

            req = urllib.request.Request(
                url,
                data=json.dumps(req_payload).encode('utf-8'),
                headers={'Content-Type': 'application/json', 'User-Agent': 'Mozilla/5.0'}
            )
            res = json.loads(urllib.request.urlopen(req, timeout=8).read())
            extract_videos(res)
            cont_token = find_continuation_token(res)
            if not cont_token:
                break

        if results:
            set_in_cache(f"search:{query.lower()}:{max_results}", results)
            return results
    except Exception as e:
        print(f"InnerTube search failed for '{query}': {e}")

    # Fallback to yt_dlp
    return fallback_yt_dlp_search(query, max_results)

def fallback_yt_dlp_search(query, max_results=30):
    ydl_opts = {
        'default_search': 'ytsearch',
        'noplaylist': True,
        'quiet': True,
        'no_warnings': True,
        'extract_flat': True,
        'skip_download': True
    }
    with yt_dlp.YoutubeDL(ydl_opts) as ydl:
        search_results = ydl.extract_info(f"ytsearch{max_results}:{query}", download=False)
        entries = search_results.get('entries', [])
        results = []
        for entry in entries:
            if entry:
                v_id = entry.get('id')
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
        set_in_cache(f"search:{query.lower()}:{max_results}", results)
        return results

def fast_oembed_info(url):
    v_id = extract_video_id(url)
    if not v_id:
        return None

    cached = get_from_cache(f"info:{v_id}")
    if cached:
        return cached

    try:
        oembed_url = f"https://www.youtube.com/oembed?url=https://www.youtube.com/watch?v={v_id}&format=json"
        req = urllib.request.Request(oembed_url, headers={'User-Agent': 'Mozilla/5.0'})
        res = json.loads(urllib.request.urlopen(req, timeout=4).read())

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
    results = fast_youtube_search(category, max_results=50)
    return jsonify({"results": results})

@app.route('/api/info')
def get_info():
    url = request.args.get('url')
    if not url:
        return jsonify({"error": "No URL provided"}), 400

    is_search = not (url.startswith('http://') or url.startswith('https://') or 'youtube.com' in url or 'youtu.be' in url)

    if is_search:
        results = fast_youtube_search(url, max_results=50)
        return jsonify({"is_search": True, "results": results})
    else:
        info = fast_oembed_info(url)
        if info:
            return jsonify(info)

        try:
            ydl_opts = {'quiet': True, 'no_warnings': True, 'skip_download': True, 'extract_flat': True}
            with yt_dlp.YoutubeDL(ydl_opts) as ydl:
                raw_info = ydl.extract_info(url, download=False)
                v_id = raw_info.get('id') or extract_video_id(url)
                info = {
                    'is_search': False,
                    'id': v_id,
                    'title': raw_info.get('title', 'YouTube Video'),
                    'thumbnail': raw_info.get('thumbnail') or f"https://i.ytimg.com/vi/{v_id}/hqdefault.jpg",
                    'duration': raw_info.get('duration_string') or 'N/A',
                    'uploader': raw_info.get('uploader') or 'YouTube Channel',
                    'views': '',
                    'url': raw_info.get('webpage_url') or url
                }
                if v_id:
                    set_in_cache(f"info:{v_id}", info)
                return jsonify(info)
        except Exception as e:
            return jsonify({"error": str(e)}), 500

@app.route('/api/stream')
def stream():
    url = request.args.get('url')
    if not url:
        return jsonify({"error": "No URL provided"}), 400

    cached = get_from_cache(f"stream:{url}")
    if cached:
        return jsonify(cached)

    ydl_opts = {
        'quiet': True,
        'no_warnings': True,
        'ffmpeg_location': FFMPEG_EXE,
        'extractor_args': {'youtube': {'player_client': ['ios', 'android', 'mweb', 'web']}}
    }

    try:
        with yt_dlp.YoutubeDL(ydl_opts) as ydl:
            info = ydl.extract_info(url, download=False)
            formats = info.get('formats', [])

            stream_url = None

            for f in formats:
                if f.get('vcodec') != 'none' and f.get('acodec') != 'none' and f.get('url'):
                    if f.get('ext') == 'mp4':
                        stream_url = f.get('url')
                        break
                    elif not stream_url:
                        stream_url = f.get('url')

            if not stream_url:
                stream_url = info.get('url')

            if stream_url:
                data = {
                    'stream_url': stream_url,
                    'title': info.get('title'),
                    'id': info.get('id') or extract_video_id(url)
                }
                set_in_cache(f"stream:{url}", data)
                return jsonify(data)
            else:
                return jsonify({"error": "No streamable format found for this video"}), 404
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route('/api/formats')
def get_formats():
    url = request.args.get('url')
    if not url:
        return jsonify({"error": "No URL provided"}), 400

    ydl_opts = {
        'quiet': True,
        'no_warnings': True,
        'ffmpeg_location': FFMPEG_EXE,
        'extractor_args': {'youtube': {'player_client': ['ios', 'android', 'web']}}
    }

    try:
        with yt_dlp.YoutubeDL(ydl_opts) as ydl:
            info = ydl.extract_info(url, download=False)
            raw_formats = info.get('formats', [])

            available_heights = set()
            raw_streams = []

            for f in raw_formats:
                height = f.get('height')
                vcodec = f.get('vcodec', 'none')
                if height and vcodec != 'none':
                    available_heights.add(height)

                fid = f.get('format_id')
                ext = f.get('ext', 'mp4')
                fps = f.get('fps')
                filesize = f.get('filesize') or f.get('filesize_approx')

                if fid and vcodec != 'none':
                    size_str = f" (~{filesize / (1024*1024):.1f}MB)" if filesize else ""
                    fps_str = f"{int(fps)}fps" if fps and fps > 30 else ""
                    res_str = f"{height}p" if height else "Video"
                    raw_streams.append({
                        'id': f'raw_{fid}',
                        'label': f"Direct Stream: {res_str}{' ' + fps_str if fps_str else ''} ({ext.upper()}, {vcodec.split('.')[0]}){size_str}"
                    })

            sorted_res = sorted(list(available_heights), reverse=True)
            if not sorted_res:
                sorted_res = [2160, 1440, 1080, 720, 480, 360, 240, 144]

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

                containers_to_use = video_containers if res <= 720 else ['mp4', 'webm', 'mkv', 'mov', 'avi']
                for ext in containers_to_use:
                    video_formats.append({
                        'id': f'video_{res}_{ext}',
                        'label': f'{label} - {ext.upper()}'
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
        return jsonify({"error": str(e)}), 500

@app.route('/api/download')
def download():
    url = request.args.get('url')
    format_id = request.args.get('format_id') or request.args.get('format', 'video_1080_mp4')

    if not url:
        return jsonify({"error": "No URL provided"}), 400

    download_dir = tempfile.mkdtemp(prefix='eutube-')

    ydl_opts = {
        'outtmpl': os.path.join(download_dir, '%(title)s.%(ext)s'),
        'noplaylist': True,
        'quiet': True,
        'no_warnings': True,
        'ffmpeg_location': FFMPEG_EXE,
        'extractor_args': {'youtube': {'player_client': ['ios', 'android', 'web']}}
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
            info = ydl.extract_info(url, download=True)
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
        return jsonify({"error": str(error)}), 500

def prewarm_cache():
    categories = ['trending', 'music', 'gaming', 'news', 'tech']
    for cat in categories:
        try:
            fast_youtube_search(cat, max_results=50)
        except Exception:
            pass

if __name__ == '__main__':
    print("Starting EuTube Server at http://localhost:5000")
    threading.Thread(target=prewarm_cache, daemon=True).start()
    app.run(host='0.0.0.0', debug=True, port=5000)
