# PowerShell script to install yt-dlp on Windows

Write-Host "Installing yt-dlp..." -ForegroundColor Green

# Check if Python/pip is available
if (Get-Command pip -ErrorAction SilentlyContinue) {
    Write-Host "Installing yt-dlp via pip..." -ForegroundColor Yellow
    pip install yt-dlp
    Write-Host "yt-dlp installed successfully via pip" -ForegroundColor Green
} elseif (Get-Command pip3 -ErrorAction SilentlyContinue) {
    Write-Host "Installing yt-dlp via pip3..." -ForegroundColor Yellow
    pip3 install yt-dlp
    Write-Host "yt-dlp installed successfully via pip3" -ForegroundColor Green
} elseif (Get-Command python -ErrorAction SilentlyContinue) {
    Write-Host "Installing yt-dlp via python -m pip..." -ForegroundColor Yellow
    python -m pip install yt-dlp
    Write-Host "yt-dlp installed successfully" -ForegroundColor Green
} elseif (Get-Command python3 -ErrorAction SilentlyContinue) {
    Write-Host "Installing yt-dlp via python3 -m pip..." -ForegroundColor Yellow
    python3 -m pip install yt-dlp
    Write-Host "yt-dlp installed successfully" -ForegroundColor Green
} else {
    Write-Host "Python/pip not found. Please install Python first." -ForegroundColor Red
    Write-Host "Or download yt-dlp binary from: https://github.com/yt-dlp/yt-dlp/releases" -ForegroundColor Yellow
    Write-Host ""
    Write-Host "Alternative: Install via winget (Windows Package Manager):" -ForegroundColor Cyan
    Write-Host "  winget install yt-dlp" -ForegroundColor White
    exit 1
}

# Verify installation
if (Get-Command yt-dlp -ErrorAction SilentlyContinue) {
    Write-Host ""
    Write-Host "yt-dlp version:" -ForegroundColor Cyan
    yt-dlp --version
    Write-Host "Installation completed successfully!" -ForegroundColor Green
} else {
    Write-Host "Warning: yt-dlp command not found in PATH" -ForegroundColor Yellow
    Write-Host "You may need to restart your terminal or add Python scripts to PATH" -ForegroundColor Yellow
}

