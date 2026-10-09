const { useState, useEffect, useRef, useCallback, useMemo } = React;

// --- Embedded CSS Styles ---
const APP_STYLES = `
:root {
    --font-primary: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    --font-heading: 'Plus Jakarta Sans', 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;

    --bg-main: #f8fafc;
    --card-bg: #ffffff;

    --text-dark: #0f172a;
    --text-medium: #334155;
    --text-muted: #64748b;

    --primary-brand: #00c853;
    --primary-hover: #00a844;
    --primary-glow: rgba(0, 200, 83, 0.25);

    --border-sharp: #cbd5e1;
    --border-light: #e2e8f0;

    --shadow-8k: 0 10px 30px -5px rgba(15, 23, 42, 0.08), 0 4px 12px -2px rgba(15, 23, 42, 0.04);
}

html {
    -webkit-font-smoothing: antialiased;
    -moz-osx-font-smoothing: grayscale;
    text-rendering: optimizeLegibility;
    font-feature-settings: 'cv02', 'cv03', 'cv04', 'cv11';
    box-sizing: border-box;
}

*, *:before, *:after {
    box-sizing: inherit;
}

body {
    font-family: var(--font-primary);
    background-color: var(--bg-main);
    color: var(--text-dark);
    margin: 0;
    padding: clamp(12px, 3vw, 32px) 0;
    display: flex;
    justify-content: center;
    align-items: flex-start;
    min-height: 100vh;
    min-height: 100dvh;
    line-height: 1.5;
    letter-spacing: -0.011em;
}

.container {
    width: min(1120px, calc(100% - 32px));
    background: var(--card-bg);
    padding: clamp(1rem, 4vw, 2.8rem);
    border-radius: 20px;
    border: 1px solid var(--border-light);
    box-shadow: var(--shadow-8k);
}

header {
    text-align: center;
    margin-bottom: 2.2rem;
}

header h1 {
    font-family: var(--font-heading);
    font-size: 3.2rem;
    font-weight: 900;
    margin: 0 0 0.6rem 0;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 16px;
    letter-spacing: -0.035em;
}

.logo-text {
    color: #ffffff;
    -webkit-text-fill-color: #ffffff;
    -webkit-text-stroke: 0;
    text-shadow: none;
    filter: none;
    display: inline-block;
    position: relative;
    padding: 0.04em 0.16em;
    border-radius: 0.18em;
    background: #2563eb;
}

.logo-mark {
    width: 0.85em;
    height: 0.85em;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    flex: 0 0 auto;
    border-radius: 50%;
    background: #2563eb;
    border: 2px solid #008000;
    color: #fff;
    font-size: inherit;
    transform: translateY(0.04em);
    box-shadow: none;
}

.logo-mark i {
    font-size: 0.44em;
    transform: translateX(0.06em);
    color: #ffffff;
    -webkit-text-fill-color: #ffffff;
    text-shadow: none;
}

header p {
    color: var(--text-medium);
    font-size: 1.08rem;
    font-weight: 500;
    margin: 0;
    letter-spacing: -0.015em;
}

.search-box {
    display: flex;
    gap: 12px;
    margin-bottom: 1.8rem;
}

#video-url {
    flex: 1;
    padding: 16px 20px;
    border: 2px solid var(--text-medium);
    border-radius: 12px;
    font-family: var(--font-primary);
    font-size: 1.02rem;
    font-weight: 500;
    color: var(--text-dark);
    background: #ffffff;
    outline: none;
    transition: border-color 0.2s ease, box-shadow 0.2s ease;
}

#video-url::placeholder {
    color: var(--text-muted);
    font-weight: 400;
}

#video-url:focus {
    border-color: #3b82f6;
    box-shadow: none;
}

#download-btn {
    padding: 16px 30px;
    background-color: #00c853;
    color: #ffffff;
    border: none;
    border-radius: 12px;
    font-family: var(--font-heading);
    font-weight: 700;
    font-size: 1.02rem;
    letter-spacing: -0.01em;
    cursor: pointer;
    transition: background-color 0.2s ease, transform 0.1s ease, box-shadow 0.2s ease;
    display: flex;
    align-items: center;
    gap: 10px;
    box-shadow: 0 4px 14px var(--primary-glow);
}

#download-btn:hover {
    background-color: #00a844;
    box-shadow: 0 6px 18px var(--primary-glow);
}

#download-btn:active {
    transform: scale(0.98);
}

.category-tags {
    display: flex;
    gap: 10px;
    flex-wrap: wrap;
    justify-content: center;
    margin-bottom: 1.8rem;
}

.tag-btn {
    padding: 9px 20px;
    border: 1.5px solid var(--border-sharp);
    background-color: #ffffff;
    color: var(--text-dark);
    border-radius: 24px;
    font-family: var(--font-primary);
    font-weight: 600;
    font-size: 0.92rem;
    letter-spacing: -0.01em;
    cursor: pointer;
    transition: all 0.2s ease;
    display: flex;
    align-items: center;
    gap: 7px;
}

.tag-btn:hover {
    background-color: #f1f5f9;
    border-color: #94a3b8;
    color: var(--text-dark);
}

.tag-btn.active {
    background-color: var(--primary-brand);
    color: #ffffff;
    border-color: var(--primary-brand);
    box-shadow: 0 3px 10px var(--primary-glow);
}

.status-message {
    margin-bottom: 1.8rem;
    font-family: var(--font-primary);
    font-weight: 600;
    font-size: 1rem;
    letter-spacing: -0.01em;
    min-height: 26px;
    text-align: center;
}

.section-heading {
    margin-top: 2.2rem;
    margin-bottom: 1.2rem;
    border-bottom: 2px solid var(--border-light);
    padding-bottom: 0.6rem;
}

.section-heading h2 {
    font-family: var(--font-heading);
    font-size: 1.4rem;
    font-weight: 800;
    color: var(--text-dark);
    margin: 0;
    display: flex;
    align-items: center;
    gap: 10px;
    letter-spacing: -0.02em;
}

.section-heading h2 i {
    color: var(--primary-brand);
}

.search-results.grid-view {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(min(100%, 230px), 1fr));
    gap: 22px;
    margin-top: 1.2rem;
}

.load-more-trigger {
    grid-column: 1 / -1;
    justify-self: center;
    margin: 8px 0 18px;
    padding: 12px 24px;
    border: 1px solid var(--border-sharp);
    border-radius: 999px;
    background: #ffffff;
    color: var(--text-medium);
    font: 600 0.95rem var(--font-primary);
    cursor: pointer;
}

.load-more-trigger:hover:not(:disabled) {
    border-color: var(--primary-brand);
    color: var(--primary-brand);
}

.load-more-trigger:disabled {
    cursor: wait;
}

.video-card {
    background: #ffffff;
    border: 1.5px solid var(--border-light);
    border-radius: 14px;
    overflow: hidden;
    transition: transform 0.22s ease, box-shadow 0.22s ease, border-color 0.22s ease;
    cursor: pointer;
    display: flex;
    flex-direction: column;
}

.video-card:hover {
    transform: translateY(-5px);
    border-color: var(--border-sharp);
    box-shadow: 0 12px 24px -4px rgba(15, 23, 42, 0.12);
}

.video-card-skeleton {
    overflow: hidden;
    pointer-events: none;
}

.skeleton-thumb,
.skeleton-line {
    background: linear-gradient(90deg, #e2e8f0 25%, #f8fafc 50%, #e2e8f0 75%);
    background-size: 200% 100%;
    animation: video-skeleton-pulse 1.4s ease-in-out infinite;
}

.skeleton-thumb {
    width: 100%;
    aspect-ratio: 16 / 9;
}

.skeleton-details {
    display: grid;
    gap: 12px;
    padding: 16px;
}

.skeleton-line {
    height: 14px;
    border-radius: 7px;
}

.skeleton-line.short {
    width: 60%;
}

@keyframes video-skeleton-pulse {
    to {
        background-position: -200% 0;
    }
}

.thumb-container {
    position: relative;
    width: 100%;
    padding-top: 56.25%;
    background: #0f172a;
}

.thumb-container img {
    position: absolute;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    object-fit: cover;
}

.duration-badge {
    position: absolute;
    bottom: 8px;
    right: 8px;
    background: rgba(15, 23, 42, 0.92);
    color: #ffffff;
    font-family: var(--font-primary);
    font-size: 0.75rem;
    font-weight: 700;
    letter-spacing: 0.02em;
    padding: 3px 7px;
    border-radius: 5px;
    backdrop-filter: blur(4px);
}

.card-details {
    padding: 14px;
    display: flex;
    flex-direction: column;
    gap: 6px;
    flex: 1;
}

.card-details h4 {
    margin: 0;
    font-family: var(--font-heading);
    font-size: 0.95rem;
    font-weight: 700;
    line-height: 1.35;
    color: var(--text-dark);
    letter-spacing: -0.015em;
    display: -webkit-box;
    -webkit-line-clamp: 2;
    -webkit-box-orient: vertical;
    overflow: hidden;
    height: 2.7em;
}

.uploader-name, .view-count {
    margin: 0;
    font-size: 0.82rem;
    font-weight: 500;
    color: var(--text-muted);
    display: flex;
    align-items: center;
    gap: 6px;
}

.video-info {
    background: #ffffff;
    border: 1.5px solid var(--border-sharp);
    border-radius: 16px;
    padding: 1.8rem;
    margin-bottom: 2.2rem;
    box-shadow: var(--shadow-8k);
}

.player-container {
    position: relative;
    width: 100%;
    padding-top: 56.25%;
    border-radius: 12px;
    overflow: hidden;
    margin-bottom: 1.4rem;
    background: #000;
    border: 1px solid #0f172a;
}

.player-container iframe {
    position: absolute;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    border: none;
}

.player-controls {
    display: flex;
    justify-content: space-between;
    align-items: center;
    gap: 12px;
    margin-top: 0.9rem;
    margin-bottom: 0.9rem;
    flex-wrap: wrap;
}

.player-tabs {
    display: flex;
    gap: 10px;
    flex-wrap: wrap;
}

.player-tab-btn {
    padding: 10px 16px;
    border: 1.5px solid var(--border-sharp);
    background-color: #f8fafc;
    color: var(--text-dark);
    border-radius: 10px;
    font-family: var(--font-primary);
    font-size: 0.9rem;
    font-weight: 700;
    cursor: pointer;
    display: flex;
    align-items: center;
    gap: 7px;
    transition: all 0.2s ease;
}

.player-tab-btn:hover {
    background-color: #f1f5f9;
    border-color: #94a3b8;
}

.player-tab-btn.active {
    background-color: var(--primary-brand);
    color: #ffffff;
    border-color: var(--primary-brand);
    box-shadow: 0 3px 10px var(--primary-glow);
}

.external-yt-btn {
    padding: 10px 16px;
    background-color: #ff0000;
    color: #ffffff;
    border-radius: 10px;
    font-family: var(--font-primary);
    font-size: 0.9rem;
    font-weight: 700;
    text-decoration: none;
    display: inline-flex;
    align-items: center;
    gap: 7px;
    transition: background-color 0.2s ease;
}

.external-yt-btn:hover {
    background-color: #cc0000;
    color: #ffffff;
}

.player-notice {
    font-size: 0.88rem;
    font-weight: 500;
    color: var(--text-medium);
    background-color: #f8fafc;
    border: 1.5px solid var(--border-light);
    border-radius: 10px;
    padding: 12px 16px;
    margin-bottom: 1.4rem;
    display: flex;
    align-items: center;
    gap: 10px;
}

.player-notice i {
    color: var(--primary-brand);
    font-size: 1.1rem;
}

.details h3 {
    margin: 0 0 10px 0;
    font-family: var(--font-heading);
    font-size: 1.4rem;
    font-weight: 800;
    color: var(--text-dark);
    letter-spacing: -0.02em;
}

.channel-name {
    margin: 0 0 8px 0;
    color: var(--text-medium);
    font-size: 0.98rem;
    font-weight: 600;
}

#video-duration {
    margin: 0 0 18px 0;
    color: var(--text-muted);
    font-size: 0.92rem;
    font-weight: 500;
}

.format-selection-container {
    margin-top: 1.2rem;
    padding-top: 1.2rem;
    border-top: 1.5px dashed var(--border-sharp);
}

.format-selection-container label {
    display: block;
    font-family: var(--font-heading);
    font-weight: 700;
    margin-bottom: 0.7rem;
    color: var(--text-dark);
    font-size: 1.02rem;
    letter-spacing: -0.01em;
}

.format-filter-tabs {
    display: flex;
    gap: 10px;
    margin-bottom: 1rem;
    flex-wrap: wrap;
}

.format-tab {
    padding: 8px 16px;
    border: 1.5px solid var(--border-sharp);
    background-color: #f8fafc;
    color: var(--text-dark);
    border-radius: 20px;
    font-family: var(--font-primary);
    font-size: 0.88rem;
    font-weight: 700;
    cursor: pointer;
    transition: all 0.2s ease;
    display: inline-flex;
    align-items: center;
    gap: 6px;
}

.format-tab:hover {
    background-color: #f1f5f9;
    border-color: #94a3b8;
}

.format-tab.active {
    background-color: var(--primary-brand);
    color: #ffffff;
    border-color: var(--primary-brand);
    box-shadow: 0 3px 10px var(--primary-glow);
}

.format-controls {
    display: flex;
    gap: 12px;
    align-items: center;
    min-width: 0;
}

.format-dropdown {
    flex: 1;
    min-width: 0;
    padding: 12px 16px;
    border: 1.5px solid var(--border-sharp);
    border-radius: 10px;
    font-family: var(--font-primary);
    font-size: 0.98rem;
    font-weight: 600;
    color: var(--text-dark);
    outline: none;
    background: #ffffff;
    cursor: pointer;
}

.format-dropdown:focus {
    border-color: var(--primary-brand);
    box-shadow: 0 0 0 3px var(--primary-glow);
}

.format-dropdown optgroup {
    font-family: var(--font-heading);
    font-weight: 800;
    color: var(--text-dark);
    padding: 6px 0;
}

.opt-btn {
    padding: 12px 24px;
    border: 2px solid var(--primary-brand);
    background: var(--primary-brand);
    color: #ffffff;
    border-radius: 10px;
    cursor: pointer;
    font-family: var(--font-heading);
    font-weight: 700;
    font-size: 0.98rem;
    letter-spacing: -0.01em;
    transition: all 0.2s ease;
    display: flex;
    align-items: center;
    gap: 9px;
    box-shadow: 0 4px 14px var(--primary-glow);
}

.opt-btn:hover {
    background: var(--primary-hover);
    border-color: var(--primary-hover);
    box-shadow: 0 6px 18px var(--primary-glow);
}

footer {
    margin-top: 3.5rem;
    padding: 1.8rem 1.2rem;
    background-color: #0f172a;
    color: #ffffff;
    text-align: center;
    font-size: 0.95rem;
    border-radius: 0 0 20px 20px;
    margin-left: calc(-1 * clamp(1rem, 4vw, 2.8rem));
    margin-right: calc(-1 * clamp(1rem, 4vw, 2.8rem));
    margin-bottom: calc(-1 * clamp(1rem, 4vw, 2.8rem));
    box-shadow: 0 -4px 20px rgba(15, 23, 42, 0.15);
}

footer p {
    margin: 0;
    font-family: var(--font-heading);
    font-weight: 600;
    letter-spacing: 0.02em;
}

@media (max-width: 900px) {
    .container {
        width: min(760px, calc(100% - 24px));
    }
    footer {
        margin-left: -32px;
        margin-right: -32px;
    }
    .video-info {
        padding: clamp(1rem, 3vw, 1.8rem);
    }
    .player-controls {
        align-items: stretch;
    }
    .format-controls {
        align-items: stretch;
    }
}

@media (max-width: 700px) {
    body {
        padding: 12px 0;
    }
    .container {
        width: calc(100% - 20px);
        padding: 1.25rem;
        border-radius: 16px;
    }
    header h1 {
        font-size: clamp(1.8rem, 8vw, 2.2rem);
        gap: 10px;
    }
    header p {
        font-size: 0.98rem;
    }
    .search-box {
        flex-direction: column;
        gap: 10px;
    }
    #video-url,
    #download-btn {
        width: 100%;
        min-width: 0;
    }
    #download-btn {
        justify-content: center;
    }
    .category-tags {
        gap: 8px;
    }
    .tag-btn {
        padding: 8px 14px;
    }
    .video-info {
        padding: 1rem;
        border-radius: 12px;
    }
    .player-controls {
        flex-direction: column;
        align-items: stretch;
    }
    .player-tabs {
        display: grid;
        grid-template-columns: repeat(2, minmax(0, 1fr));
    }
    .player-tab-btn,
    .external-yt-btn {
        justify-content: center;
        text-align: center;
    }
    .player-notice {
        align-items: flex-start;
        padding: 10px 12px;
    }
    .format-controls {
        flex-direction: column;
    }
    .format-dropdown,
    .opt-btn {
        width: 100%;
    }
    .opt-btn {
        justify-content: center;
    }
    footer {
        margin: 2rem -1.25rem -1.25rem;
        padding: 1.4rem 1rem;
        border-radius: 0 0 16px 16px;
    }
}

@media (max-width: 420px) {
    .container {
        width: calc(100% - 12px);
        padding: 1rem;
    }
    header h1 {
        font-size: 1.8rem;
        gap: 8px;
    }
    .section-heading h2 {
        font-size: 1.2rem;
    }
    .search-results.grid-view {
        grid-template-columns: minmax(0, 1fr);
        gap: 14px;
    }
    .player-tabs {
        grid-template-columns: 1fr;
    }
    .format-filter-tabs {
        gap: 7px;
    }
    .format-tab {
        padding: 7px 11px;
        font-size: 0.82rem;
    }
    footer {
        margin-right: -1rem;
        margin-left: -1rem;
        margin-bottom: -1rem;
    }
}
`;

