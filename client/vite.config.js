import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

/** GitHub project site: set VITE_BASE=/YourRepoName/ when building (see .github/workflows). */
const base = process.env.VITE_BASE || '/';

export default defineConfig({
  base,
  plugins: [react()],
  server: {
    port: 5173,
    strictPort: false,
    host: true,
    allowedHosts: true,
    proxy: {
      '/api': { target: 'http://localhost:3001', changeOrigin: true },
    },
  },
});
