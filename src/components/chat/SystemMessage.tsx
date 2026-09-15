"use client";
import { LogIn, LogOut, Pin, Hash, Shield, UserPlus, UserX, Settings } from "lucide-react";

export type SystemMessageData = {
  id: string;
  type: "join" | "leave" | "pin" | "channel_create" | "role_assign" | "kick" | "ban";
  username: string;
  target?: string;
  timestamp: string;
};

const ICONS: Record<string, any> = {
  join: LogIn,
  leave: LogOut,
  pin: Pin,
  channel_create: Hash,
  role_assign: Shield,
  kick: UserX,
  ban: UserX,
};

const LABELS: Record<string, string> = {
  join: "entrou no canal",
  leave: "saiu do canal",
  pin: "fixou uma mensagem",
  channel_create: "criou o canal",
  role_assign: "recebeu o cargo",
  kick: "foi expulso do servidor",
  ban: "foi banido do servidor",
};

const COLORS: Record<string, string> = {
  join: "text-success",
  leave: "text-danger",
  pin: "text-[#F0B132]",
  channel_create: "text-accent",
  role_assign: "text-accent",
  kick: "text-danger",
  ban: "text-danger",
};

export function SystemMessage({ data }: { data: SystemMessageData }) {
  const Icon = ICONS[data.type] || Settings;
  const color = COLORS[data.type] || "text-zinc-400";
  const label = LABELS[data.type] || "realizou uma ação";

  return (
    <div className="flex items-center gap-3 px-4 py-1.5 text-sm text-zinc-400 group">
      <div className={`w-10 h-10 rounded-full bg-surface flex items-center justify-center shrink-0 ${color}`}>
        <Icon className="w-4 h-4" />
      </div>
      <div className="flex-1 min-w-0">
        <span className="text-foreground font-medium">{data.username}</span>
        {" "}
        <span className="text-zinc-400">{label}</span>
        {data.target && (
          <>
            {" "}
            <span className="text-zinc-300">{data.target}</span>
          </>
        )}
        <span className="text-zinc-600 text-xs ml-2">{data.timestamp}</span>
      </div>
    </div>
  );
}
