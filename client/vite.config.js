import { defineConfig } from "vite";
import { loadEnv } from "vite";

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
      hmr: {
        clientPort: 443,
      },
      allowedHosts: [env.VITE_TUNNEL_HOST, "localhost"],
    },
  };
});
