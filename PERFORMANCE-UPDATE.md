# Phoenix Music — UI and performance update

This update improves the existing Tauri + React desktop app without changing the Rust playback/database commands or the on-disk library format.

## UI additions

- Home dashboard now shows track, artist, album, and favorite counts.
- Added one-click shuffle playback from Home and the library.
- Added library sort options: title, artist, album, recently added, and most played.
- Added a clear-selection action alongside select-all and playlist insertion.
- Added responsive layouts for narrower windows, keyboard focus indicators, and reduced-motion support.
- Renamed the Home listening section to “Most played” to match the data it actually uses.

## Performance changes

- Playback progress now updates inside its own small component rather than forcing the whole app to re-render every second.
- Playback status polling avoids overlapping requests.
- Song-table and artwork components are memoized; visible song rows remain virtualized.
- Artwork requests are cached per song ID, and missing artwork results are not permanently cached.
- Artist and album deduplication uses `Set` lookups rather than repeated nested scans.
- Derived lists and dashboard counts are memoized so a playback update doesn't repeatedly sort/count the full library.
- Queue rendering is virtualized so large queues do not create thousands of DOM rows at once.

## Validation note

The updated `App.tsx` was checked with the TypeScript compiler's TSX transpilation path for syntax errors. A full `npm run build` could not be completed in the patching environment because the npm registry was unreachable and dependencies were not cached. Run `npm install` and `npm run build` on the development machine before treating this as a release build.
