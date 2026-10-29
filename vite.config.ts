import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// Tauri 官方推荐的 Vite 配置：
// - 固定端口，strictPort，Tauri 的 devUrl 才能稳定连上
// - 忽略 src-tauri（Rust 侧改动由 Tauri 自己的 watcher 处理）
// - clearScreen: false，保留 cargo 的编译输出
//
// 注意：Vite 8 用 rolldown + oxc，不再内置 esbuild，
// 所以不要写 minify: "esbuild" / 依赖 esbuild 的 target 降级配置。
export default defineConfig({
  plugins: [react()],
  clearScreen: false,
  server: {
    port: 1423,
    strictPort: true,
    watch: {
      ignored: ["**/src-tauri/**"],
    },
  },
  build: {
    sourcemap: false,
  },
});
