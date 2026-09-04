"use client";
import { Plus } from "lucide-react";
import type { Server } from "@/lib/chat-types";

type Props = {
  servers: Server[];
  selectedServer: string;
  viewMode: "server" | "dm";
  showMobileSidebar: boolean;
  onSelectDM: () => void;
  onSelectServer: (server: Server) => void;
  onEditServer: (server: Server) => void;
  onAddServer: () => void;
};

// Barra fina de servidores (72px). Extraído de page.tsx sem mudança visual.
export default function ServerRail({
  servers, selectedServer, viewMode, showMobileSidebar,
  onSelectDM, onSelectServer, onEditServer, onAddServer,
}: Props) {
  return (
    <div className={`${showMobileSidebar ? "translate-x-0" : "-translate-x-full"} lg:translate-x-0 fixed inset-y-0 left-0 lg:relative z-50 lg:z-auto w-[72px] bg-[#1E1F22] flex lg:flex flex-col items-center py-3 gap-2 shrink-0 overflow-y-auto h-full transition-transform duration-200`}>
      <button onClick={onSelectDM} className={`w-12 h-12 flex items-center justify-center text-xl transition-all ${viewMode === "dm" ? "bg-[#5865F2] text-white rounded-[16px]" : "bg-[#313338] text-zinc-300 rounded-[24px] hover:rounded-[16px] hover:bg-[#5865F2] hover:text-white"}`} title="Mensagens Diretas">💬</button>
      <div className="w-8 h-0.5 bg-[#35363C] rounded-full my-1" />
      {servers.map((server) => (
        <button
          key={server.id}
          onClick={() => onSelectServer(server)}
          onDoubleClick={() => onEditServer(server)}
          onContextMenu={(e) => { e.preventDefault(); onEditServer(server); }}
          className={`w-12 h-12 flex items-center justify-center text-lg font-bold transition-all duration-200 relative group overflow-hidden ${viewMode === "server" && selectedServer === server.id ? "bg-[#5865F2] text-white rounded-[16px]" : "bg-[#313338] text-zinc-300 rounded-[24px] hover:rounded-[16px] hover:bg-[#5865F2] hover:text-white"}`}
          title={`${server.name} (duplo clique para editar)`}
        >
          {server.image_url ? <img src={server.image_url} alt={server.name} className="w-full h-full object-cover" /> : server.icon}
          {viewMode === "server" && selectedServer === server.id && <div className="absolute -left-1 top-1/2 -translate-y-1/2 w-1 h-8 bg-white rounded-r-full" />}
        </button>
      ))}
      <button onClick={onAddServer} className="w-12 h-12 rounded-[24px] hover:rounded-[16px] bg-[#313338] hover:bg-[#23A559] text-[#23A559] hover:text-white flex items-center justify-center transition-all duration-200 group" title="Adicionar servidor">
        <Plus className="w-7 h-7 group-hover:rotate-90 transition-transform duration-200" />
      </button>
    </div>
  );
}
