import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  // Where the backend runs. Change BACKEND_URL in frontend/.env if you changed PORT in backend/.env.
  const target = env.BACKEND_URL || 'http://localhost:5000';
  return {
    plugins: [react()],
    server: {
      port: 5173,
      proxy: { '/api': { target, changeOrigin: true } }
    },
    preview: {
      proxy: { '/api': { target, changeOrigin: true } }
    }
  };
});
