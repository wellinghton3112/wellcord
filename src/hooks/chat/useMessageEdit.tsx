"use client";
import { useState } from "react";
import { X } from "lucide-react";

export function useMessageEdit() {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editDraft, setEditDraft] = useState("");

  const startEdit = (id: string, content: string) => { setEditingId(id); setEditDraft(content); };
  const cancelEdit = () => { setEditingId(null); setEditDraft(""); };
  const saveEdit = (save: (id: string, content: string) => void) => {
    if (editingId && editDraft.trim()) save(editingId, editDraft.trim());
    cancelEdit();
  };

  const EditBox = ({ save }: { save: (id: string, content: string) => void }) => (
    <div className="mt-1 flex items-center gap-2">
      <input
        value={editDraft}
        onChange={(e) => setEditDraft(e.target.value)}
        onKeyDown={(e) => { if (e.key === "Enter") saveEdit(save); if (e.key === "Escape") cancelEdit(); }}
        className="flex-1 bg-[#2B2D31] rounded px-2 py-1 text-[15px] outline-none focus:ring-1 focus:ring-[#5865F2] min-w-0"
        autoFocus
      />
      <button onClick={() => saveEdit(save)} className="text-xs text-[#5865F2] hover:underline shrink-0">Salvar</button>
      <button onClick={cancelEdit} className="p-1 hover:bg-[#2B2D31] rounded shrink-0"><X className="w-3.5 h-3.5 text-zinc-400" /></button>
    </div>
  );

  return { editingId, startEdit, cancelEdit, saveEdit, EditBox };
}
