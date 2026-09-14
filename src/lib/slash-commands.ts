export type SlashCommand = {
  name: string;
  description: string;
  usage: string;
  execute: (args: string, user: { username?: string } | null) => string | null;
};

export const SLASH_COMMANDS: SlashCommand[] = [
  {
    name: "help",
    description: "Mostra todos os comandos disponíveis",
    usage: "/help",
    execute: () => null,
  },
  {
    name: "me",
    description: "Ação em primeira pessoa",
    usage: "/me <ação>",
    execute: (args, user) => {
      if (!args.trim()) return null;
      return `*${user?.username || "Alguém"} ${args.trim()}*`;
    },
  },
  {
    name: "shrug",
    description: "Envia ¯\\_(ツ)_/¯",
    usage: "/shrug [mensagem]",
    execute: (args) => {
      return args.trim() ? `${args.trim()} ¯\\_(ツ)_/¯` : "¯\\_(ツ)_/¯";
    },
  },
  {
    name: "tableflip",
    description: "Envia (╯°□°)╯︵ ┻━┻",
    usage: "/tableflip",
    execute: () => "(╯°□°)╯︵ ┻━┻",
  },
  {
    name: "unflip",
    description: "Envia ┬─┬ノ( º _ ºノ)",
    usage: "/unflip",
    execute: () => "┬─┬ノ( º _ ºノ)",
  },
  {
    name: "spoiler",
    description: "Marca mensagem como spoiler",
    usage: "/spoiler <mensagem>",
    execute: (args) => {
      if (!args.trim()) return null;
      return `||${args.trim()}||`;
    },
  },
  {
    name: "code",
    description: "Envia código em bloco",
    usage: "/code <código>",
    execute: (args) => {
      if (!args.trim()) return null;
      return "```\n" + args.trim() + "\n```";
    },
  },
  {
    name: "announce",
    description: "Mensagem de anúncio (negrito + itálico)",
    usage: "/announce <mensagem>",
    execute: (args) => {
      if (!args.trim()) return null;
      return `***${args.trim()}***`;
    },
  },
];

export function parseSlashCommand(input: string, user: { username?: string } | null): { isCommand: boolean; content: string | null; showHelp: boolean } {
  const trimmed = input.trim();
  if (!trimmed.startsWith("/")) return { isCommand: false, content: null, showHelp: false };

  const spaceIdx = trimmed.indexOf(" ");
  const cmdName = spaceIdx === -1 ? trimmed.slice(1).toLowerCase() : trimmed.slice(1, spaceIdx).toLowerCase();
  const args = spaceIdx === -1 ? "" : trimmed.slice(spaceIdx + 1);

  const cmd = SLASH_COMMANDS.find((c) => c.name === cmdName);
  if (!cmd) return { isCommand: true, content: null, showHelp: false };

  if (cmdName === "help") return { isCommand: true, content: null, showHelp: true };

  const content = cmd.execute(args, user);
  return { isCommand: true, content, showHelp: false };
}

export function getCommandSuggestions(query: string): SlashCommand[] {
  if (!query.startsWith("/")) return [];
  const term = query.slice(1).toLowerCase();
  return SLASH_COMMANDS.filter((c) => c.name.includes(term));
}
