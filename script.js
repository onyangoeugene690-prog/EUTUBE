let selectedVideoUrl = '';
let selectedFormatId = 'video_1080_webm';
let currentVideoId = '';
let currentPlayerMode = 'embed';

const configuredApiBase = document.querySelector('meta[name="api-base"]')?.content.trim();
const isLocalFrontend = window.location.protocol === 'file:'
    || ['localhost', '127.0.0.1'].includes(window.location.hostname);
const API_BASE = (configuredApiBase || (isLocalFrontend ? 'http://localhost:5000' : '')).replace(/\/+$/, '');

async function fetchApi(path, params = {}) {
    const url = new URL(`${API_BASE}${path}`, window.location.href);
    Object.entries(params).forEach(([key, value]) => url.searchParams.set(key, value));

    const response = await fetch(url);
    let data;
    try {
        data = await response.json();
    } catch {
        throw new Error(`The video server returned an invalid response (HTTP ${response.status}).`);
    }

    if (!response.ok || data.error) {
        throw new Error(data.error || `The video server returned HTTP ${response.status}.`);
    }

    return data;
}

function getApiErrorMessage(error) {
    const detail = error instanceof Error ? error.message : String(error);
    if (detail.toLowerCase().includes('failed to fetch') || detail.toLowerCase().includes('networkerror')) {
        return `Could not connect to video server at ${API_BASE}. Please make sure start_server.cmd is running.`;
    }
    return `Error from video server: ${detail}`;
}

function extractVideoId(url) {
    if (!url) return null;
    const clean = url.trim();
    if (/^[0-9A-Za-z_-]{11}$/.test(clean)) {
        return clean;
    }
    const match = clean.match(/(?:v=|\/v\/|\/embed\/|\/shorts\/|\/live\/|youtu\.be\/)([0-9A-Za-z_-]{11})/);
    return match ? match[1] : null;
}

function buildDefaultFormatOptions() {
    const select = document.getElementById('format-select');
    if (!select) return;

    select.innerHTML = `
        <optgroup label="🌟 Best Quality Video Options">
            <option value="video_best_mp4">Best Quality Available (MP4)</option>
            <option value="video_best_webm">Best Quality Available (WEBM)</option>
            <option value="video_best_mkv">Best Quality Available (MKV)</option>
            <option value="video_best_mov">Best Quality Available (MOV)</option>
            <option value="video_best_avi">Best Quality Available (AVI)</option>
        </optgroup>
        <optgroup label="🎬 Video Resolutions & Formats">
            <option value="video_4320_mp4">8K Ultra HD (4320p) - MP4</option>
            <option value="video_2160_mp4">4K Ultra HD (2160p) - MP4</option>
            <option value="video_2160_webm">4K Ultra HD (2160p) - WEBM</option>
            <option value="video_2160_mkv">4K Ultra HD (2160p) - MKV</option>
            <option value="video_1440_mp4">2K QHD (1440p) - MP4</option>
            <option value="video_1440_webm">2K QHD (1440p) - WEBM</option>
            <option value="video_1440_mkv">2K QHD (1440p) - MKV</option>
            <option value="video_1080_mp4" selected>1080p Full HD - MP4</option>
            <option value="video_1080_webm">1080p Full HD - WEBM</option>
            <option value="video_1080_mkv">1080p Full HD - MKV</option>
            <option value="video_1080_mov">1080p Full HD - MOV</option>
            <option value="video_1080_avi">1080p Full HD - AVI</option>
            <option value="video_720_mp4">720p HD - MP4</option>
            <option value="video_720_webm">720p HD - WEBM</option>
            <option value="video_720_mkv">720p HD - MKV</option>
            <option value="video_720_avi">720p HD - AVI</option>
            <option value="video_720_flv">720p HD - FLV</option>
            <option value="video_720_3gp">720p HD - 3GP</option>
            <option value="video_480_mp4">480p SD - MP4</option>
            <option value="video_480_webm">480p SD - WEBM</option>
            <option value="video_480_mkv">480p SD - MKV</option>
            <option value="video_480_3gp">480p SD - 3GP</option>
            <option value="video_360_mp4">360p SD - MP4</option>
            <option value="video_360_webm">360p SD - WEBM</option>
            <option value="video_360_3gp">360p SD - 3GP</option>
            <option value="video_240_mp4">240p SD - MP4</option>
            <option value="video_240_webm">240p SD - WEBM</option>
            <option value="video_144_mp4">144p SD - MP4</option>
            <option value="video_144_webm">144p SD - WEBM</option>
        </optgroup>
        <optgroup label="🎵 Audio Only Formats">
            <option value="audio_mp3">High Quality MP3 Audio (320kbps)</option>
            <option value="audio_m4a">High Quality M4A / AAC Audio</option>
            <option value="audio_wav">Uncompressed WAV Audio</option>
            <option value="audio_flac">Lossless FLAC Audio</option>
            <option value="audio_ogg">OGG / Vorbis Audio</option>
            <option value="audio_webm">WEBM / Opus Audio</option>
            <option value="audio_aac">AAC Audio</option>
        </optgroup>
    `;
    selectedFormatId = 'video_2160_mp4';
    select.value = selectedFormatId;
}

