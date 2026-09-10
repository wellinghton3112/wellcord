"use client";

import { useState, useEffect, useRef, useMemo } from "react";
import { Menu, Users, Bell, X } from "lucide-react";
import { createClient } from "@/lib/supabase";
import { APP_VERSION } from "@/lib/version";
import MembersSidebar from "@/components/MembersSidebar";
import ServerRail from "@/components/ServerRail";
import ChannelSidebar from "@/components/ChannelSidebar";
import ChatArea from "@/components/ChatArea";
import UsernameModal from "@/components/modals/UsernameModal";
import ServerModal from "@/components/modals/ServerModal";
import NewDMModal from "@/components/modals/NewDMModal";
import ChannelModal from "@/components/modals/ChannelModal";
import JoinModal from "@/components/modals/JoinModal";
import MembersModal from "@/components/modals/MembersModal";
import PinsModal from "@/components/modals/PinsModal";
import PollModal from "@/components/modals/PollModal";
import RolesModal from "@/components/modals/RolesModal";
import ProfileCard, { type CardProfile } from "@/components/ProfileCard";
import { useInvites } from "@/hooks/useInvites";
import { useFriends } from "@/hooks/useFriends";
import { useActiveNow } from "@/hooks/useActiveNow";
import { useServerManager } from "@/hooks/useServerManager";
import { useRoles } from "@/hooks/useRoles";
import Toaster from "@/components/Toaster";
import { toast as uiToast } from "@/lib/ui";
import { VoiceProvider } from "@/context/VoiceContext";
import { useRouter } from "next/navigation";
import { useAuth } from "@/hooks/useAuth";
import { usePresence } from "@/hooks/usePresence";
import { useServers } from "@/hooks/useServers";
import { useChannelMessages } from "@/hooks/useChannelMessages";
import { useDMs } from "@/hooks/useDMs";
import { useServerActions } from "@/hooks/useServerActions";
import { useTyping } from "@/hooks/useTyping";
import { useNotify } from "@/hooks/useNotify";
import { useChannelUnread } from "@/hooks/useChannelUnread";
import { usePins } from "@/hooks/usePins";
import { usePolls } from "@/hooks/usePolls";

