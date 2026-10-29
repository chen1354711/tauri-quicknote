import type { KeyboardEvent } from "react";
import { useCallback, useEffect, useRef, useState } from "react";
import { invoke } from "@tauri-apps/api/core";
import { relaunch } from "@tauri-apps/plugin-process";
import { check } from "@tauri-apps/plugin-updater";
import { InfoCards } from "./components/InfoCards";
import { NoteItem } from "./components/NoteItem";
import type { Filter, Note, SaveState, SystemInfo } from "./types";

const FILTERS: { key: Filter; label: string }[] = [
  { key: "all", label: "全部" },
  { key: "active", label: "未完成" },
  { key: "done", label: "已完成" },
];

function LogoIcon() {
  return (
    <svg viewBox="0 0 48 48" fill="none">
      <rect x="9" y="7" width="30" height="34" rx="5" stroke="currentColor" strokeWidth="2.4" />
      <path d="M16 17h16M16 24h16M16 31h9" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" />
      <circle cx="36" cy="35" r="7" fill="currentColor" />
      <path
        d="M32.8 35.2l2.2 2.2 4.2-4.6"
        stroke="#0b1020"
        strokeWidth="2.2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export default function App() {
  const [notes, setNotes] = useState<Note[]>([]);
  const [filter, setFilter] = useState<Filter>("all");
  const [info, setInfo] = useState<SystemInfo | null>(null);
  const [input, setInput] = useState("");
  const [saveState, setSaveState] = useState<SaveState>({ kind: "idle", text: "就绪" });
  const [updateState, setUpdateState] = useState<"idle" | "checking" | "available" | "downloading" | "error">("idle");
  const [updateText, setUpdateText] = useState("检查更新");

  const inputRef = useRef<HTMLInputElement>(null);
  const saveTimer = useRef<number | undefined>(undefined);

  /* 启动时拉取系统信息 + 已保存的速记 */
  useEffect(() => {
    let cancelled = false;

    const boot = async () => {
      try {
        const nextInfo = await invoke<SystemInfo>("system_info");
        if (!cancelled) setInfo(nextInfo);
      } catch (err) {
        if (!cancelled) setSaveState({ kind: "error", text: `系统信息获取失败：${String(err)}` });
      }

      try {
        const loaded = await invoke<Note[]>("load_notes");
        if (!cancelled) {
          setNotes([...loaded].sort((a, b) => b.createdAt - a.createdAt));
          setSaveState({ kind: "ok", text: "已就绪" });
        }
      } catch (err) {
        if (!cancelled) setSaveState({ kind: "error", text: `读取失败：${String(err)}` });
      }
    };

    void boot();
    return () => {
      cancelled = true;
      window.clearTimeout(saveTimer.current);
    };
  }, []);

  /* ⌘K / Ctrl+K 聚焦输入框 */
  useEffect(() => {
    const onKeyDown = (event: globalThis.KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        inputRef.current?.focus();
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  /* 防抖持久化：180ms 内的连续修改只写一次文件 */
  const scheduleSave = useCallback((next: Note[]) => {
    setSaveState({ kind: "saving", text: "保存中…" });
    window.clearTimeout(saveTimer.current);
    saveTimer.current = window.setTimeout(() => {
      void (async () => {
        try {
          await invoke("save_notes", { notes: next });
          setSaveState({ kind: "ok", text: "已保存" });
        } catch (err) {
          setSaveState({ kind: "error", text: `保存失败：${String(err)}` });
        }
      })();
    }, 180);
  }, []);

  const checkForUpdates = useCallback(async () => {
    if (updateState === "checking" || updateState === "downloading") return;

    setUpdateState("checking");
    setUpdateText("检查中…");
    try {
      const update = await check();
      if (!update) {
        setUpdateState("idle");
        setUpdateText("已是最新");
        window.setTimeout(() => setUpdateText("检查更新"), 2500);
        return;
      }

      const confirmed = window.confirm(`发现新版本 v${update.version}\n\n${update.body ?? "是否立即下载并安装？"}`);
      if (!confirmed) {
        setUpdateState("available");
        setUpdateText(`可更新至 v${update.version}`);
        return;
      }

      setUpdateState("downloading");
      setUpdateText("下载更新…");
      await update.downloadAndInstall();
      setUpdateText("正在重启…");
      await relaunch();
    } catch (err) {
      console.error("检查更新失败", err);
      setUpdateState("error");
      setUpdateText("更新失败");
      window.setTimeout(() => {
        setUpdateState("idle");
        setUpdateText("检查更新");
      }, 3000);
    }
  }, [updateState]);

  const addNote = useCallback(() => {
    const text = input.trim();
    if (!text) {
      inputRef.current?.focus();
      return;
    }

    const next: Note[] = [{ id: crypto.randomUUID(), text, done: false, createdAt: Date.now() }, ...notes];
    setNotes(next);
    setInput("");
    if (filter === "done") setFilter("all");
    scheduleSave(next);
    inputRef.current?.focus();
  }, [filter, input, notes, scheduleSave]);

  const toggleNote = useCallback(
    (id: string) => {
      const next = notes.map((note) => (note.id === id ? { ...note, done: !note.done } : note));
      setNotes(next);
      scheduleSave(next);
    },
    [notes, scheduleSave],
  );

  const deleteNote = useCallback(
    (id: string) => {
      const next = notes.filter((note) => note.id !== id);
      setNotes(next);
      scheduleSave(next);
    },
    [notes, scheduleSave],
  );

  const clearDone = useCallback(() => {
    if (!notes.some((note) => note.done)) return;
    const next = notes.filter((note) => !note.done);
    setNotes(next);
    scheduleSave(next);
  }, [notes, scheduleSave]);

  const onInputKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === "Enter") {
      event.preventDefault();
      addNote();
    } else if (event.key === "Escape") {
      setInput("");
      event.currentTarget.blur();
    }
  };

  const visible =
    filter === "active" ? notes.filter((note) => !note.done) : filter === "done" ? notes.filter((note) => note.done) : notes;
  const doneCount = notes.filter((note) => note.done).length;
  const counts: Record<Filter, number> = { all: notes.length, active: notes.length - doneCount, done: doneCount };

  return (
    <div className="app">
      <header className="hero">
        <div className="brand">
          <div className="logo" aria-hidden="true">
            <LogoIcon />
          </div>
          <div>
            <h1>Tauri 速记</h1>
            <p className="subtitle">React 19 · Vite 8 · Tauri 2.12 · Rust 命令</p>
          </div>
        </div>
        <div className="hero-badge">
          <span className="dot" />
          <span>WebKit {info?.webviewVersion ?? "—"}</span>
        </div>
        <button className="ghost update-button" type="button" onClick={() => void checkForUpdates()} disabled={updateState === "checking" || updateState === "downloading"}>
          {updateText}
        </button>
      </header>

      <InfoCards info={info} />

      <main className="panel">
        <div className="composer">
          <input
            id="note-input"
            ref={inputRef}
            type="text"
            maxLength={280}
            autoComplete="off"
            placeholder="记点什么…（回车添加）"
            aria-label="新速记内容"
            value={input}
            onChange={(event) => setInput(event.target.value)}
            onKeyDown={onInputKeyDown}
          />
          <button id="add-btn" className="primary" type="button" onClick={addNote}>
            添加
          </button>
        </div>

        <div className="toolbar">
          <div className="filters" role="tablist" aria-label="筛选">
            {FILTERS.map((item) => (
              <button
                key={item.key}
                className={filter === item.key ? "filter active" : "filter"}
                data-filter={item.key}
                role="tab"
                aria-selected={filter === item.key}
                onClick={() => setFilter(item.key)}
              >
                {item.label} <span>{counts[item.key]}</span>
              </button>
            ))}
          </div>
          <button id="clear-done" className="ghost" type="button" onClick={clearDone}>
            清除已完成
          </button>
        </div>

        {visible.length > 0 ? (
          <ul id="note-list" className="note-list">
            {visible.map((note) => (
              <NoteItem key={note.id} note={note} onToggle={toggleNote} onDelete={deleteNote} />
            ))}
          </ul>
        ) : (
          <div id="empty" className="empty">
            <div className="empty-icon">✳</div>
            <p>{notes.length === 0 ? "还没有速记" : "这个筛选下没有内容"}</p>
            <span>{notes.length === 0 ? "上面输入一条，回车即可保存到本地" : "切换上面的筛选条件看看"}</span>
          </div>
        )}
      </main>

      <footer className="footer">
        <span className={`save-state ${saveState.kind}`}>{saveState.text}</span>
        <span className="data-path" title={info?.dataDir}>
          {info ? `数据目录：${info.dataDir}` : "数据目录：—"}
        </span>
      </footer>
    </div>
  );
}