// --- API Helpers ---
const configuredApiBase = document.querySelector('meta[name="api-base"]')?.content?.trim();
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

// --- Categories ---
const CATEGORIES = [
    { id: 'trending', name: 'Trending', icon: 'fas fa-fire' },
    { id: 'music', name: 'Music', icon: 'fas fa-music' },
    { id: 'gaming', name: 'Gaming', icon: 'fas fa-gamepad' },
    { id: 'news', name: 'News', icon: 'fas fa-newspaper' },
    { id: 'tech', name: 'Tech', icon: 'fas fa-laptop-code' },
    { id: 'sports', name: 'Sports', icon: 'fas fa-futbol' },
    { id: 'science', name: 'Science', icon: 'fas fa-flask' },
    { id: 'education', name: 'Education', icon: 'fas fa-graduation-cap' },
    { id: 'movies', name: 'Movies', icon: 'fas fa-film' },
    { id: 'comedy', name: 'Comedy', icon: 'fas fa-face-laugh' },
    { id: 'travel', name: 'Travel', icon: 'fas fa-plane' },
    { id: 'cooking', name: 'Cooking', icon: 'fas fa-utensils' },
    { id: 'podcasts', name: 'Podcasts', icon: 'fas fa-podcast' },
    { id: 'animals', name: 'Animals', icon: 'fas fa-paw' },
];

