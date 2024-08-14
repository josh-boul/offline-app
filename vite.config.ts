import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { VitePWA } from "vite-plugin-pwa";
// import { rollup, InputOptions, OutputOptions } from "rollup";
// import rollupPluginTypescript from "@rollup/plugin-typescript";
// import { nodeResolve } from "@rollup/plugin-node-resolve";

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      strategies: "injectManifest",
      srcDir: "src",
      filename: "serviceWorker.ts",
      injectManifest: {
        swSrc: "src/serviceWorker.ts",
        swDest: "dist/serviceWorker.js",
      },
      registerType: "autoUpdate",
      includeAssets: ["react.svg"],
      manifest: {
        name: "Offline Spike App",
        short_name: "Offline",
        description: "Offline handling application with graphql server",
        theme_color: "#ffffff",
        icons: [
          {
            src: "react.svg",
            sizes: "192x192",
            type: "image/png",
          },
        ],
      },
    }),
  ],
});
