# EuTube - YouTube Downloader Website

This is a simple YouTube downloader website project.

## Project Structure
- `index.html`: The frontend user interface.
- `style.css`: The styling for the website.
- `script.js`: The client-side logic.
- `server.py`: The backend server using Flask and yt-dlp.

## Prerequisites
To run the full version (with downloading capability), you need:
1. **Python** installed on your system.
2. Install dependencies, including the bundled FFmpeg binary used to merge video/audio streams:
   ```bash
   pip install flask yt-dlp imageio-ffmpeg
   ```

The downloader accepts a YouTube URL or a search term, then provides MP4 and MP3 downloads for the selected result. Use it only for content you own or are authorized to download.

Video discovery and search follow YouTube's continuation pages and return up to 100 results per category or query.

## How to Run
1. Open a terminal/command prompt in this folder.
2. Run the server:
   ```bash
   python server.py
   ```
3. Open your browser and go to `http://localhost:5000`.

## Deployment
Deploy `server.py` as a running Python web service; static hosting alone cannot run the video API. If the frontend and backend use the same domain, leave the `api-base` meta tag in `index.html` empty. If they use different domains, set its `content` to the public backend URL (for example, `https://api.example.com`). The backend must be publicly reachable over HTTPS for a secure deployed frontend.

## Disclaimer
This project is for educational purposes only. Downloading YouTube videos may violate YouTube's Terms of Service. Use responsibly.
