import fs from "node:fs";
import path from "node:path";
import { defineConfig, type Plugin } from "vite";
import react from "@vitejs/plugin-react";
import { fileURLToPath, URL } from "node:url";

import { gaiaDevProxy } from "./vite-gaia-proxy";

const MODEL_LIBRARY = fileURLToPath(new URL("../growa_greenhouse_glb_library", import.meta.url));

function greenhouseModelLibrary(): Plugin {
  const copyModels = (outDir: string) => {
    const target = path.join(outDir, "models");
    fs.mkdirSync(target, { recursive: true });
    for (const name of fs.readdirSync(MODEL_LIBRARY)) {
      if (!name.endsWith(".glb")) continue;
      fs.copyFileSync(path.join(MODEL_LIBRARY, name), path.join(target, name));
    }
  };

  return {
    name: "greenhouse-glb-library",
    configureServer(server) {
      server.middlewares.use((req, res, next) => {
        const url = req.url?.split("?")[0] ?? "";
        if (!url.startsWith("/models/") || !url.endsWith(".glb")) {
          next();
          return;
        }
        const file = path.join(MODEL_LIBRARY, path.basename(url));
        if (!file.startsWith(MODEL_LIBRARY) || !fs.existsSync(file)) {
          next();
          return;
        }
        res.setHeader("Content-Type", "model/gltf-binary");
        fs.createReadStream(file).pipe(res);
      });
    },
    writeBundle(options) {
      copyModels(options.dir ?? path.resolve("dist"));
    },
  };
}

export default defineConfig({
  plugins: [react(), gaiaDevProxy(), greenhouseModelLibrary()],
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./src", import.meta.url)),
    },
  },
  server: {
    port: 5173,
    proxy: {
      "/api/v1": {
        target: "http://localhost:8000",
        changeOrigin: true,
      },
      "/ws": {
        target: "ws://localhost:8000",
        ws: true,
      },
    },
  },
});
