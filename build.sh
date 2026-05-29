#!/usr/bin/env bash
# Build Learn++ for Windows and copy artifacts to build/

prog=${0##*/}
target='x86_64-pc-windows-gnu'
build_dir='build'

die() {
	echo "$prog: error: $*" >&2
	exit 1
}

step() {
	echo "==> $*"
}

[[ -f package.json ]] || die 'run this script from the project root'

exe_src="src-tauri/target/$target/release/learnpp.exe"
installer_src="src-tauri/target/$target/release/bundle/nsis/Learn++_0.1.0_x64-setup.exe"

mkdir -p "$build_dir"

step 'building frontend'
npm run build || die 'frontend build failed'

step 'building tauri app'
npx tauri build --target "$target" || die 'tauri build failed'

step 'copying artifacts to build/'
cp "$exe_src" "$build_dir/learnpp.exe" || die 'failed to copy exe'
cp "$installer_src" "$build_dir/Learn++_0.1.0_x64-setup.exe" \
	|| die 'failed to copy installer'

step 'done'
echo "  $build_dir/learnpp.exe"
echo "  $build_dir/Learn++_0.1.0_x64-setup.exe"