function selectPreferredFormat(select) {
    const preferred = Array.from(select.options).find(option => option.value === 'video_2160_mp4')
        || Array.from(select.options).find(option => option.value === 'video_best_mp4')
        || select.options[0];

    if (preferred) {
        selectedFormatId = preferred.value;
        select.value = selectedFormatId;
    }
}

function filterFormatOptions(category, evt) {
    document.querySelectorAll('.format-tab').forEach(tab => tab.classList.remove('active'));
    if (evt && evt.currentTarget) {
        evt.currentTarget.classList.add('active');
    } else {
        const targetBtn = document.querySelector(`.format-tab[data-filter="${category}"]`);
        if (targetBtn) targetBtn.classList.add('active');
    }

    const select = document.getElementById('format-select');
    if (!select) return;

    const optgroups = select.querySelectorAll('optgroup');
    optgroups.forEach(og => {
        const label = (og.label || '').toLowerCase();
        if (category === 'all') {
            og.style.display = '';
            Array.from(og.options).forEach(opt => opt.style.display = '');
        } else if (category === 'video') {
            if (label.includes('video') || label.includes('best') || label.includes('raw') || label.includes('resolutions')) {
                og.style.display = '';
                Array.from(og.options).forEach(opt => opt.style.display = '');
            } else {
                og.style.display = 'none';
                Array.from(og.options).forEach(opt => opt.style.display = 'none');
            }
        } else if (category === 'audio') {
            if (label.includes('audio')) {
                og.style.display = '';
                Array.from(og.options).forEach(opt => opt.style.display = '');
            } else {
                og.style.display = 'none';
                Array.from(og.options).forEach(opt => opt.style.display = 'none');
            }
        }
    });

    const selectedOpt = select.options[select.selectedIndex];
    if (selectedOpt && selectedOpt.parentElement && selectedOpt.parentElement.style.display === 'none') {
        for (let i = 0; i < select.options.length; i++) {
            const opt = select.options[i];
            if (opt.parentElement && opt.parentElement.style.display !== 'none') {
                select.selectedIndex = i;
                selectedFormatId = opt.value;
                break;
            }
        }
    }
}

async function loadAvailableFormats(url) {
    const select = document.getElementById('format-select');
    if (!select || !url) return;

    try {
        const data = await fetchApi('/api/formats', { url });

        if (data.groups && data.groups.length) {
            let html = '';
            data.groups.forEach(g => {
                if (g.formats && g.formats.length) {
                    html += `<optgroup label="${g.group}">`;
                    g.formats.forEach(f => {
                        html += `<option value="${f.id}">${f.label}</option>`;
                    });
                    html += `</optgroup>`;
                }
            });
            select.innerHTML = html;
            selectPreferredFormat(select);
            return;
        } else if (data.formats && data.formats.length) {
            select.innerHTML = data.formats
                .map(format => `<option value="${format.id}">${format.label}</option>`)
                .join('');
            selectPreferredFormat(select);
            return;
        }
    } catch (error) {
        console.warn('Failed to load all formats from server:', error);
    }

    buildDefaultFormatOptions();
}

document.addEventListener('DOMContentLoaded', () => {
    buildDefaultFormatOptions();
    // Initial fetch of trending videos when website opens
    fetchCategoryVideos('trending');

    // Event listener for search button
    document.getElementById('download-btn').addEventListener('click', performSearch);

    // Event listener for Enter key in search box
    document.getElementById('video-url').addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            performSearch();
        }
    });

    // Event listeners for category buttons
    document.querySelectorAll('.tag-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const categoryBtn = e.currentTarget;
            document.querySelectorAll('.tag-btn').forEach(b => b.classList.remove('active'));
            categoryBtn.classList.add('active');

            const category = categoryBtn.getAttribute('data-category');
            document.getElementById('results-heading').querySelector('h2').innerHTML = `<i class="fas fa-compass"></i> ${categoryBtn.innerText} Videos`;
            fetchCategoryVideos(category);
        });
    });
});

