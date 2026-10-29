/** 与 Rust 侧 serde 结构一一对应（camelCase） */

export interface Note {
  id: string;
  text: string;
  done: boolean;
  createdAt: number;
}

export interface SystemInfo {
  os: string;
  arch: string;
  appVersion: string;
  tauriVersion: string;
  webviewVersion: string;
  dataDir: string;
}

export type Filter = "all" | "active" | "done";

export type SaveKind = "idle" | "saving" | "ok" | "error";

export interface SaveState {
  kind: SaveKind;
  text: string;
}
