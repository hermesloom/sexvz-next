import { useEffect, useState } from "react";
import Image from "next/image";
import { Switch } from "@/components/ui/switch";
import { ProfilePanel } from "./profile-panel";
import { ThreadView } from "./thread-view";
import { OnlineUsersGrid } from "./online-users-grid";
import {
  OnlineUser,
  ThreadSummary,
  ThreadMessage,
  ViewType,
  ViewTypeValue,
} from "./types";
import { ChatHeader } from "./chat-header";

function useSessionId() {
  const [sessionId, setSessionId] = useState<string | null>(null);
  useEffect(() => {
    setSessionId(localStorage.getItem("sessionId"));
  }, []);
  return [
    sessionId,
    (id: string) => {
      localStorage.setItem("sessionId", id);
      setSessionId(id);
    },
  ] as const;
}

export function ChatMain({ sessionId }: { sessionId: string }) {
  const [onlineUsers, setOnlineUsers] = useState<OnlineUser[]>([]);
  const [threads, setThreads] = useState<ThreadSummary[]>([]);
  const [selectedChat, setSelectedChat] = useState<ThreadSummary | null>(null);
  const [messages, setMessages] = useState<ThreadMessage[]>([]);
  const [loadingThread, setLoadingThread] = useState(false);
  const [loadingThreads, setLoadingThreads] = useState(true);
  const [loadingOnlineUsers, setLoadingOnlineUsers] = useState(true);
  const [hideUsersWithThread, setHideUsersWithThread] = useState(false);
  const [view, setView] = useState<ViewTypeValue>(ViewType.CHAT);

  useEffect(() => {
    setLoadingOnlineUsers(true);
    fetch("/api/online-users", { headers: { "x-session-id": sessionId } })
      .then((r) => r.json())
      .then(setOnlineUsers)
      .finally(() => setLoadingOnlineUsers(false));
    setLoadingThreads(true);
    fetch("/api/threads", { headers: { "x-session-id": sessionId } })
      .then((r) => r.json())
      .then(setThreads)
      .finally(() => setLoadingThreads(false));
  }, [sessionId]);

  // Polling for online users
  useEffect(() => {
    if (!sessionId) return;
    const interval = setInterval(() => {
      fetch("/api/online-users", { headers: { "x-session-id": sessionId } })
        .then((r) => r.json())
        .then(setOnlineUsers);
    }, 5000);
    return () => clearInterval(interval);
  }, [sessionId]);

  useEffect(() => {
    if (!selectedChat) return;
    setLoadingThread(true);
    fetch(
      `/api/thread?dialogId=${selectedChat.dialogId}&msgId=${selectedChat.id}`,
      { headers: { "x-session-id": sessionId } }
    )
      .then((r) => r.json())
      .then(setMessages)
      .finally(() => setLoadingThread(false));
  }, [selectedChat, sessionId]);

  // Polling for thread updates
  useEffect(() => {
    if (!selectedChat) return;
    const interval = setInterval(() => {
      fetch(
        `/api/thread?dialogId=${selectedChat.dialogId}&msgId=${selectedChat.id}`,
        { headers: { "x-session-id": sessionId } }
      )
        .then((r) => r.json())
        .then(setMessages);
    }, 2000);
    return () => clearInterval(interval);
  }, [selectedChat, sessionId]);

  // Compute set of user ids with threads
  const threadUserIds = new Set(threads.map((t) => t.user.id));
  const onlineUserIds = new Set(onlineUsers.map((u) => u.id));
  const filteredOnlineUsers = hideUsersWithThread
    ? onlineUsers.filter((u) => !threadUserIds.has(u.id))
    : onlineUsers;

  function handleLogout() {
    localStorage.removeItem("sessionId");
    window.location.reload();
  }

  return (
    <div className="flex flex-col h-screen w-screen overflow-hidden">
      <ChatHeader view={view} setView={setView} onLogout={handleLogout} />
      {view === ViewType.CHAT ? (
        <div className="flex flex-1 overflow-hidden">
          {/* Chats */}
          <div
            className={`w-80 flex-shrink-0 h-full overflow-y-auto border-r border-zinc-200 dark:border-zinc-800 ${
              loadingThreads
                ? "bg-white dark:bg-zinc-900"
                : "bg-zinc-50 dark:bg-zinc-950"
            }`}
          >
            <div className="p-2 h-full flex flex-col">
              <h2 className="font-semibold text-lg mb-2">Chats</h2>
              {loadingThreads ? (
                <div className="flex-1 flex items-center justify-center">
                  <div className="w-8 h-8 border-4 border-zinc-300 border-t-blue-500 rounded-full animate-spin" />
                </div>
              ) : (
                threads.map((t) => {
                  const isContactOnline = onlineUserIds.has(t.user.id);
                  return (
                    <div
                      key={t.dialogId}
                      className={`flex items-center gap-2 p-2 rounded cursor-pointer ${
                        selectedChat?.dialogId === t.dialogId
                          ? "bg-zinc-200 dark:bg-zinc-800"
                          : "hover:bg-zinc-100 dark:hover:bg-zinc-800"
                      }`}
                      onClick={() => setSelectedChat(t)}
                    >
                      <Image
                        src={t.user.imageUrl}
                        alt={t.user.name}
                        className="w-8 h-8 rounded-full object-cover"
                        width={32}
                        height={32}
                      />
                      <div className="flex-1">
                        <div className="font-medium text-sm flex items-center gap-1">
                          {t.user.name}
                          {t.unread && isContactOnline && (
                            <span className="ml-1 w-2 h-2 bg-blue-500 rounded-full inline-block" />
                          )}
                        </div>
                        <div className="text-xs text-zinc-500">{t.subject}</div>
                      </div>
                      <div className="text-xs text-zinc-400">
                        {new Date(t.date).toLocaleDateString()}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
          {/* Profile View */}
          <div className="w-96 flex-shrink-0 h-full overflow-y-auto border-r border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900">
            <div className="p-2 h-full flex flex-col">
              {selectedChat ? (
                <ProfilePanel
                  userId={selectedChat.user.id}
                  sessionId={sessionId}
                />
              ) : (
                <div className="flex-1 flex items-center justify-center text-zinc-400">
                  Select a chat to view profile
                </div>
              )}
            </div>
          </div>
          {/* Thread View */}
          <div className="flex-1 h-full overflow-y-auto bg-white dark:bg-zinc-900">
            {selectedChat ? (
              <ThreadView
                messages={messages}
                loading={loadingThread}
                selectedThread={selectedChat}
                sessionId={sessionId}
                onMessageSent={async () => {
                  setLoadingThread(true);
                  await fetch(
                    `/api/thread?dialogId=${selectedChat.dialogId}&msgId=${selectedChat.id}`,
                    { headers: { "x-session-id": sessionId } }
                  )
                    .then((r) => r.json())
                    .then(setMessages)
                    .finally(() => setLoadingThread(false));
                  setThreads((prevThreads) => {
                    if (!selectedChat) return prevThreads;
                    const now = new Date();
                    const updatedThread = {
                      ...selectedChat,
                      date: now.toISOString(),
                      unread: false,
                    };
                    const filtered = prevThreads.filter(
                      (t) => t.dialogId !== selectedChat.dialogId
                    );
                    return [updatedThread, ...filtered];
                  });
                }}
              />
            ) : (
              <div className="flex flex-1 items-center justify-center text-zinc-400 h-full">
                Select a chat to start messaging
              </div>
            )}
          </div>
        </div>
      ) : (
        // Online Users Grid View
        <div className="flex-1 overflow-auto bg-white dark:bg-zinc-900 p-6">
          <OnlineUsersGrid
            onlineUsers={onlineUsers}
            loading={loadingOnlineUsers}
          />
        </div>
      )}
    </div>
  );
}

export { useSessionId };