async function fetchCategoryVideos(category) {
    const status = document.getElementById('status');
    const resultsContainer = document.getElementById('search-results');

    status.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Fetching videos from YouTube...';
    status.style.color = '#555';
    resultsContainer.innerHTML = '';

    try {
        const data = await fetchApi('/api/trending', { category });

        if (data.results && data.results.length > 0) {
            status.innerText = `Fetched ${data.results.length} videos from YouTube`;
            status.style.color = '#00c853';
            renderVideoGrid(data.results);
        } else {
            status.innerText = 'No videos found.';
            status.style.color = '#555';
        }
    } catch (error) {
        status.innerText = getApiErrorMessage(error);
        status.style.color = 'red';
        console.error(error);
    }
}

async function performSearch() {
    const query = document.getElementById('video-url').value.trim();
    const status = document.getElementById('status');
    const info = document.getElementById('video-info');
    const resultsContainer = document.getElementById('search-results');
    const resultsHeading = document.getElementById('results-heading').querySelector('h2');

    if (!query) {
        status.innerText = 'Please paste a link or type a search query';
        status.style.color = 'red';
        return;
    }

    status.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Searching YouTube...';
    status.style.color = '#555';
    info.classList.add('hidden');
    resultsContainer.innerHTML = '';

    try {
        const data = await fetchApi('/api/info', { url: query });

        if (data.is_search) {
            resultsHeading.innerHTML = `<i class="fas fa-search"></i> Search Results for "${query}"`;
            status.innerText = `Found ${data.results ? data.results.length : 0} results from YouTube. Select a video to view or download:`;
            status.style.color = '#00c853';

            renderVideoGrid(data.results || []);
        } else {
            status.innerText = 'Video found!';
            status.style.color = '#00c853';
            showDownloadOptions(data.title, data.duration, data.thumbnail, data.url, data.id, data.uploader);
        }
    } catch (error) {
        status.innerText = getApiErrorMessage(error);
        status.style.color = 'red';
        console.error(error);
    }
}

function renderVideoGrid(videos) {
    const resultsContainer = document.getElementById('search-results');
    resultsContainer.innerHTML = '';

    if (!videos || !videos.length) {
        resultsContainer.innerHTML = '<p class="no-results">No videos found matching your search.</p>';
        return;
    }

    videos.forEach(video => {
        const card = document.createElement('div');
        card.className = 'video-card';
        card.innerHTML = `
            <div class="thumb-container">
                <img src="${video.thumbnail || ''}" alt="thumbnail" loading="lazy">
                ${video.duration ? `<span class="duration-badge">${video.duration}</span>` : ''}
            </div>
            <div class="card-details">
                <h4 title="${video.title}">${video.title}</h4>
                <p class="uploader-name"><i class="fas fa-user"></i> ${video.uploader || 'YouTube Channel'}</p>
                ${video.views ? `<p class="view-count"><i class="fas fa-eye"></i> ${video.views}</p>` : ''}
            </div>
        `;
        card.addEventListener('click', () => {
            showDownloadOptions(video.title, video.duration, video.thumbnail, video.url, video.id, video.uploader);
            window.scrollTo({ top: 0, behavior: 'smooth' });
        });
        resultsContainer.appendChild(card);
    });
}

function showDownloadOptions(title, duration, thumbnail, url, videoId, uploader) {
    selectedVideoUrl = url || '';
    const vId = videoId || extractVideoId(selectedVideoUrl);
    currentVideoId = vId || '';

    document.getElementById('video-title').innerText = title || 'Video Title';
    document.getElementById('video-duration').querySelector('span').innerText = 'Duration: ' + (duration || 'N/A');
    document.getElementById('video-channel').querySelector('span').innerText = uploader || 'YouTube Channel';

    const playerWrapper = document.getElementById('player-wrapper');
    const openYtBtn = document.getElementById('open-youtube-btn');

    if (openYtBtn) {
        const watchUrl = currentVideoId ? `https://www.youtube.com/watch?v=${currentVideoId}` : selectedVideoUrl;
        openYtBtn.href = watchUrl;
    }

    if (currentVideoId || selectedVideoUrl) {
        if (playerWrapper) playerWrapper.style.display = 'block';
        switchPlayerMode(currentPlayerMode || 'embed');
    } else {
        if (playerWrapper) playerWrapper.style.display = 'none';
    }

    loadAvailableFormats(selectedVideoUrl || (currentVideoId ? `https://www.youtube.com/watch?v=${currentVideoId}` : ''));

    document.getElementById('video-info').classList.remove('hidden');
    document.getElementById('status').innerText = 'Video loaded! Stream above or choose a format to download below:';
    document.getElementById('status').style.color = '#28a745';
}

