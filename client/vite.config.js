import { resolve } from "path";
import { defineConfig } from "vite";
import { loadEnv } from "vite";
import handlebars from "vite-plugin-handlebars";

// https://vitejs.dev/config/
// @ts-ignore
export default defineConfig((mode) => {
  // @ts-ignore
  const env = loadEnv(mode, "../", "");

  return {
    resolve: {
      alias: {
        src: resolve(__dirname, "src")
      }
    },
    envDir: "../",
    server: {
      proxy: {
        "/api": {
          target: `${env.VITE_SERVER_ADDRESS}:${env.VITE_SERVER_PORT}`,
          changeOrigin: true,
          secure: false,
          ws: true,
        },
        "/media": {
          target: `${env.VITE_SERVER_ADDRESS}:${env.VITE_SERVER_PORT}`,
          changeOrigin: true,
          secure: false,
          ws: true,
        },
        "/socket.io": {
          target: `${env.VITE_SERVER_ADDRESS}:${env.VITE_SERVER_PORT}`,
          changeOrigin: true,
          secure: false,
          ws: true,
        },
        "/sentry-tunnel": {
          target: `${env.VITE_SERVER_ADDRESS}:${env.VITE_SERVER_PORT}`,
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
        // @ts-ignore
        partialDirectory: "html",
        // (optional) turn off full page reload when a partial changes:
        reloadOnPartialChange: false,
      }),
    ],
  };
});
