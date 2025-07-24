import { defineConfig } from "vite";
import { loadEnv } from "vite";
import handlebars from 'vite-plugin-handlebars';

// https://vitejs.dev/config/
export default defineConfig((mode) => {
  const env = loadEnv(mode, "../", "");

  return {
    envDir: "../",
    server: {
      proxy: {
        "/api": {
          target: "http://localhost:3001",
          changeOrigin: true,
          secure: false,
          ws: true,
        },
        "/media": {
          target: "http://localhost:3001",
          changeOrigin: true,
          secure: false,
          ws: true,
        },
        "/socket.io": {
          target: "http://localhost:3001",
          changeOrigin: true,
          secure: false,
          ws: true,
        },
        "/sentry-tunnel": {
          target: "http://localhost:3001",
          changeOrigin: true,
          secure: false,
        },
      },
      hmr: false,
      // hmr: {
      //   path: "/.proxy/hmr",
      //   clientPort: 443,
      //   retry: true,
      //   maxRetries: Infinity,
      //   retryDelay: 1000,
      // },
      allowedHosts: [env.VITE_TUNNEL_HOST, "localhost"],
    },
  plugins: [
    handlebars({
      // point to the folder where your partials live:
      partialDirectory: 'html',
      // (optional) turn off full page reload when a partial changes:
      reloadOnPartialChange: false,
    }),
  ],
  };
});