// --- Default Format Groups Fallback ---
const DEFAULT_FORMAT_GROUPS = [
    {
        group: '🌟 Best Quality Video Options',
        formats: [
            { id: 'video_best_mp4', label: 'Best Quality Available (MP4)' },
            { id: 'video_best_webm', label: 'Best Quality Available (WEBM)' },
            { id: 'video_best_mkv', label: 'Best Quality Available (MKV)' },
            { id: 'video_best_mov', label: 'Best Quality Available (MOV)' },
            { id: 'video_best_avi', label: 'Best Quality Available (AVI)' },
        ]
    },
    {
        group: '🎬 Video Resolutions & Formats',
        formats: [
            { id: 'video_4320_mp4', label: '8K Ultra HD (4320p) - MP4' },
            { id: 'video_2160_mp4', label: '4K Ultra HD (2160p) - MP4' },
            { id: 'video_2160_webm', label: '4K Ultra HD (2160p) - WEBM' },
            { id: 'video_2160_mkv', label: '4K Ultra HD (2160p) - MKV' },
            { id: 'video_1440_mp4', label: '2K QHD (1440p) - MP4' },
            { id: 'video_1440_webm', label: '2K QHD (1440p) - WEBM' },
            { id: 'video_1440_mkv', label: '2K QHD (1440p) - MKV' },
            { id: 'video_1080_mp4', label: '1080p Full HD - MP4' },
            { id: 'video_1080_webm', label: '1080p Full HD - WEBM' },
            { id: 'video_1080_mkv', label: '1080p Full HD - MKV' },
            { id: 'video_1080_mov', label: '1080p Full HD - MOV' },
            { id: 'video_1080_avi', label: '1080p Full HD - AVI' },
            { id: 'video_720_mp4', label: '720p HD - MP4' },
            { id: 'video_720_webm', label: '720p HD - WEBM' },
            { id: 'video_720_mkv', label: '720p HD - MKV' },
            { id: 'video_720_avi', label: '720p HD - AVI' },
            { id: 'video_720_flv', label: '720p HD - FLV' },
            { id: 'video_720_3gp', label: '720p HD - 3GP' },
            { id: 'video_480_mp4', label: '480p SD - MP4' },
            { id: 'video_480_webm', label: '480p SD - WEBM' },
            { id: 'video_480_mkv', label: '480p SD - MKV' },
            { id: 'video_480_3gp', label: '480p SD - 3GP' },
            { id: 'video_360_mp4', label: '360p SD - MP4' },
            { id: 'video_360_webm', label: '360p SD - WEBM' },
            { id: 'video_360_3gp', label: '360p SD - 3GP' },
            { id: 'video_240_mp4', label: '240p SD - MP4' },
            { id: 'video_240_webm', label: '240p SD - WEBM' },
            { id: 'video_144_mp4', label: '144p SD - MP4' },
            { id: 'video_144_webm', label: '144p SD - WEBM' },
        ]
    },
    {
        group: '🎵 Audio Only Formats',
        formats: [
            { id: 'audio_mp3', label: 'High Quality MP3 Audio (320kbps)' },
            { id: 'audio_m4a', label: 'High Quality M4A / AAC Audio' },
            { id: 'audio_wav', label: 'Uncompressed WAV Audio' },
            { id: 'audio_flac', label: 'Lossless FLAC Audio' },
            { id: 'audio_ogg', label: 'OGG / Vorbis Audio' },
            { id: 'audio_webm', label: 'WEBM / Opus Audio' },
            { id: 'audio_aac', label: 'AAC Audio' },
        ]
    }
];

