"use client";
import { useState } from "react";
import { Plus, X, BarChart3 } from "lucide-react";

type Props = {
  onClose: () => void;
  onCreate: (question: string, options: string[]) => Promise<string | null>;
};

// Criar enquete: pergunta + 2 a 8 opções. Novo (feature polls).
export default function PollModal({ onClose, onCreate }: Props) {
  const [question, setQuestion] = useState("");
  const [options, setOptions] = useState<string[]>(["", ""]);
  const [creating, setCreating] = useState(false);

  const setOpt = (i: number, v: string) =>
    setOptions((prev) => prev.map((o, j) => (j === i ? v : o)));
  const addOpt = () => setOptions((prev) => (prev.length >= 8 ? prev : [...prev, ""]));
  const delOpt = (i: number) =>
    setOptions((prev) => (prev.length <= 2 ? prev : prev.filter((_, j) => j !== i)));

  const valid = question.trim() && options.filter((o) => o.trim()).length >= 2;

  const create = async () => {
    if (!valid || creating) return;
    setCreating(true);
    const id = await onCreate(question, options);
    setCreating(false);
    if (id) onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
      <div className="bg-[#313338] rounded-lg w-full max-w-md p-6 shadow-2xl max-h-[85vh] overflow-y-auto">
        <h2 className="text-xl font-bold mb-1 flex items-center gap-2"><BarChart3 className="w-5 h-5" /> Nova enquete</h2>
        <p className="text-sm text-zinc-400 mb-4">Um voto por pessoa (dá pra trocar).</p>
        <input
          value={question}
          onChange={(e) => setQuestion(e.target.value)}
          placeholder="Pergunta: onde almoçar?"
          className="w-full bg-[#2B2D31] border border-[#1E1F22] rounded px-3 py-2 text-white outline-none focus:border-[#5865F2]"
          autoFocus
        />
        <div className="mt-3 space-y-2">
          {options.map((o, i) => (
            <div key={i} className="flex items-center gap-2">
              <input
                value={o}
                onChange={(e) => setOpt(i, e.target.value)}
                placeholder={`Opção ${i + 1}`}
                className="flex-1 bg-[#2B2D31] border border-[#1E1F22] rounded px-3 py-2 text-white text-sm outline-none focus:border-[#5865F2] min-w-0"
              />
              {options.length > 2 && (
                <button onClick={() => delOpt(i)} className="p-1.5 hover:bg-[#DA373C] rounded shrink-0" title="Remover opção">
                  <X className="w-4 h-4 text-zinc-400 hover:text-white" />
                </button>
              )}
            </div>
          ))}
        </div>
        {options.length < 8 && (
          <button onClick={addOpt} className="mt-2 flex items-center gap-1 text-xs text-[#5865F2] hover:underline">
            <Plus className="w-3.5 h-3.5" /> Adicionar opção
          </button>
        )}
        <div className="flex justify-end gap-3 mt-6">
          <button onClick={onClose} className="px-4 py-2 text-sm hover:underline">Cancelar</button>
          <button onClick={create} disabled={!valid || creating} className="px-6 py-2 bg-[#5865F2] hover:bg-[#4752C4] disabled:opacity-50 rounded text-sm font-medium text-white">
            {creating ? "Criando..." : "Criar enquete"}
          </button>
        </div>
      </div>
    </div>
  );
}
