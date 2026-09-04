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
    loading, connected,
  } = useServers(supabase, user);
  const { channelMessages, input, setInput, handleSend } = useChannelMessages(supabase, user, username, selectedChannel);
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
  } = useServerActions(supabase, servers, currentServer, selectedChannel, setSelectedServer, setSelectedChannel, setShowCreateServerModal, setShowCreateChannelModal);
  const { status, setStatus, onlineMembers, allProfiles } = usePresence(supabase, user, username);
  const [showStatusMenu, setShowStatusMenu] = useState(false);
  const [viewMode, setViewMode] = useState<"server" | "dm">("server");
  const [showNewDMModal, setShowNewDMModal] = useState(false);
  const {
    dmConversations, selectedDM, setSelectedDM,
    dmMessages, dmInput, setDmInput, handleDMSend,
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
      />

      <ChannelSidebar
        showMobileSidebar={showMobileSidebar}
        setShowMobileSidebar={setShowMobileSidebar}
        viewMode={viewMode}
        dmConversations={dmConversations}
        selectedDM={selectedDM}
        setSelectedDM={setSelectedDM}
        onlineMembers={onlineMembers}
        setNewDMUsername={setNewDMUsername}
        setShowNewDMModal={setShowNewDMModal}
        currentServer={currentServer}
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
    </div>
    </VoiceProvider>
  );
}
