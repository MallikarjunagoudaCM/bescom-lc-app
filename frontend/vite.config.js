import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
export default defineConfig({
  plugins: [react()],
  // @bescom/authentik-auth is installed via `npm install ../bescom-authentik-auth`,
  // which npm links in via a symlink. Without this, Rollup's production
  // build resolves imports inside that package (react-router-dom, etc.)
  // against the symlink's real path rather than this project's own
  // node_modules, and fails to find them.
  resolve: { preserveSymlinks: true },
  server: { port: 3000, proxy: { '/api': { target: 'http://localhost:5000', changeOrigin: true } } },
});