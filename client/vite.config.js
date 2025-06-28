import {defineConfig} from 'vite';

// https://vitejs.dev/config/
export default defineConfig({
  envDir: '../',
  server: {
    proxy: {
      '/api': {
        target: 'http://localhost:3001',
        changeOrigin: true,
        secure: false,
        ws: true,
      },
      '/media': {
        target: 'http://localhost:3001',
        changeOrigin: true,
        secure: false,
        ws: true,
      },
      '/socket.io': {
        target: 'http://localhost:3001',
        changeOrigin: true,
        secure: false,
        ws: true,
      },
      '/sentry-tunnel': {
        target: 'http://localhost:3001',
        changeOrigin: true,
        secure: false,
      },
    },
    hmr: {
      clientPort: 443,
    },
    allowedHosts: ["fax-neil-church-applicants.trycloudflare.com", "localhost"]
  },
});
