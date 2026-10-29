# Tauri 速记（tauri-quicknote）

一个用来演示 **Tauri 2 最新版 + React 19** 的最小桌面应用：React 前端 + Rust 命令 + JSON 本地持久化。

- Tauri crate：`2.12.5`（crates.io 最新 stable）
- `@tauri-apps/cli`：`2.12.4`（npm 最新 stable）
- 前端：**React 19.3 + Vite 8.3 + TypeScript 5.9**
- IPC：`@tauri-apps/api` 的 `invoke`（不再用 `withGlobalTauri`）
- 使用 Tauri 内置 IPC，以及 `process` / `updater` 插件支持自动更新

## 功能

- 速记增删改查 + 完成状态，全部写入系统标准数据目录
- 顶部展示运行时信息：系统、架构、应用版本、Tauri 版本、WebKit 版本
- 筛选（全部 / 未完成 / 已完成）、清除已完成、`⌘K` 聚焦输入框
- 深色/浅色主题跟随系统
- 数据位置：
  - macOS：`~/Library/Application Support/com.dsh.tauri-quicknote/notes.json`
  - Windows：`%APPDATA%\com.dsh.tauri-quicknote\notes.json`
  - Linux：`~/.config/com.dsh.tauri-quicknote/notes.json`

## 项目结构

```
tauri-quicknote/
├── index.html                    # Vite 入口（挂载 #root）
├── vite.config.ts                # 固定 1423 端口 + 忽略 src-tauri
├── tsconfig.json                 # strict + react-jsx + bundler resolution
├── package.json
├── preview.png                   # UI 预览（无头 Chrome + mock __TAURI_INTERNALS__）
├── scripts/gen-icon.py           # 生成 1024 源图标
├── src/                          # React 前端
│   ├── main.tsx                  # createRoot + StrictMode
│   ├── App.tsx                   # 状态 / 防抖保存 / ⌘K
│   ├── types.ts                  # 与 Rust serde 结构对应
│   ├── lib/format.ts             # 相对时间
│   ├── components/InfoCards.tsx  # 运行时信息卡
│   ├── components/NoteItem.tsx   # 单条速记
│   ├── styles.css                # 玻璃拟态 UI
│   └── vite-env.d.ts
└── src-tauri/
    ├── Cargo.toml                # tauri 2.12.5 + serde
    ├── build.rs                  # tauri_build::build()
    ├── tauri.conf.json           # devUrl / beforeBuildCommand / frontendDist
    ├── capabilities/default.json # 只开放 core:default 权限
    ├── icons/                    # npx tauri icon 生成
    └── src/main.rs               # 3 个命令：system_info / load_notes / save_notes
```

## 已验证

- `npm run typecheck` 通过（TypeScript strict、`noUnusedLocals`）。
- `npm run build` 通过：`dist/assets/index-*.js` **226 KB（gzip 71 KB）**、CSS 7.3 KB —— React 19 带来的增量很小。
- `npx tauri build --bundles app` 构建成功：`Tauri速记.app` **6.07 MiB**（Rust 增量编译约 29s）。
- 应用已在本机重启：LaunchServices 显示 `Tauri速记` 为前台应用（pid 80963），WebKit WebContent 子进程在线。
- UI 预览：`preview.png`（系统未授予 Screen Recording 权限，无法直接截真实窗口；此图由无头 Chrome 加载真实 `dist/` + mock IPC 渲染）。

## 运行

Rust 工具链被**本地安装**到了项目内（`.cargo/`、`.rustup/`），不污染系统：

```bash
cd tauri-quicknote
export CARGO_HOME="$PWD/.cargo" RUSTUP_HOME="$PWD/.rustup"
export PATH="$PWD/.cargo/bin:$PATH"
export npm_config_cache="$PWD/.npm-cache"

npm install

# 开发：Vite 热更新 + Tauri 窗口（自动先起 Vite dev server）
npm run tauri dev        # 等价于 npx tauri dev

# 只跑前端（浏览器里看，IPC 会报错）
npm run dev

# 类型检查 / 前端构建
npm run typecheck
npm run build            # 产出 dist/

# 完整打包 .app + .dmg
npm run tauri build
```

如果你自己的机器已经装好 Rust，去掉前 3 行 export 即可。

## 几个实现细节

1. **Tauri 配置已切到 Vite 模式**：
   ```jsonc
   "build": {
     "beforeDevCommand": "npm run dev",
     "devUrl": "http://localhost:1423",
     "beforeBuildCommand": "npm run build",
     "frontendDist": "../dist"
   }
   ```
   生产构建时 `npm run build` 先出 `dist/`，Tauri 再把它嵌入二进制（和 CC Switch / Cockpit Tools 一样的机制）。
2. **IPC 用官方 API**：`import { invoke } from "@tauri-apps/api/core"`；`withGlobalTauri` 已移除。
3. **React 19 StrictMode**：启动 effect 会执行两次，用 `cancelled` 标记防止竞态；保存用 `useRef` 持有 timer，卸载时清理。
4. **持久化在 Rust 侧**：`save_notes` 写 JSON、`load_notes` 读 JSON，路径来自 `app.path().app_data_dir()`；前端 180ms 防抖调用。
5. **Vite 8 注意**：Vite 8 换成 rolldown + oxc，不再内置 esbuild；不要写 `build.minify: "esbuild"`，否则构建时报 `Cannot find package 'esbuild'`。
6. **release 体积优化**：`Cargo.toml` 里 `lto = "thin"`、`opt-level = "s"`、`strip = true`。
7. **图标**：`scripts/gen-icon.py` 用 Pillow 生成 1024 源图，再 `npx tauri icon` 出全平台图标。

## 产物

`src-tauri/target/release/bundle/macos/Tauri速记.app`（`npm run tauri build` 会额外出 `dmg/`）。

## 在线更新

项目已接入 Tauri Updater。发布更新前需要：

1. 把 `src-tauri/tauri.conf.json` 中的 GitHub 地址替换成实际仓库，并保持 `version` 使用递增的 SemVer。
2. 保管 `.tauri/tauri-quicknote.key` 私钥；公钥已经写入 Tauri 配置，私钥不要提交到版本库。
3. 构建时设置签名私钥：

   ```bash
   export TAURI_SIGNING_PRIVATE_KEY="$PWD/.tauri/tauri-quicknote.key"
   export TAURI_SIGNING_PRIVATE_KEY_PASSWORD=""
   npm run tauri build
   ```

4. 将构建生成的更新包及 `.sig` 文件上传到 GitHub Release，并提供对应的 `latest.json`。

应用中的“检查更新”按钮会调用官方 updater 插件，下载并安装后自动重启。Updater 需要 Rust 1.90 或更高版本。
