"use client";
import { useEffect, useReducer } from "react";
import { AlertTriangle, CheckCircle2, Info, X } from "lucide-react";
import { subscribeUi, getToasts, getConfirm, dismissToast, resolveConfirm } from "@/lib/ui";

// Toasts + modal de confirmação globais. Montar uma vez na página.
export default function Toaster() {
  const [, bump] = useReducer((x: number) => x + 1, 0);
  useEffect(() => subscribeUi(bump), []);
  const toasts = getToasts();
  const confirm = getConfirm();

  return (
    <>
      <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-[80] flex flex-col items-center gap-2 pointer-events-none w-full max-w-md px-4">
        {toasts.map((t) => (
          <div
            key={t.id}
            className={`pointer-events-auto w-full flex items-start gap-2.5 rounded-lg px-3.5 py-2.5 shadow-2xl border text-sm animate-[slideUp_.2s_ease-out] ${
              t.kind === "error"
                ? "bg-[#DA373C] text-white border-[#A12828]"
                : t.kind === "success"
                  ? "bg-[#23A559] text-white border-[#1A7F44]"
                  : "bg-[#2B2D31] text-zinc-200 border-[#4A4D53]"
            }`}
          >
            {t.kind === "error" ? <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0" /> : t.kind === "success" ? <CheckCircle2 className="w-4 h-4 mt-0.5 shrink-0" /> : <Info className="w-4 h-4 mt-0.5 shrink-0" />}
            <span className="flex-1 break-words">{t.text}</span>
            <button onClick={() => dismissToast(t.id)} className="p-0.5 hover:bg-black/20 rounded shrink-0"><X className="w-3.5 h-3.5" /></button>
          </div>
        ))}
      </div>
      {confirm && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-[90] p-4">
          <div className="bg-[#313338] rounded-lg w-full max-w-sm p-5 shadow-2xl">
            <p className="text-[15px] text-zinc-100 whitespace-pre-wrap">{confirm.message}</p>
            <div className="flex justify-end gap-2 mt-5">
              <button onClick={() => resolveConfirm(false)} className="px-4 py-2 text-sm text-zinc-300 hover:text-white">Cancelar</button>
              <button
                onClick={() => resolveConfirm(true)}
                className={`px-5 py-2 rounded text-sm font-semibold text-white ${confirm.danger ? "bg-[#DA373C] hover:bg-[#A12828]" : "bg-[#5865F2] hover:bg-[#4752C4]"}`}
              >
                {confirm.confirmLabel}
              </button>
            </div>
          </div>
        </div>
      )}
      <style>{`@keyframes slideUp { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: translateY(0); } }`}</style>
    </>
  );
}
