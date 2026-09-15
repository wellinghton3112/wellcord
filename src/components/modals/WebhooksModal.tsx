"use client";
import { useState, useEffect, useCallback } from "react";
import { X, Plus, Trash2, Copy, Check, Webhook } from "lucide-react";
import { createClient } from "@/lib/supabase";

const supabase = createClient();

type WebhookEntry = {
  id: string;
  name: string;
  token: string;
  avatar_url: string | null;
  created_at: string;
};

export default function WebhooksModal({ channelId, serverId, onClose }: { channelId: string; serverId: string; onClose: () => void }) {
  const [webhooks, setWebhooks] = useState<WebhookEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [newName, setNewName] = useState("");
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const load = useCallback(async () => {
    const { data } = await supabase
      .from("channel_webhooks")
      .select("*")
      .eq("channel_id", channelId)
      .order("created_at", { ascending: false });
    setWebhooks(data || []);
    setLoading(false);
  }, [channelId]);

  useEffect(() => { load(); }, [load]);

  const create = async () => {
    if (!newName.trim()) return;
    const { data: { user } } = await supabase.auth.getUser();
    const { error } = await supabase.from("channel_webhooks").insert({
      channel_id: channelId,
      name: newName.trim(),
      created_by: user?.id,
    });
    if (error) { alert(error.message); return; }
    setNewName("");
    load();
  };

  const remove = async (id: string) => {
    if (!confirm("Excluir este webhook?")) return;
    await supabase.from("channel_webhooks").delete().eq("id", id);
    load();
  };

  const copyUrl = (token: string, id: string) => {
    const url = `${window.location.origin}/api/webhooks/${token}`;
    navigator.clipboard.writeText(url);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const webhookUrl = (token: string) => `${window.location.origin}/api/webhooks/${token}`;

  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-background rounded-xl w-full max-w-lg max-h-[80vh] flex flex-col" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between p-4 border-b border-zinc-700">
          <div className="flex items-center gap-2">
            <Webhook className="w-5 h-5 text-accent" />
            <h2 className="text-white font-bold text-lg">Webhooks</h2>
          </div>
          <button onClick={onClose} className="text-zinc-400 hover:text-foreground"><X className="w-5 h-5" /></button>
        </div>

        <div className="p-4 border-b border-zinc-700">
          <p className="text-zinc-400 text-sm mb-3">
            Webhooks permitem que serviços externos (GitHub, bots, bots, etc.) enviem mensagens para este canal.
          </p>
          <div className="flex gap-2">
            <input
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && create()}
              placeholder="Nome do webhook (ex: GitHub)"
              className="flex-1 bg-input-bg text-white rounded px-3 py-2 text-sm border border-zinc-700 focus:border-accent outline-none"
            />
            <button onClick={create} className="bg-accent hover:bg-accent-hover text-white px-4 py-2 rounded text-sm font-medium flex items-center gap-1">
              <Plus className="w-4 h-4" /> Criar
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {loading && <p className="text-zinc-400 text-sm">Carregando...</p>}
          {!loading && webhooks.length === 0 && (
            <p className="text-zinc-400 text-sm text-center py-4">Nenhum webhook criado.</p>
          )}
          {webhooks.map((wh) => (
            <div key={wh.id} className="bg-input-bg rounded-lg p-3 border border-zinc-700">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-full bg-accent flex items-center justify-center text-white text-sm font-bold">
                    {wh.name.charAt(0).toUpperCase()}
                  </div>
                  <span className="text-white font-medium">{wh.name}</span>
                </div>
                <div className="flex gap-1">
                  <button
                    onClick={() => copyUrl(wh.token, wh.id)}
                    className="text-zinc-400 hover:text-foreground p-1.5 rounded hover:bg-surface-active"
                    title="Copiar URL"
                  >
                    {copiedId === wh.id ? <Check className="w-4 h-4 text-green-400" /> : <Copy className="w-4 h-4" />}
                  </button>
                  <button
                    onClick={() => remove(wh.id)}
                    className="text-zinc-400 hover:text-red-400 p-1.5 rounded hover:bg-surface-active"
                    title="Excluir"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
              <div className="bg-input-bg rounded px-2 py-1.5 text-xs text-zinc-400 font-mono break-all">
                {webhookUrl(wh.token)}
              </div>
              <p className="text-zinc-600 text-xs mt-1">
                POST com <code className="text-zinc-400">{"{ \"content\": \"mensagem\" }"}</code>
              </p>
            </div>
          ))}
        </div>

        <div className="p-4 border-t border-zinc-700">
          <details className="text-xs text-zinc-400">
            <summary className="cursor-pointer hover:text-zinc-300">Exemplo de uso (curl)</summary>
            <pre className="mt-2 bg-input-bg rounded p-2 overflow-x-auto text-zinc-400">
{`curl -X POST "${webhookUrl("SEU_TOKEN")}" \\
  -H "Content-Type: application/json" \\
  -d '{"content": "Olá do webhook!"}'`}
            </pre>
            <pre className="mt-2 bg-input-bg rounded p-2 overflow-x-auto text-zinc-400">
{`// Com embed
curl -X POST "${webhookUrl("SEU_TOKEN")}" \\
  -H "Content-Type: application/json" \\
  -d '${JSON.stringify({ content: "", embeds: [{ title: "Deploy OK", description: "v1.0 publicado", color: 3066993 }] })}'`}
            </pre>
          </details>
        </div>
      </div>
    </div>
  );
}
