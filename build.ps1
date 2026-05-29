# Build Learn++ for Windows and copy artifacts to build/

$target = 'x86_64-pc-windows-gnu'
$buildDir = 'build'
$exeSrc = "src-tauri\target\$target\release\learnpp.exe"
$installerSrc = "src-tauri\target\$target\release\bundle\nsis\Learn++_0.1.0_x64-setup.exe"

function Step([string]$msg) {
	Write-Host "==> $msg"
}

function Die([string]$msg) {
	Write-Host "error: $msg" -ForegroundColor Red
	exit 1
}

if (-not (Test-Path 'package.json')) {
	Die 'run this script from the project root'
}

New-Item -ItemType Directory -Force $buildDir | Out-Null

Step 'building frontend'
npm run build
if ($LASTEXITCODE -ne 0) { Die 'frontend build failed' }

Step 'building tauri app'
npx tauri build --target $target
if ($LASTEXITCODE -ne 0) { Die 'tauri build failed' }

Step 'copying artifacts to build\'
Copy-Item $exeSrc "$buildDir\learnpp.exe" -Force
Copy-Item $installerSrc "$buildDir\Learn++_0.1.0_x64-setup.exe" -Force

Step 'done'
Write-Host "  $buildDir\learnpp.exe"
Write-Host "  $buildDir\Learn++_0.1.0_x64-setup.exe"