export default function DiscordClone() {
  const supabase = useMemo(() => createClient(), []);
  const router = useRouter();
  const { user, username, setUsername, avatar, setAvatar, bio, setBio, statusText, setStatusText } = useAuth(supabase);
  const {
    servers,
    selectedServer, setSelectedServer,
    selectedChannel, setSelectedChannel,
    currentServer, currentChannel,
    loading, connected, reload,
  } = useServers(supabase, user);
  const { channelMessages, input, setInput, handleSend, editMessage, deleteMessage, reactions, toggleReaction, replyTo, setReplyTo, pendingFile, setPendingFile, uploading, attachFile, hasMore, loadingOlder, loadOlder } = useChannelMessages(supabase, user, username, selectedChannel, currentServer?.id, avatar);
  const chTyping = useTyping(supabase, user, username, selectedChannel ? `ch-${selectedChannel}` : null);

  const sendChannel = () => { chTyping.notifyStop(); handleSend(); };
  const typeChannel = (v: string) => { setInput(v); if (v) chTyping.notifyTyping(); else chTyping.notifyStop(); };
  const { redeemInvite } = useInvites(supabase, user);

  const joinVoiceChannel = (serverId: string, channelId: string) => {
    setViewMode("server");
    setSelectedServer(serverId);
    setSelectedChannel(channelId);
    setShowMobileSidebar(false);
  };
  const friends = useFriends(supabase, user);
  const { active } = useActiveNow(supabase, user, friends.friends.map((f) => f.user_id));
  const [showMembersModal, setShowMembersModal] = useState(false);
  const serverMgr = useServerManager(supabase, currentServer?.id, currentServer?.owner_id);
  const roles = useRoles(supabase, currentServer?.id);
  const isOwner = !currentServer?.owner_id || currentServer?.owner_id === user?.id;
  const { pins, pinnedIds, canPin, togglePin } = usePins(supabase, user, selectedChannel, isOwner);
  const [showPinsModal, setShowPinsModal] = useState(false);
  const { polls, createPoll, toggleVote, deletePoll } = usePolls(supabase, user, username, selectedChannel);
  const [showPollModal, setShowPollModal] = useState(false);
  const [showRolesModal, setShowRolesModal] = useState(false);

  const jumpToMessage = async (id: string) => {
    setShowPinsModal(false);
    for (let i = 0; i < 5; i++) {
      if (document.getElementById(`msg-${id}`)) break;
      const got = await loadOlder();
      if (!got) break;
      await new Promise((r) => setTimeout(r, 150));
    }
    setTimeout(() => document.getElementById(`msg-${id}`)?.scrollIntoView({ behavior: "smooth", block: "center" }), 100);
  };
  const [showJoinModal, setShowJoinModal] = useState(false);
  const [joinCode, setJoinCode] = useState("");
  const [joining, setJoining] = useState(false);
  const pendingServer = useRef<string | null>(null);
  const [showUsernameModal, setShowUsernameModal] = useState(false);
  const [showCreateChannelModal, setShowCreateChannelModal] = useState(false);
  const [showCreateServerModal, setShowCreateServerModal] = useState(false);
  const {
    newChannelName, setNewChannelName, newChannelType, setNewChannelType,
    newChannelIcon, setNewChannelIcon, newChannelImage, setNewChannelImage,
    newChannelPreview, setNewChannelPreview, creatingChannel,
    newServerName, setNewServerName, newServerIcon, setNewServerIcon,
    newServerImage, setNewServerImage, newServerPreview, setNewServerPreview,
    creatingServer, editingServer,
    openCreateServer, openEditServer, handleServerSave,
    deleteServer, leaveServer, deleteChannel, createChannel, handleCreateChannel,
  } = useServerActions(supabase, user?.id, servers, currentServer, selectedChannel, setSelectedServer, setSelectedChannel, setShowCreateServerModal, setShowCreateChannelModal);
  const { status, setStatus, onlineMembers, allProfiles } = usePresence(supabase, user, username, avatar);
  const [showStatusMenu, setShowStatusMenu] = useState(false);
  const [viewMode, setViewMode] = useState<"server" | "dm">("server");
  const [showNewDMModal, setShowNewDMModal] = useState(false);
  const {
    dmConversations, selectedDM, setSelectedDM,
    dmMessages, dmInput, setDmInput, handleDMSend, editDMMessage, deleteDMMessage,
    dmReactions, toggleDMReaction, unread,
    dmReplyTo, setDmReplyTo,
    pendingDmFile, setPendingDmFile, uploadingDm, attachDmFile,
    dmHasMore, dmLoadingOlder, loadOlderDM,
    newDMUsername, setNewDMUsername, creatingDM, createDM, startDMWith,
  } = useDMs(supabase, user, username, viewMode, setViewMode, setShowNewDMModal);
  const dmTyping = useTyping(supabase, user, username, selectedDM ? `dm-${selectedDM}` : null);

  const sendDM = () => { dmTyping.notifyStop(); handleDMSend(); };
  const typeDM = (v: string) => { setDmInput(v); if (v) dmTyping.notifyTyping(); else dmTyping.notifyStop(); };

  // Notificações (menções + DMs): toast clicável que navega
  const { toast, dismiss } = useNotify(supabase, user);

  const openToastRef = (ref: { kind: string; serverId?: string; channelId?: string; conversationId?: string } | null) => {
    if (!ref) return;
    if (ref.kind === "dm" && ref.conversationId) {
      setViewMode("dm");
      setSelectedDM(ref.conversationId);
    } else if (ref.kind === "channel" && ref.serverId && ref.channelId) {
      setViewMode("server");
      setSelectedServer(ref.serverId);
      setSelectedChannel(ref.channelId);
    }
  };

  // Clique no toast NATIVO do Windows (app em 2º plano)
  useEffect(() => {
    if (window.wellcord?.notify) {
      return window.wellcord.notify.onClick((ref) => openToastRef(ref));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  const { channelUnread } = useChannelUnread(supabase, user, selectedChannel, viewMode);
  const unreadByServer: Record<string, number> = {};
  for (const s of servers) {
    const total = s.channels.reduce((acc, c) => acc + (channelUnread[c.id] || 0), 0);
    if (total > 0) unreadByServer[s.id] = total;
  }

  const openToast = () => {
    if (!toast) return;
    if (toast.kind === "dm" && toast.conversationId) {
      setViewMode("dm");
      setSelectedDM(toast.conversationId);
    } else if (toast.kind === "channel" && toast.serverId && toast.channelId) {
      setViewMode("server");
      setSelectedServer(toast.serverId);
      setSelectedChannel(toast.channelId);
    }
    dismiss();
  };
  const [showMobileSidebar, setShowMobileSidebar] = useState(false);
  const [showMobileMembers, setShowMobileMembers] = useState(false);

  // Se veio do email com ?code=..., troca por sessão
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const code = params.get("code");
    if (code) {
      supabase.auth.exchangeCodeForSession(code).then(() => {
        window.history.replaceState({}, "", window.location.pathname);
        window.location.reload();
      });
    }
  }, []);

  // Scroll automático mora no ChatArea (só desce se já estou no fim)

  // Convite via link (?server=ID): seleciona após a lista carregar
  useEffect(() => {
    const sid = pendingServer.current || new URLSearchParams(window.location.search).get("server");
    if (sid && servers.some((s) => s.id === sid)) {
      pendingServer.current = null;
      setViewMode("server");
      setSelectedServer(sid);
      const srv = servers.find((s) => s.id === sid);
      if (srv?.channels[0]) setSelectedChannel(srv.channels[0].id);
      window.history.replaceState({}, "", window.location.pathname);
    }
  }, [servers]);

  const openInviteModal = () => {
    if (!currentServer) return;
    setShowMembersModal(true);
  };

  const joinWithCode = async () => {
    if (!joinCode.trim()) return;
    setJoining(true);
    const sid = await redeemInvite(joinCode);
    setJoining(false);
    if (sid) {
      setShowJoinModal(false);
      setJoinCode("");
      pendingServer.current = sid;
      setViewMode("server");
      reload();
    }
  };

  useEffect(() => { setShowMobileSidebar(false); }, [selectedChannel, selectedDM]);

  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [avatarRemoved, setAvatarRemoved] = useState(false);
  const [savingProfile, setSavingProfile] = useState(false);
  const [viewProfile, setViewProfile] = useState<CardProfile | null>(null);

  const openProfile = async (id: string) => {
    const { data } = await supabase.from("profiles").select("id, username, avatar, color, bio, status_text, created_at").eq("id", id).single();
    if (data) {
      setViewProfile({
        id: data.id,
        username: data.username,
        avatar: data.avatar || "😎",
        color: data.color || "#5865F2",
        bio: data.bio || "",
        status_text: data.status_text || "",
        created_at: data.created_at,
      });
    }
  };

  const profileStatus = (id: string) =>
    onlineMembers.find((m) => m.id === id)?.status || "offline";

  const dmFromCard = async () => {
    if (!viewProfile) return;
    const id = viewProfile.id;
    setViewProfile(null);
    await startDMWith(id);
  };

  const saveProfile = async () => {
    if (!user) return;
    setSavingProfile(true);
    try {
      let avatarUrl: string | null = avatarRemoved ? "😎" : avatar;
      if (avatarFile) {
        const safe = avatarFile.name.replace(/[^a-zA-Z0-9._-]/g, "_");
        const path = `${user.id}/${Date.now()}-${safe}`;
        const { error: upErr } = await supabase.storage.from("avatars").upload(path, avatarFile);
        if (upErr) throw upErr;
        const { data } = supabase.storage.from("avatars").getPublicUrl(path);
        avatarUrl = data.publicUrl;
      }
      await supabase.from("profiles").update({ username, avatar: avatarUrl, bio, status_text: statusText }).eq("id", user.id);
      setAvatar(avatarUrl || "😎");
      setAvatarFile(null);
      setAvatarRemoved(false);
      setShowUsernameModal(false);
    } catch (e: any) {
      uiToast("Erro ao salvar perfil: " + (e?.message || e));
    } finally {
      setSavingProfile(false);
    }
  };

  const signOut = async () => { await supabase.auth.signOut(); router.push("/login"); };

  if (loading) {
    return <div className="h-screen w-screen bg-[#313338] flex items-center justify-center text-zinc-300">Carregando seu Discord... ⏳ {APP_VERSION}</div>;
  }

  return (
    <VoiceProvider>
    <div className="h-screen w-screen bg-[#313338] text-zinc-100 overflow-hidden">

      {showMobileSidebar && <div className="fixed inset-0 bg-black/60 z-40 lg:hidden" onClick={() => setShowMobileSidebar(false)} />}
      {showMobileMembers && <div className="fixed inset-0 bg-black/60 z-40 lg:hidden" onClick={() => setShowMobileMembers(false)} />}

      {!showMobileSidebar && (
        <button onClick={() => setShowMobileSidebar(true)} className="fixed top-3 left-3 z-30 lg:hidden p-3 bg-[#5865F2] hover:bg-[#4752C4] rounded-xl shadow-lg shadow-black/40 active:scale-95 transition-all">
          <Menu className="w-6 h-6 text-white" />
        </button>
      )}

      {!showMobileMembers && (
        <button onClick={() => setShowMobileMembers(true)} className="fixed top-3 right-3 z-30 lg:hidden p-3 bg-[#404249] hover:bg-[#4A4D53] rounded-xl shadow-lg shadow-black/40 active:scale-95 transition-all">
          <Users className="w-6 h-6 text-white" />
        </button>
      )}

      <div className="flex h-full">

      <ServerRail
        servers={servers}
        selectedServer={selectedServer}
        viewMode={viewMode}
        showMobileSidebar={showMobileSidebar}
        onSelectDM={() => setViewMode("dm")}
        onSelectServer={(server) => { setViewMode("server"); setSelectedServer(server.id); setSelectedChannel(server.channels[0]?.id || ""); setShowMobileSidebar(false); }}
        onEditServer={openEditServer}
        onAddServer={openCreateServer}
        onJoinServer={() => setShowJoinModal(true)}
        unreadByServer={unreadByServer}
        unreadDMCount={Object.values(unread).reduce((a, b) => a + b, 0)}
      />

      <ChannelSidebar
        showMobileSidebar={showMobileSidebar}
        setShowMobileSidebar={setShowMobileSidebar}
        viewMode={viewMode}
        dmConversations={dmConversations}
        selectedDM={selectedDM}
        setSelectedDM={setSelectedDM}
        setViewModeDM={() => setViewMode("dm")}
        friendsList={friends.friends}
        incomingRequests={friends.incoming}
        outgoingRequests={friends.outgoing}
        sendingFriend={friends.sending}
        onAddFriend={friends.sendRequest}
        onAcceptFriend={friends.accept}
        onRejectFriend={friends.reject}
        onCancelFriend={friends.cancelOutgoing}
        onRemoveFriend={friends.removeFriend}
        onFriendDM={startDMWith}
        activeVoice={active}
        onJoinVoice={joinVoiceChannel}
        unreadDMs={unread}
        onlineMembers={onlineMembers}
        setNewDMUsername={setNewDMUsername}
        setShowNewDMModal={setShowNewDMModal}
        currentServer={currentServer}
        userId={user?.id}
        selectedChannel={selectedChannel}
        setSelectedChannel={setSelectedChannel}
        connected={connected}
        openEditServer={openEditServer}
        deleteServer={deleteServer}
        createChannel={createChannel}
        deleteChannel={deleteChannel}
        username={username}
        status={status}
        setStatus={setStatus}
        showStatusMenu={showStatusMenu}
        setShowStatusMenu={setShowStatusMenu}
        setShowUsernameModal={setShowUsernameModal}
        onSignOut={signOut}
        userAvatar={avatar}
        onViewProfile={openProfile}
        onOpenMembers={() => setShowMembersModal(true)}
        onOpenRoles={() => setShowRolesModal(true)}
        onLeaveServer={() => leaveServer(user?.id)}
        channelUnread={channelUnread}
      />

      <ChatArea
        viewMode={viewMode}
        setShowMobileSidebar={setShowMobileSidebar}
        dmConversations={dmConversations}
        selectedDM={selectedDM}
        dmMessages={dmMessages}
        dmInput={dmInput}
        setDmInput={typeDM}
        handleDMSend={sendDM}
        onlineMembers={onlineMembers}
        userId={user?.id}
        currentChannel={currentChannel}
        selectedChannel={selectedChannel}
        serverName={currentServer?.name}
        channelMessages={channelMessages}
        input={input}
        setInput={typeChannel}
        handleSend={sendChannel}
        username={username}
        status={status}
        onEditMessage={editMessage}
        onDeleteMessage={deleteMessage}
        onEditDM={editDMMessage}
        onDeleteDM={deleteDMMessage}
        onInvite={openInviteModal}
        reactions={reactions}
        onToggleReaction={toggleReaction}
        dmReactions={dmReactions}
        onToggleDMReaction={toggleDMReaction}
        replyTo={replyTo}
        setReplyTo={setReplyTo}
        dmReplyTo={dmReplyTo}
        setDmReplyTo={setDmReplyTo}
        pendingFile={pendingFile}
        uploading={uploading}
        onAttachFile={attachFile}
        onClearFile={() => setPendingFile(null)}
        pendingDmFile={pendingDmFile}
        uploadingDm={uploadingDm}
        onAttachDmFile={attachDmFile}
        onClearDmFile={() => setPendingDmFile(null)}
        typingChannel={chTyping.typingUsers}
        typingDM={dmTyping.typingUsers}
        onBlurChannel={chTyping.notifyStop}
        onBlurDM={dmTyping.notifyStop}
        mentionCandidates={allProfiles}
        dmMentionCandidates={dmConversations.find((d) => d.id === selectedDM)?.participants || []}
        userAvatar={avatar}
        onViewProfile={openProfile}
        hasMore={hasMore}
        loadingOlder={loadingOlder}
        onLoadOlder={loadOlder}
        dmHasMore={dmHasMore}
        dmLoadingOlder={dmLoadingOlder}
        onLoadOlderDM={loadOlderDM}
        pinnedIds={pinnedIds}
        canPinMsg={canPin}
        onTogglePin={togglePin}
        onOpenPins={() => setShowPinsModal(true)}
        isOwner={isOwner}
        polls={polls}
        onToggleVote={toggleVote}
        onDeletePoll={deletePoll}
        onOpenPollModal={() => setShowPollModal(true)}
      />

      <MembersSidebar
        showMobileMembers={showMobileMembers}
        onlineMembers={onlineMembers}
        allProfiles={allProfiles}
        status={status}
        onViewProfile={openProfile}
        isOwner={isOwner}
        currentUserId={user?.id}
        onKick={(userId) => {
          const member = serverMgr.members.find(m => m.user_id === userId);
          if (member) serverMgr.kick(member, user?.id);
        }}
        onBan={(userId) => {
          const member = serverMgr.members.find(m => m.user_id === userId);
          if (member) serverMgr.ban(member, user?.id);
        }}
      />
      </div>

      {showUsernameModal && (
        <UsernameModal
          userEmail={user?.email}
          username={username}
          setUsername={setUsername}
          avatar={avatarRemoved ? "😎" : avatar}
          onFile={setAvatarFile}
          onRemovePhoto={() => setAvatarRemoved(true)}
          bio={bio}
          setBio={setBio}
          statusText={statusText}
          setStatusText={setStatusText}
          saving={savingProfile}
          onClose={() => { setShowUsernameModal(false); setAvatarFile(null); setAvatarRemoved(false); }}
          onSave={saveProfile}
        />
      )}

      {showCreateServerModal && (
        <ServerModal
          editingServer={editingServer}
          newServerName={newServerName}
          setNewServerName={setNewServerName}
          newServerIcon={newServerIcon}
          setNewServerIcon={setNewServerIcon}
          newServerImage={newServerImage}
          setNewServerImage={setNewServerImage}
          newServerPreview={newServerPreview}
          setNewServerPreview={setNewServerPreview}
          creatingServer={creatingServer}
          onClose={() => setShowCreateServerModal(false)}
          onSave={handleServerSave}
        />
      )}

      {showNewDMModal && (
        <NewDMModal
          newDMUsername={newDMUsername}
          setNewDMUsername={setNewDMUsername}
          creatingDM={creatingDM}
          onClose={() => setShowNewDMModal(false)}
          onCreate={createDM}
        />
      )}

      {showCreateChannelModal && (
        <ChannelModal
          serverName={currentServer?.name}
          newChannelName={newChannelName}
          setNewChannelName={setNewChannelName}
          newChannelType={newChannelType}
          setNewChannelType={setNewChannelType}
          newChannelIcon={newChannelIcon}
          setNewChannelIcon={setNewChannelIcon}
          newChannelImage={newChannelImage}
          setNewChannelImage={setNewChannelImage}
          newChannelPreview={newChannelPreview}
          setNewChannelPreview={setNewChannelPreview}
          creatingChannel={creatingChannel}
          onClose={() => setShowCreateChannelModal(false)}
          onCreate={handleCreateChannel}
        />
      )}
      {showMembersModal && currentServer && (
        <MembersModal
          serverName={currentServer.name}
          isOwner={!currentServer.owner_id || currentServer.owner_id === user?.id}
          userId={user?.id}
          members={serverMgr.members}
          invites={serverMgr.invites}
          onKick={(m) => serverMgr.kick(m, user?.id)}
          onBan={(m) => serverMgr.ban(m, user?.id)}
          onRevoke={serverMgr.revokeInvite}
          onCreateInvite={(maxUses, expiresHours) => serverMgr.createInvite(user?.id, maxUses, expiresHours)}
          onClose={() => setShowMembersModal(false)}
        />
      )}

      {showJoinModal && (
        <JoinModal
          code={joinCode}
          setCode={setJoinCode}
          joining={joining}
          onClose={() => setShowJoinModal(false)}
          onJoin={joinWithCode}
        />
      )}

      {toast && (
        <button
          onClick={openToast}          className="fixed bottom-4 right-4 z-[60] w-80 max-w-[calc(100vw-2rem)] bg-[#2B2D31] border border-[#5865F2] rounded-lg p-3 shadow-2xl flex items-start gap-3 text-left hover:brightness-110 transition"
        >
          <span className="w-9 h-9 rounded-full bg-[#5865F2] flex items-center justify-center shrink-0">
            <Bell className="w-4 h-4 text-white" />
          </span>
          <span className="flex-1 min-w-0">
            <span className="block text-sm font-semibold text-white truncate">
              {toast.kind === "dm" ? `DM de ${toast.from}` : `${toast.from} mencionou você`}
            </span>
            <span className="block text-xs text-zinc-400 truncate">{toast.snippet || "Nova mensagem"}</span>
          </span>
          <span
            onClick={(e) => { e.stopPropagation(); dismiss(); }}
            className="p-1 hover:bg-[#35373C] rounded shrink-0"
          >
            <X className="w-3.5 h-3.5 text-zinc-400" />
          </span>
        </button>
      )}
      {viewProfile && (
        <ProfileCard
          profile={viewProfile}
          status={profileStatus(viewProfile.id)}
          isSelf={viewProfile.id === user?.id}
          onClose={() => setViewProfile(null)}
          onEdit={() => { setViewProfile(null); setShowUsernameModal(true); }}
          onSendDM={dmFromCard}
        />
      )}
      {showPinsModal && (
        <PinsModal
          channelName={currentChannel?.name}
          pins={pins}
          onJump={jumpToMessage}
          onUnpin={togglePin}
          canManage={isOwner}
          onClose={() => setShowPinsModal(false)}
        />
      )}
      {showPollModal && (
        <PollModal
          onClose={() => setShowPollModal(false)}
          onCreate={createPoll}
        />
      )}
      {showRolesModal && (
        <RolesModal
          roles={roles.roles}
          onCreateRole={roles.createRole}
          onUpdateRole={roles.updateRole}
          onDeleteRole={roles.deleteRole}
          onClose={() => setShowRolesModal(false)}
        />
      )}
      <Toaster />
    </div>
    </VoiceProvider>
  );
}
