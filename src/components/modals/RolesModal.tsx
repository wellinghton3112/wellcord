"use client";
import { useState } from "react";
import { X, Plus, Trash2, Shield, Users } from "lucide-react";
import type { ServerRole } from "@/hooks/useRoles";

type Props = {
  roles: ServerRole[];
  onCreateRole: (name: string, color: string) => Promise<ServerRole | null>;
  onUpdateRole: (roleId: string, updates: Partial<Pick<ServerRole, "name" | "color" | "permissions">>) => void;
  onDeleteRole: (roleId: string) => void;
  onClose: () => void;
};

const PERMISSION_LABELS: Record<string, string> = {
  kick: "Remover membros",
  ban: "Banir membros",
  manage_messages: "Gerenciar mensagens",
  manage_channels: "Gerenciar canais",
  manage_roles: "Gerenciar cargos",
};

const PRESET_COLORS = ["#F47B67", "#F8A532", "#FAE684", "#57F287", "#5865F2", "#EB459E", "#9B59B6", "#99AAB5"];

export default function RolesModal({ roles, onCreateRole, onUpdateRole, onDeleteRole, onClose }: Props) {
  const [newName, setNewName] = useState("");
  const [newColor, setNewColor] = useState("#5865F2");
  const [editingId, setEditingId] = useState<string | null>(null);

  const handleCreate = async () => {
    if (!newName.trim()) return;
    const role = await onCreateRole(newName, newColor);
    if (role) { setNewName(""); setNewColor("#5865F2"); }
  };

  const togglePerm = (role: ServerRole, perm: string) => {
    onUpdateRole(role.id, {
      permissions: { ...role.permissions, [perm]: !(role.permissions as any)[perm] },
    });
  };

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div className="bg-[#313338] rounded-lg w-full max-w-lg p-6 shadow-2xl max-h-[85vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold flex items-center gap-2"><Shield className="w-5 h-5" /> Cargos do Servidor</h2>
          <button onClick={onClose} className="p-1 hover:bg-[#404249] rounded"><X className="w-5 h-5 text-zinc-400" /></button>
        </div>

        {/* Criar novo cargo */}
        <div className="flex gap-2 mb-4">
          <input
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            placeholder="Nome do cargo"
            className="flex-1 bg-[#1E1F22] border border-[#3F4147] rounded px-3 py-2 text-white text-sm outline-none focus:border-[#5865F2]"
          />
          <div className="flex gap-1">
            {PRESET_COLORS.map((c) => (
              <button
                key={c}
                onClick={() => setNewColor(c)}
                className={`w-6 h-6 rounded-full border-2 ${newColor === c ? "border-white" : "border-transparent"}`}
                style={{ background: c }}
              />
            ))}
          </div>
          <button onClick={handleCreate} className="px-4 py-2 bg-[#5865F2] hover:bg-[#4752C4] rounded text-sm font-medium text-white shrink-0 flex items-center gap-1">
            <Plus className="w-4 h-4" /> Criar
          </button>
        </div>

        {/* Lista de cargos */}
        <div className="space-y-3">
          {roles.length === 0 && <p className="text-sm text-zinc-500">Nenhum cargo criado.</p>}
          {roles.map((role) => (
            <div key={role.id} className="bg-[#2B2D31] rounded-lg p-4">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-4 h-4 rounded-full" style={{ background: role.color }} />
                <span className="font-medium text-white">{role.name}</span>
                <span className="text-xs text-zinc-500">{role.position}</span>
                <button onClick={() => onDeleteRole(role.id)} className="ml-auto p-1 hover:bg-[#DA373C] rounded" title="Excluir cargo">
                  <Trash2 className="w-4 h-4 text-zinc-400 hover:text-white" />
                </button>
              </div>
              <div className="grid grid-cols-2 gap-2">
                {Object.entries(PERMISSION_LABELS).map(([key, label]) => (
                  <label key={key} className="flex items-center gap-2 text-sm text-zinc-300 cursor-pointer hover:text-white">
                    <input
                      type="checkbox"
                      checked={(role.permissions as any)[key] || false}
                      onChange={() => togglePerm(role, key)}
                      className="rounded border-[#3F4147] bg-[#1E1F22] text-[#5865F2] focus:ring-[#5865F2]"
                    />
                    {label}
                  </label>
                ))}
              </div>
            </div>
          ))}
        </div>

        <div className="flex justify-end gap-3 mt-6">
          <button onClick={onClose} className="px-6 py-2 bg-[#404249] hover:bg-[#4A4D53] rounded text-sm font-medium text-white">Fechar</button>
        </div>
      </div>
    </div>
  );
}
