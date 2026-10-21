import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// Electron loads the production UI via file://, so asset URLs must be relative.
export default defineConfig({
  base: './',
  plugins: [react()],
  clearScreen: false,
  server: { port: 1420, strictPort: true },
  envPrefix: ['VITE_', 'TAURI_ENV_*'],
});
