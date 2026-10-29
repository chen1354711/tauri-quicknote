// Prevents an extra console window on Windows in release builds.
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

use serde::{Deserialize, Serialize};
use std::path::PathBuf;
use tauri::{AppHandle, Manager, Runtime};

/// 返回给前端的运行时信息（字段名用 camelCase，前端直接消费）
#[derive(Debug, Serialize, Clone)]
#[serde(rename_all = "camelCase")]
struct SystemInfo {
    os: &'static str,
    arch: &'static str,
    app_version: String,
    tauri_version: &'static str,
    webview_version: String,
    data_dir: String,
}

/// 一条速记。id 由前端生成（crypto.randomUUID），createdAt 为毫秒时间戳。
#[derive(Debug, Serialize, Deserialize, Clone)]
#[serde(rename_all = "camelCase")]
struct Note {
    id: String,
    text: String,
    done: bool,
    created_at: u64,
}

/// 所有数据都放在系统标准的 app data 目录：
/// macOS: ~/Library/Application Support/com.dsh.tauri-quicknote/notes.json
fn notes_path<R: Runtime>(app: &AppHandle<R>) -> Result<PathBuf, String> {
    let dir = app.path().app_data_dir().map_err(|e| e.to_string())?;
    std::fs::create_dir_all(&dir).map_err(|e| e.to_string())?;
    Ok(dir.join("notes.json"))
}

#[tauri::command]
fn system_info<R: Runtime>(app: AppHandle<R>) -> SystemInfo {
    SystemInfo {
        os: std::env::consts::OS,
        arch: std::env::consts::ARCH,
        app_version: app.package_info().version.to_string(),
        tauri_version: tauri::VERSION,
        webview_version: tauri::webview_version().unwrap_or_else(|_| "unknown".into()),
        data_dir: app
            .path()
            .app_data_dir()
            .map(|p| p.display().to_string())
            .unwrap_or_default(),
    }
}

#[tauri::command]
fn load_notes<R: Runtime>(app: AppHandle<R>) -> Result<Vec<Note>, String> {
    let path = notes_path(&app)?;
    if !path.exists() {
        return Ok(Vec::new());
    }
    let raw = std::fs::read_to_string(&path).map_err(|e| e.to_string())?;
    if raw.trim().is_empty() {
        return Ok(Vec::new());
    }
    serde_json::from_str(&raw).map_err(|e| format!("notes.json 解析失败: {e}"))
}

#[tauri::command]
fn save_notes<R: Runtime>(app: AppHandle<R>, notes: Vec<Note>) -> Result<(), String> {
    let path = notes_path(&app)?;
    let json = serde_json::to_string_pretty(&notes).map_err(|e| e.to_string())?;
    std::fs::write(&path, json).map_err(|e| e.to_string())
}

fn main() {
    tauri::Builder::default()
        .plugin(tauri_plugin_process::init())
        .plugin(tauri_plugin_updater::Builder::new().build())
        .invoke_handler(tauri::generate_handler![system_info, load_notes, save_notes])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
