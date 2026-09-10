# WellCORD

Clone do Discord construído com **Next.js 16 + React 19 + Supabase + WebRTC**. Interface web + aplicação desktop via Electron com auto-atualização.

**Demo ao vivo:** [wellcord.vercel.app](https://wellcord.vercel.app)

---

## Funcionalidades

- **Autenticação** — Login/signup com Supabase Auth (email/senha)
- **Servidores** — Criar, entrar, sair, editar, deletar com politique de ownership
- **Canais** — Texto e voz com CRUD completo
- **DMs** — Mensagens diretas com busca
- **Voz/WebRTC** — Chamadas P2P com TURN, RNNoise (cancelamento de ruído), compartilhamento de tela, seletor de qualidade
- **Amigos** — Sistema de amizade com pedidos aceitar/rejeitar
- **Reações** — Emojis em mensagens (16 opções)
- **Fixados** — Pin/unpin de mensagens
- **Enquetes** — Votação com múltiplas opções
- **Anexos** — Upload de arquivos (imagens/vídeos, 10MB max)
- **Busca** — Full-text search em mensagens
- **Menções** — @username com notificações
- **Typing indicator** — Indicador de "digitando..."
- **Notificações** — Toast e confirmação nativos
- **Desktop** — Electron com tray, PTT, atalhos, notificações nativas, auto-update

---

## Setup

### 1. Variáveis de ambiente

Copie `.env.example` para `.env.local`:

```bash
cp .env.example .env.local
```

Preencha:

```env
NEXT_PUBLIC_SUPABASE_URL=https://seu-projeto.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=sb_publishable_sua_chave

# Opcional — para voz por trás de NAT/firewall
NEXT_PUBLIC_TURN_URLS=turn:standard.relay.metered.ca:80
NEXT_PUBLIC_TURN_USERNAME=seu_usuario
NEXT_PUBLIC_TURN_CREDENTIAL=sua_senha
```

### 2. Banco de dados (Supabase)

No painel do Supabase → SQL Editor, execute os arquivos `.sql` **nesta ordem**:

1. `supabase-schema.sql` — Tabelas base
2. `supabase-auth.sql` — RLS policies (OBRIGATÓRIO rodar logo após o schema)
3. `supabase-profile.sql` — Tabela de profiles
4. `supabase-membership.sql` — Membros e funções de servidor
5. `supabase-membership-fix.sql` — Função `server_has_members()`
6. `supabase-ownership.sql` — Políticas de ownership
7. `supabase-server-icon.sql` — Ícone e banner de servidor
8. `supabase-channel-icon.sql` — Ícone de canal
9. `supabase-dm.sql` — Mensagens diretas
10. `supabase-reactions.sql` — Reações
11. `supabase-pins.sql` — Fixados
12. `supabase-polls.sql` — Enquetes
13. `supabase-chat-files.sql` — Anexos
14. `supabase-mentions.sql` — Menções
15. `supabase-notifications.sql` — Notificações
16. `supabase-channel-reads.sql` — Status de leitura
17. `supabase-voice.sql` — Sessões de voz
18. `supabase-voice-call.sql` — Chamadas de voz
19. `supabase-friends.sql` — Amizades
20. `supabase-replies.sql` — Respostas
21. `supabase-members-manage.sql` — Gerenciamento de membros
22. `supabase-avatars.sql` — Avatares do storage

> ⚠️ **NÃO** execute `supabase-fix.sql` — está obsoleto.

### 3. Desenvolvimento web

```bash
npm install
npm run dev
# Acesse http://localhost:3000
```

### 4. Desenvolvimento desktop (Electron)

```bash
npm run electron:dev
```

### 5. Build desktop (portable)

```bash
npx electron-builder --win --dir
# Output em dist/win-unpacked/
```

### 6. Criar release portable

```bash
node bump-version.js          # Incrementa versão
npm run build                 # Build Next.js
npx electron-builder --win --dir  # Build Electron
# Zip manual da pasta dist/win-unpacked/
# Criar release no GitHub e upload do zip
```

---

## Arquitetura

```
src/
  app/          — Rotas Next.js (page.tsx, login, auth callback)
  components/   — UI React (ChatArea, ChannelSidebar, VoiceChannel, etc.)
  context/      — VoiceContext (WebRTC state)
  hooks/        — Lógica de negócio (useAuth, useDMs, useServers, etc.)
  lib/          — Utilitários (supabase, video, ice, ptt, etc.)
electron/
  main.js       — Processo principal Electron (auto-update, tray, IPC)
  preload.js    — Bridge entre main e renderer
supabase-*.sql  — Migrations do banco de dados
```

---

## Tecnologias

- **Frontend:** Next.js 16, React 19, Tailwind CSS 4
- **Backend:** Supabase (PostgreSQL + Auth + Realtime + Storage)
- **Desktop:** Electron 38, electron-builder
- **Voz:** WebRTC, TURN (Metered), RNNoise (cancelamento de ruído)
- **Deploy:** Vercel (web), GitHub Releases (desktop)

---

## Licença

Projeto privado. Não redistribuir.
