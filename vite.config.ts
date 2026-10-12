
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "node:path";

export default defineConfig({
  root: path.resolve(__dirname, "src/webview"),
  plugins: [react()],
  base: "./",
  build: {
    outDir: path.resolve(__dirname, "media/webview"),
    emptyOutDir: true,
    sourcemap: false
  }
});