async function switchPlayerMode(mode) {
    currentPlayerMode = mode;
    const playerIframe = document.getElementById('video-player');
    const html5Player = document.getElementById('html5-player');
    const embedBtn = document.getElementById('player-mode-embed');
    const directBtn = document.getElementById('player-mode-direct');
    const status = document.getElementById('status');

    if (embedBtn) embedBtn.classList.toggle('active', mode === 'embed');
    if (directBtn) directBtn.classList.toggle('active', mode === 'direct');

    const vId = currentVideoId || extractVideoId(selectedVideoUrl);

    if (mode === 'embed') {
        if (html5Player) {
            html5Player.pause();
            html5Player.style.display = 'none';
        }
        if (playerIframe) {
            playerIframe.style.display = 'block';
            if (vId) {
                let embedUrl = `https://www.youtube.com/embed/${vId}?autoplay=1&enablejsapi=1&rel=0`;
                if (window.location.protocol === 'http:' || window.location.protocol === 'https:') {
                    embedUrl += `&origin=${encodeURIComponent(window.location.origin)}`;
                }
                if (playerIframe.src !== embedUrl) {
                    playerIframe.src = embedUrl;
                }
            }
        }
    } else if (mode === 'direct') {
        if (playerIframe) {
            playerIframe.style.display = 'none';
            playerIframe.src = 'about:blank';
        }
        if (html5Player) {
            html5Player.style.display = 'block';
            status.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Fetching direct video stream...';
            status.style.color = '#0066cc';

            try {
                const targetUrl = selectedVideoUrl || (vId ? `https://www.youtube.com/watch?v=${vId}` : '');
                if (!targetUrl) throw new Error('No valid URL for direct stream');

                const data = await fetchApi('/api/stream', { url: targetUrl });

                if (data.proxy_url || data.stream_url) {
                    const primarySrc = data.proxy_url ? `${API_BASE}${data.proxy_url}` : data.stream_url;

                    html5Player.onerror = () => {
                        if (html5Player.src !== data.stream_url && data.stream_url) {
                            console.warn('Proxy stream error, falling back to direct stream_url');
                            html5Player.src = data.stream_url;
                            html5Player.play().catch(e => console.warn('Direct stream playback prevented:', e));
                        } else {
                            status.innerText = 'Direct playback failed. Please use YouTube Player or Watch on YouTube.';
                            status.style.color = 'red';
                        }
                    };
                    html5Player.onplaying = () => {
                        status.innerText = 'Streaming directly via HTML5 Video Player.';
                        status.style.color = '#00c853';
                    };

                    html5Player.src = primarySrc;
                    html5Player.play().catch(e => console.warn('Autoplay prevented by browser policy:', e));
                    status.innerText = 'Stream loaded. Press play if playback does not start automatically.';
                    status.style.color = '#0066cc';
                } else {
                    status.innerText = 'Direct stream unavailable: Could not retrieve stream link.';
                    status.style.color = 'red';
                }
            } catch (err) {
                status.innerText = getApiErrorMessage(err);
                status.style.color = 'red';
                console.error(err);
            }
        }
    }
}

function processSelectedFormatDownload() {
    const select = document.getElementById('format-select');
    const format = select ? select.value : selectedFormatId;

    if (!format) {
        const status = document.getElementById('status');
        status.innerText = 'Please choose a format before downloading.';
        status.style.color = 'red';
        return;
    }

    processDownload(format);
}

function processDownload(format) {
    const status = document.getElementById('status');
    const url = selectedVideoUrl || document.getElementById('video-url').value.trim();

    if (!url) {
        status.innerText = 'No video selected for download.';
        status.style.color = 'red';
        return;
    }

    status.innerText = `Preparing ${format.toUpperCase()} download... Your browser will save the file when it's ready.`;
    status.style.color = '#0066cc';

    const downloadUrl = new URL(`${API_BASE}/api/download`, window.location.href);
    downloadUrl.searchParams.set('url', url);
    downloadUrl.searchParams.set('format', format);

    const link = document.createElement('a');
    link.href = downloadUrl.toString();
    link.style.display = 'none';
    document.body.appendChild(link);
    link.click();
    link.remove();
}