function Header() {
    return (
        <header>
            <h1>
                <span className="logo-mark" aria-hidden="true"><i className="fas fa-play"></i></span>
                <span className="logo-text">EuTube</span>
            </h1>
            <p>Fetch, stream, and save high quality 8K, 4K, WEBM, MP4 and MP3 EuTube videos and audios.</p>
        </header>
    );
}

function SearchBox({ query, setQuery, onSearch }) {
    const handleKeyDown = (e) => {
        if (e.key === 'Enter') {
            onSearch();
        }
    };

    return (
        <div className="search-box">
            <input
                type="text"
                id="video-url"
                aria-label="Search video or paste URL"
                placeholder="Paste YouTube link or search video name..."
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={handleKeyDown}
            />
            <button id="download-btn" onClick={onSearch}>
                <i className="fas fa-search"></i> Search / Fetch
            </button>
        </div>
    );
}

function CategoryTags({ activeCategory, onSelectCategory }) {
    return (
        <div className="category-tags">
            {CATEGORIES.map(cat => (
                <button
                    key={cat.id}
                    className={`tag-btn ${activeCategory === cat.id ? 'active' : ''}`}
                    data-category={cat.id}
                    onClick={() => onSelectCategory(cat)}
                >
                    <i className={cat.icon}></i> {cat.name}
                </button>
            ))}
        </div>
    );
}

