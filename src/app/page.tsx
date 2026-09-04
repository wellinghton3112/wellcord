"use client";

import { useState, useEffect, useRef, useMemo } from "react";
import { Menu, Users } from "lucide-react";
import { createClient } from "@/lib/supabase";
import MembersSidebar from "@/components/MembersSidebar";
import ServerRail from "@/components/ServerRail";
import ChannelSidebar from "@/components/ChannelSidebar";
import ChatArea from "@/components/ChatArea";
import UsernameModal from "@/components/modals/UsernameModal";
import ServerModal from "@/components/modals/ServerModal";
import NewDMModal from "@/components/modals/NewDMModal";
import ChannelModal from "@/components/modals/ChannelModal";
import InviteModal from "@/components/modals/InviteModal";
import JoinModal from "@/components/modals/JoinModal";
import { useInvites } from "@/hooks/useInvites";
import { VoiceProvider } from "@/context/VoiceContext";
import { useRouter } from "next/navigation";
import { useAuth } from "@/hooks/useAuth";
import { usePresence } from "@/hooks/usePresence";
import { useServers } from "@/hooks/useServers";
import { useChannelMessages } from "@/hooks/useChannelMessages";
import { useDMs } from "@/hooks/useDMs";
import { useServerActions } from "@/hooks/useServerActions";

export default function DiscordClone() {
  const supabase = useMemo(() => createClient(), []);
  const router = useRouter();
  const { user, username, setUsername } = useAuth(supabase);
  const {
    servers,
    selectedServer, setSelectedServer,
    selectedChannel, setSelectedChannel,
    currentServer, currentChannel,
    loading, connected, reload,
  } = useServers(supabase, user);
  const { channelMessages, input, setInput, handleSend, editMessage, deleteMessage, reactions, toggleReaction } = useChannelMessages(supabase, user, username, selectedChannel);
  const { inviteCode, creatingInvite, openInvite, redeemInvite } = useInvites(supabase, user);
  const [showInviteModal, setShowInviteModal] = useState(false);
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
    deleteServer, deleteChannel, createChannel, handleCreateChannel,
  } = useServerActions(supabase, user?.id, servers, currentServer, selectedChannel, setSelectedServer, setSelectedChannel, setShowCreateServerModal, setShowCreateChannelModal);
  const { status, setStatus, onlineMembers, allProfiles } = usePresence(supabase, user, username);
  const [showStatusMenu, setShowStatusMenu] = useState(false);
  const [viewMode, setViewMode] = useState<"server" | "dm">("server");
  const [showNewDMModal, setShowNewDMModal] = useState(false);
  const {
    dmConversations, selectedDM, setSelectedDM,
    dmMessages, dmInput, setDmInput, handleDMSend, editDMMessage, deleteDMMessage,
    dmReactions, toggleDMReaction, unread,
    newDMUsername, setNewDMUsername, creatingDM, createDM,
  } = useDMs(supabase, user, setViewMode, setShowNewDMModal);
  const [showMobileSidebar, setShowMobileSidebar] = useState(false);
  const [showMobileMembers, setShowMobileMembers] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const dmEndRef = useRef<HTMLDivElement>(null);

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

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [channelMessages]);

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
    setShowInviteModal(true);
    openInvite(currentServer.id);
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

  useEffect(() => { dmEndRef.current?.scrollIntoView({ behavior: "smooth" }); }, [dmMessages]);

  useEffect(() => { setShowMobileSidebar(false); }, [selectedChannel, selectedDM]);

  const saveUsername = async () => {
    if (user) await supabase.from("profiles").update({ username }).eq("id", user.id);
    setShowUsernameModal(false);
  };

  const signOut = async () => { await supabase.auth.signOut(); router.push("/login"); };

  if (loading) {
    return <div className="h-screen w-screen bg-[#313338] flex items-center justify-center text-zinc-300">Carregando seu Discord... ⏳</div>;
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
      />

      <ChannelSidebar
        showMobileSidebar={showMobileSidebar}
        setShowMobileSidebar={setShowMobileSidebar}
        viewMode={viewMode}
        dmConversations={dmConversations}
        selectedDM={selectedDM}
        setSelectedDM={setSelectedDM}
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
      />

      <ChatArea
        viewMode={viewMode}
        setShowMobileSidebar={setShowMobileSidebar}
        dmConversations={dmConversations}
        selectedDM={selectedDM}
        dmMessages={dmMessages}
        dmInput={dmInput}
        setDmInput={setDmInput}
        handleDMSend={handleDMSend}
        dmEndRef={dmEndRef}
        onlineMembers={onlineMembers}
        userId={user?.id}
        currentChannel={currentChannel}
        selectedChannel={selectedChannel}
        channelMessages={channelMessages}
        messagesEndRef={messagesEndRef}
        input={input}
        setInput={setInput}
        handleSend={handleSend}
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
      />

      <MembersSidebar showMobileMembers={showMobileMembers} onlineMembers={onlineMembers} allProfiles={allProfiles} status={status} />
      </div>

      {showUsernameModal && (
        <UsernameModal
          userEmail={user?.email}
          username={username}
          setUsername={setUsername}
          onClose={() => setShowUsernameModal(false)}
          onSave={saveUsername}
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
      {showInviteModal && (
        <InviteModal
          serverName={currentServer?.name}
          code={inviteCode}
          creating={creatingInvite}
          onClose={() => setShowInviteModal(false)}
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
    </div>
    </VoiceProvider>
  );
}
