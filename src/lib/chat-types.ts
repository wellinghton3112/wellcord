import { Circle, Moon, MinusCircle, EyeOff } from "lucide-react";

export type Message = {
  id: string;
  user: string;
  user_id?: string;
  avatar: string;
  color: string;
  content: string;
  timestamp: string;
  channelId: string;
  created_at?: string;
};

export type Channel = {
  id: string;
  server_id?: string;
  name: string;
  type: "text" | "voice";
  icon?: string;
  image_url?: string;
};

export type Server = {
  id: string;
  name: string;
  icon: string;
  image_url?: string;
  owner_id?: string | null;
  channels: Channel[];
};

export type DMConversation = {
  id: string;
  participants: { id: string; username: string; avatar: string }[];
  otherUser?: { id: string; username: string; avatar: string };
};

export type DMMessage = {
  id: string;
  conversation_id: string;
  sender_id: string;
  username: string;
  content: string;
  created_at: string;
};

export type PresenceStatus = "online" | "idle" | "dnd" | "invisible";

export type PresenceUser = {
  id: string;
  username: string;
  avatar: string;
  status: PresenceStatus | "offline";
  email?: string;
};

export const statusConfig = {
  online: { label: "Online", color: "bg-[#23A559]", icon: Circle },
  idle: { label: "Ausente", color: "bg-[#F0B132]", icon: Moon },
  dnd: { label: "Não perturbe", color: "bg-[#DA373C]", icon: MinusCircle },
  invisible: { label: "Invisível", color: "bg-zinc-500", icon: EyeOff },
};

export function formatTime(dateStr: string) {
  try {
    const d = new Date(dateStr);
    return "Hoje às " + d.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
  } catch { return dateStr; }
}

export type Reaction = { emoji: string; count: number; mine: boolean };
export type ReactionMap = Record<string, Reaction[]>;

export const QUICK_EMOJIS = ["❤️", "👍", "😂", "😮", "😢", "🔥"];

export function groupReactions(
  rows: { message_id: string; user_id: string; emoji: string }[],
  myId?: string
): ReactionMap {
  const map: ReactionMap = {};
  for (const r of rows) {
    const list = (map[r.message_id] ||= []);
    let g = list.find((x) => x.emoji === r.emoji);
    if (!g) { g = { emoji: r.emoji, count: 0, mine: false }; list.push(g); }
    g.count++;
    if (myId && r.user_id === myId) g.mine = true;
  }
  return map;
}
