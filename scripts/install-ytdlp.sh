#!/bin/bash

# Script to install yt-dlp
# This script installs yt-dlp using pip or downloads the binary

echo "Installing yt-dlp..."

# Check if Python/pip is available
if command -v pip &> /dev/null; then
    echo "Installing yt-dlp via pip..."
    pip install yt-dlp
    echo "yt-dlp installed successfully via pip"
elif command -v pip3 &> /dev/null; then
    echo "Installing yt-dlp via pip3..."
    pip3 install yt-dlp
    echo "yt-dlp installed successfully via pip3"
elif command -v python3 &> /dev/null; then
    echo "Installing yt-dlp via python3 -m pip..."
    python3 -m pip install yt-dlp
    echo "yt-dlp installed successfully"
else
    echo "Python/pip not found. Please install Python first."
    echo "Or download yt-dlp binary from: https://github.com/yt-dlp/yt-dlp/releases"
    exit 1
fi

# Verify installation
if command -v yt-dlp &> /dev/null; then
    echo "yt-dlp version:"
    yt-dlp --version
    echo "Installation completed successfully!"
else
    echo "Warning: yt-dlp command not found in PATH"
    echo "You may need to add Python scripts directory to your PATH"
fi

