import type { Note } from "../types";
import { relativeTime } from "../lib/format";

interface NoteItemProps {
  note: Note;
  onToggle: (id: string) => void;
  onDelete: (id: string) => void;
}

export function NoteItem({ note, onToggle, onDelete }: NoteItemProps) {
  return (
    <li className={note.done ? "note done" : "note"}>
      <button
        className="check"
        type="button"
        aria-label={note.done ? "标记为未完成" : "标记为已完成"}
        onClick={() => onToggle(note.id)}
      >
        ✓
      </button>
      <span className="note-text">{note.text}</span>
      <span className="note-meta">{relativeTime(note.createdAt)}</span>
      <button
        className="delete"
        type="button"
        title="删除"
        aria-label="删除这条速记"
        onClick={() => onDelete(note.id)}
      >
        ×
      </button>
    </li>
  );
}
