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
2. **FFmpeg** installed and available on your PATH (required to merge MP4 video/audio and to convert MP3 files).
3. Install dependencies:
   ```bash
   pip install flask yt-dlp
   ```

The downloader accepts a YouTube URL or a search term, then provides MP4 and MP3 downloads for the selected result. Use it only for content you own or are authorized to download.

## How to Run
1. Open a terminal/command prompt in this folder.
2. Run the server:
   ```bash
   python server.py
   ```
3. Open your browser and go to `http://localhost:5000`.

## Disclaimer
This project is for educational purposes only. Downloading YouTube videos may violate YouTube's Terms of Service. Use responsibly.