function StatusMessage({ status }) {
    if (!status || !status.text) return <div id="status" className="status-message"></div>;

    return (
        <div id="status" className="status-message" style={{ color: status.color || '#555' }}>
            {status.loading && <i className="fas fa-spinner fa-spin" style={{ marginRight: '8px' }}></i>}
            {status.text}
        </div>
    );
}

function VideoPlayerSection({ selectedVideo, onStatusChange }) {
    const [playerMode, setPlayerMode] = useState('embed');
    const [formatFilter, setFormatFilter] = useState('all');
    const [formatGroups, setFormatGroups] = useState(DEFAULT_FORMAT_GROUPS);
    const [selectedFormatId, setSelectedFormatId] = useState('video_2160_mp4');
    const [directStreamUrl, setDirectStreamUrl] = useState('');
    const videoRef = useRef(null);

    const videoId = useMemo(() => {
        if (!selectedVideo) return null;
        return selectedVideo.id || extractVideoId(selectedVideo.url);
    }, [selectedVideo]);

    const watchUrl = useMemo(() => {
        if (!selectedVideo) return '#';
        return videoId ? `https://www.youtube.com/watch?v=${videoId}` : selectedVideo.url;
    }, [selectedVideo, videoId]);

    // Load available formats when video changes
    useEffect(() => {
        if (!selectedVideo) return;

        let isMounted = true;
        const videoUrl = selectedVideo.url || (videoId ? `https://www.youtube.com/watch?v=${videoId}` : '');

        async function loadFormats() {
            try {
                const data = await fetchApi('/api/formats', { url: videoUrl });
                if (!isMounted) return;

                if (data.groups && data.groups.length) {
                    setFormatGroups(data.groups);
                } else if (data.formats && data.formats.length) {
                    setFormatGroups([{ group: 'Available Formats', formats: data.formats }]);
                }
            } catch (err) {
                console.warn('Failed to load format list from server:', err);
                if (isMounted) setFormatGroups(DEFAULT_FORMAT_GROUPS);
            }
        }

        loadFormats();
        return () => { isMounted = false; };
    }, [selectedVideo, videoId]);

    // Switch player mode or load direct stream
    useEffect(() => {
        if (!selectedVideo) return;

        if (playerMode === 'direct') {
            let isMounted = true;
            onStatusChange({ text: 'Fetching direct video stream...', color: '#0066cc', loading: true });

            const targetUrl = selectedVideo.url || (videoId ? `https://www.youtube.com/watch?v=${videoId}` : '');

            fetchApi('/api/stream', { url: targetUrl })
                .then(data => {
                    if (!isMounted) return;
                    if (data.proxy_url || data.stream_url) {
                        const primarySrc = data.proxy_url ? `${API_BASE}${data.proxy_url}` : data.stream_url;
                        setDirectStreamUrl(primarySrc);

                        if (videoRef.current) {
                            videoRef.current.src = primarySrc;
                            videoRef.current.play().catch(e => console.warn('Autoplay prevented:', e));
                        }
                        onStatusChange({ text: 'Stream loaded. Press play if playback does not start automatically.', color: '#0066cc', loading: false });
                    } else {
                        onStatusChange({ text: 'Direct stream unavailable: Could not retrieve stream link.', color: 'red', loading: false });
                    }
                })
                .catch(err => {
                    if (!isMounted) return;
                    onStatusChange({ text: getApiErrorMessage(err), color: 'red', loading: false });
                });

            return () => { isMounted = false; };
        }
    }, [playerMode, selectedVideo, videoId, onStatusChange]);

    const filterFormatGroups = useMemo(() => {
        if (formatFilter === 'all') return formatGroups;

        return formatGroups.map(g => {
            const label = (g.group || '').toLowerCase();
            if (formatFilter === 'video') {
                if (label.includes('video') || label.includes('best') || label.includes('raw') || label.includes('resolutions')) {
                    return g;
                }
                return null;
            } else if (formatFilter === 'audio') {
                if (label.includes('audio')) {
                    return g;
                }
                return null;
            }
            return g;
        }).filter(Boolean);
    }, [formatGroups, formatFilter]);

    if (!selectedVideo) return null;

    const handleVideoError = () => {
        onStatusChange({ text: 'Direct playback failed. Please use YouTube Player or Watch on YouTube.', color: 'red', loading: false });
    };

    const handleVideoPlaying = () => {
        onStatusChange({ text: 'Streaming directly via HTML5 Video Player.', color: '#00c853', loading: false });
    };

    const processDownload = () => {
        const url = selectedVideo.url || (videoId ? `https://www.youtube.com/watch?v=${videoId}` : '');
        if (!url) {
            onStatusChange({ text: 'No video selected for download.', color: 'red', loading: false });
            return;
        }

        onStatusChange({ text: `Preparing ${selectedFormatId.toUpperCase()} download... Your browser will save the file when it's ready.`, color: '#0066cc', loading: false });

        const downloadUrl = new URL(`${API_BASE}/api/download`, window.location.href);
        downloadUrl.searchParams.set('url', url);
        downloadUrl.searchParams.set('format', selectedFormatId);

        const link = document.createElement('a');
        link.href = downloadUrl.toString();
        link.style.display = 'none';
        document.body.appendChild(link);
        link.click();
        link.remove();
    };

    const embedUrl = videoId
        ? `https://www.youtube.com/embed/${videoId}?autoplay=1&rel=0`
        : '';

    return (
        <div id="video-info" className="video-info">
            <div className="player-container" id="player-wrapper">
                {playerMode === 'embed' ? (
                    <iframe
                        key={videoId}
                        id="video-player"
                        src={embedUrl}
                        allowFullScreen
                        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                        referrerPolicy="strict-origin-when-cross-origin"
                    ></iframe>
                ) : (
                    <video
                        ref={videoRef}
                        id="html5-player"
                        src={directStreamUrl}
                        controls
                        autoPlay
                        playsInline
                        preload="metadata"
                        style={{ display: 'block', width: '100%', height: '100%', position: 'absolute', top: 0, left: 0, background: '#000', borderRadius: '10px' }}
                        onError={handleVideoError}
                        onPlaying={handleVideoPlaying}
                    ></video>
                )}
            </div>

            <div className="player-controls">
                <div className="player-tabs">
                    <button
                        id="player-mode-embed"
                        className={`player-tab-btn ${playerMode === 'embed' ? 'active' : ''}`}
                        onClick={() => setPlayerMode('embed')}
                    >
                        <i className="fab fa-youtube"></i> YouTube Player
                    </button>
                    <button
                        id="player-mode-direct"
                        className={`player-tab-btn ${playerMode === 'direct' ? 'active' : ''}`}
                        onClick={() => setPlayerMode('direct')}
                    >
                        <i className="fas fa-play-circle"></i> Direct HTML5 Stream
                    </button>
                </div>
                <a
                    id="open-youtube-btn"
                    href={watchUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="external-yt-btn"
                >
                    <i className="fas fa-external-link-alt"></i> Watch on YouTube
                </a>
            </div>

            <div className="player-notice" id="player-notice">
                <i className="fas fa-info-circle"></i> If YouTube embed shows "Video Unavailable" due to YouTube embed restrictions, click <strong>Direct HTML5 Stream</strong> or <strong>Watch on YouTube</strong>.
            </div>

            <div className="details">
                <h3 id="video-title">{selectedVideo.title || 'Video Title'}</h3>
                <p id="video-channel" className="channel-name"><i className="fas fa-user-circle"></i> <span>{selectedVideo.uploader || 'Channel Name'}</span></p>
                <p id="video-duration"><i className="fas fa-clock"></i> <span>Duration: {selectedVideo.duration || 'N/A'}</span></p>

                <div className="format-selection-container">
                    <label htmlFor="format-select"><i className="fas fa-sliders-h"></i> Choose Quality & Format:</label>
                    <div className="format-filter-tabs">
                        <button type="button" className={`format-tab ${formatFilter === 'all' ? 'active' : ''}`} onClick={() => setFormatFilter('all')}>All Formats</button>
                        <button type="button" className={`format-tab ${formatFilter === 'video' ? 'active' : ''}`} onClick={() => setFormatFilter('video')}><i className="fas fa-video"></i> Video Formats</button>
                        <button type="button" className={`format-tab ${formatFilter === 'audio' ? 'active' : ''}`} onClick={() => setFormatFilter('audio')}><i className="fas fa-music"></i> Audio Formats</button>
                    </div>
                    <div className="format-controls">
                        <select
                            id="format-select"
                            className="format-dropdown"
                            value={selectedFormatId}
                            onChange={(e) => setSelectedFormatId(e.target.value)}
                        >
                            {filterFormatGroups.map((g, idx) => (
                                <optgroup key={idx} label={g.group}>
                                    {(g.formats || []).map(f => (
                                        <option key={f.id} value={f.id}>{f.label}</option>
                                    ))}
                                </optgroup>
                            ))}
                        </select>
                        <button className="opt-btn primary-download-btn" onClick={processDownload}>
                            <i className="fas fa-download"></i> Download Video / Audio
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}

function VideoCard({ video, onSelect }) {
    const videoId = video.id || extractVideoId(video.url);
    const watchUrl = video.url || (videoId ? `https://www.youtube.com/watch?v=${videoId}` : '#');

    const handleExternalClick = (e) => {
        e.stopPropagation();
    };

    return (
        <div className="video-card" onClick={() => onSelect(video)}>
            <div className="thumb-container">
                <img src={video.thumbnail || ''} alt="thumbnail" loading="lazy" />
                {video.duration && <span className="duration-badge">{video.duration}</span>}
            </div>
            <div className="card-details">
                <h4 title={video.title}>{video.title}</h4>
                <p className="uploader-name"><i className="fas fa-user"></i> {video.uploader || 'YouTube Channel'}</p>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 'auto', paddingTop: '8px' }}>
                    {video.views ? <span className="view-count" style={{ margin: 0 }}><i className="fas fa-eye"></i> {video.views}</span> : <span></span>}
                    <a
                        href={watchUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        onClick={handleExternalClick}
                        style={{
                            fontSize: '0.78rem',
                            fontWeight: 700,
                            color: '#ffffff',
                            backgroundColor: '#ff0000',
                            padding: '4px 10px',
                            borderRadius: '6px',
                            textDecoration: 'none',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '4px',
                            flexShrink: 0
                        }}
                    >
                        <i className="fas fa-external-link-alt"></i> Watch / Open
                    </a>
                </div>
            </div>
        </div>
    );
}

function SkeletonCard() {
    return (
        <div className="video-card video-card-skeleton" aria-hidden="true">
            <div className="skeleton-thumb"></div>
            <div className="skeleton-details">
                <div className="skeleton-line"></div>
                <div className="skeleton-line short"></div>
            </div>
        </div>
    );
}

function VideoGrid({ heading, videos, isLoading, continuation, onLoadMore, isLoadingMore, onSelectVideo }) {
    const triggerRef = useRef(null);

    useEffect(() => {
        if (!continuation || isLoadingMore) return;

        const observer = new IntersectionObserver((entries) => {
            if (entries.some(entry => entry.isIntersecting)) {
                onLoadMore();
            }
        }, { rootMargin: '500px 0px' });

        const node = triggerRef.current;
        if (node) observer.observe(node);

        return () => {
            if (node) observer.unobserve(node);
        };
    }, [continuation, isLoadingMore, onLoadMore]);

    return (
        <main>
            <div className="section-heading" id="results-heading">
                <h2><i className="fas fa-compass"></i> {heading}</h2>
            </div>

            <div id="search-results" className="search-results grid-view">
                {isLoading ? (
                    Array.from({ length: 8 }).map((_, i) => <SkeletonCard key={i} />)
                ) : videos && videos.length > 0 ? (
                    <>
                        {videos.map(video => (
                            <VideoCard key={video.id || video.url} video={video} onSelect={onSelectVideo} />
                        ))}
                        {continuation && (
                            <button
                                ref={triggerRef}
                                type="button"
                                className="load-more-trigger"
                                disabled={isLoadingMore}
                                onClick={onLoadMore}
                            >
                                {isLoadingMore ? 'Loading more videos…' : 'Scroll to load more videos'}
                            </button>
                        )}
                    </>
                ) : (
                    <p className="no-results">No videos found matching your search.</p>
                )}
            </div>
        </main>
    );
}

function Footer() {
    return (
        <footer>
            <p>&copy; 2026 EuTube Downloader Developed by Eugene</p>
        </footer>
    );
}

function App() {
    const [searchQuery, setSearchQuery] = useState('');
    const [activeCategory, setActiveCategory] = useState('trending');
    const [headingText, setHeadingText] = useState('Trending Videos');
    const [status, setStatus] = useState({ text: '', color: '#555', loading: false });
    const [videos, setVideos] = useState([]);
    const [selectedVideo, setSelectedVideo] = useState(null);
    const [isLoading, setIsLoading] = useState(false);
    const [continuation, setContinuation] = useState(null);
    const [isLoadingMore, setIsLoadingMore] = useState(false);
    const [listingType, setListingType] = useState('category'); // 'category' or 'search'
    const [listingValue, setListingValue] = useState('trending');
    const seenVideoIds = useRef(new Set());

    const updateStatus = useCallback((st) => {
        setStatus(st);
    }, []);

    const filterNewVideos = useCallback((newVideos) => {
        return newVideos.filter(v => {
            const vId = v.id || extractVideoId(v.url);
            if (!vId) return true;
            if (seenVideoIds.current.has(vId)) return false;
            seenVideoIds.current.add(vId);
            return true;
        });
    }, []);

    // Load Category Videos
    const loadCategoryVideos = useCallback(async (catId, catName) => {
        setActiveCategory(catId);
        setHeadingText(`${catName} Videos`);
        setIsLoading(true);
        setStatus({ text: 'Fetching videos from YouTube...', color: '#555', loading: true });
        setSelectedVideo(null);
        setListingType('category');
        setListingValue(catId);
        seenVideoIds.current.clear();

        try {
            const data = await fetchApi('/api/trending', { category: catId });
            const newVideos = filterNewVideos(data.results || []);
            setVideos(newVideos);
            setContinuation(data.continuation || null);
            setIsLoading(false);

            if (newVideos.length > 0) {
                setStatus({
                    text: `Loaded ${newVideos.length} videos${data.continuation ? ' — scroll for more' : ''}`,
                    color: '#00c853',
                    loading: false
                });
            } else {
                setStatus({ text: 'No videos found.', color: '#555', loading: false });
            }
        } catch (err) {
            setIsLoading(false);
            setVideos([]);
            setStatus({ text: getApiErrorMessage(err), color: 'red', loading: false });
        }
    }, [filterNewVideos]);

    // Initial Fetch on mount
    useEffect(() => {
        loadCategoryVideos('trending', 'Trending');
    }, [loadCategoryVideos]);

    // Perform Search
    const handleSearch = async () => {
        const query = searchQuery.trim();
        if (!query) {
            setStatus({ text: 'Please paste a link or type a search query', color: 'red', loading: false });
            return;
        }

        setStatus({ text: 'Searching YouTube...', color: '#555', loading: true });
        setSelectedVideo(null);
        setIsLoading(true);
        setListingType('search');
        setListingValue(query);
        seenVideoIds.current.clear();

        try {
            const data = await fetchApi('/api/info', { url: query });

            if (data.is_search) {
                const newVideos = filterNewVideos(data.results || []);
                setVideos(newVideos);
                setContinuation(data.continuation || null);
                setHeadingText(`Search Results for "${query}"`);
                setIsLoading(false);

                setStatus({
                    text: `Loaded ${newVideos.length} results from YouTube${data.continuation ? ' — scroll for more' : ''}. Select a video to view or download:`,
                    color: '#00c853',
                    loading: false
                });
            } else {
                setIsLoading(false);
                setVideos([]);
                setStatus({ text: 'Video found!', color: '#00c853', loading: false });
                setSelectedVideo({
                    id: data.id,
                    title: data.title,
                    duration: data.duration,
                    thumbnail: data.thumbnail,
                    url: data.url,
                    uploader: data.uploader
                });
            }
        } catch (err) {
            setIsLoading(false);
            setVideos([]);
            setStatus({ text: getApiErrorMessage(err), color: 'red', loading: false });
        }
    };

    // Load More Videos
    const handleLoadMore = async () => {
        if (!continuation || isLoadingMore) return;

        setIsLoadingMore(true);

        const endpoint = listingType === 'category' ? '/api/trending' : '/api/info';
        const params = listingType === 'category'
            ? { category: listingValue, continuation }
            : { url: listingValue, continuation };

        try {
            const data = await fetchApi(endpoint, params);
            const newVideos = filterNewVideos(data.results || []);

            setVideos(prev => [...prev, ...newVideos]);
            setContinuation(data.continuation || null);
            setIsLoadingMore(false);

            const total = videos.length + newVideos.length;
            const label = listingType === 'category' ? 'videos' : 'search results';
            setStatus({
                text: `Loaded ${total} ${label}${data.continuation ? ' — scroll for more' : ''}`,
                color: '#00c853',
                loading: false
            });
        } catch (err) {
            setIsLoadingMore(false);
            setStatus({ text: getApiErrorMessage(err), color: 'red', loading: false });
        }
    };

    const handleSelectVideo = (video) => {
        setSelectedVideo(video);
        setStatus({ text: 'Video loaded! Stream above or choose a format to download below:', color: '#28a745', loading: false });
        window.scrollTo({ top: 0, behavior: 'smooth' });
    };

    return (
        <div className="container">
            <style dangerouslySetInnerHTML={{ __html: APP_STYLES }} />
            <Header />
            <SearchBox query={searchQuery} setQuery={setSearchQuery} onSearch={handleSearch} />
            <CategoryTags
                activeCategory={activeCategory}
                onSelectCategory={(cat) => loadCategoryVideos(cat.id, cat.name)}
            />
            <StatusMessage status={status} />
            <VideoPlayerSection selectedVideo={selectedVideo} onStatusChange={updateStatus} />
            <VideoGrid
                heading={headingText}
                videos={videos}
                isLoading={isLoading}
                continuation={continuation}
                onLoadMore={handleLoadMore}
                isLoadingMore={isLoadingMore}
                onSelectVideo={handleSelectVideo}
            />
            <Footer />
        </div>
    );
}

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(<App />);
