# Phoenix Music

Phoenix Music is a local-first desktop music player with a React/TypeScript interface. This portable Windows edition uses Electron, which bundles Chromium and removes the requirement for an installed WebView2 runtime.

For Windows portable-folder build and transfer instructions, see [README-PORTABLE-WINDOWS.md](README-PORTABLE-WINDOWS.md).

## Development

```bash
npm install
npm run dev:desktop
```

## Features

- Scan MP3 files from a local directory or accessible Windows UNC/SMB path.
- Extract title, artist, album, genre, duration, track number, and embedded artwork.
- Folder-based collections, custom playlists, favorites, search, and play counts.
- Stream tracks from their original path; music files are not copied into app storage.
- Store the library cache and user preferences locally.

The app requires access permissions to the configured music directory. A network share must be reachable and authenticated by Windows before scanning.
