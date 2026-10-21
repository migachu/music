# Phoenix Music — portable Windows build

This edition uses Electron instead of Tauri. Electron includes Chromium, so the target Windows computer does **not** need WebView2, Node.js, Rust, or internet access to launch the app. The app and its Chromium runtime are distributed together in a folder.

## Build the portable folder on Fedora

Install Node.js 20+ and npm on the build computer. From this directory run:

```bash
npm install
npm run build:portable:win
```

The expected output is `portable-build/win-unpacked/`. Transfer the **entire** `win-unpacked` directory to Windows, for example by zipping it or copying it to a USB drive. On Windows, run `Phoenix Music.exe` inside that directory. Do not copy only the EXE: the adjacent `resources` and runtime files are required.

Cross-building Windows Electron packages from Linux can still be affected by host architecture, download availability, and packaging-tool changes. The build must complete successfully before transferring the output. The output folder is not an installer and does not register an app with Windows.

## Library

On first launch, open Settings and either browse to a folder or type a path and click **Save path**. For an SMB share, use a UNC path such as `\\SERVER\Music`; the Windows account running the app must already have permission to access it. Then scan the library to index MP3 files. The bundled Phoenix logo is copied into the production `dist` folder and loaded using Vite-relative asset paths, so it also works when Electron opens the UI using `file://`. Phoenix Music stores its local index, favorites, and playlists in the Electron user-data directory and never modifies the original MP3 files.

## Important notes

- The app does not need a network connection to launch. A network connection is only needed to access a network-hosted music share.
- This build uses a local JSON library cache. If you have an exceptionally large library and encounter indexing delays, let the first scan finish before judging browsing performance.
- The app currently provides basic playback and library features; some advanced playback functions may still need further testing after this runtime migration.
