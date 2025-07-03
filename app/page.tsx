"use client";
import { useEffect, useRef, useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import Image from "next/image";

interface OnlineUser {
  id: string;
  username: string;
  location: string;
  profileUrl: string;
  imageUrl: string;
}

interface ThreadSummary {
  id: string;
  dialogId: string;
  subject: string;
  user: {
    id: string;
    name: string;
    imageUrl: string;
    location: string;
    profileUrl: string;
  };
  date: string;
  unread: boolean;
}

interface ThreadMessage {
  senderId: string;
  senderName: string;
  senderProfileUrl: string;
  senderImageUrl: string;
  date: string;
  message: string;
  images?: string[];
}

interface Profile {
  id: string;
  username: string;
  type: string;
  age?: number;
  location: string;
  orientation?: string;
  alignment?: string;
  groupMemberships: { id: string; name: string }[];
  imageUrl: string;
  writesToTypes: { male: number; female: number; couple: number };
  profileUrl: string;
}

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

export default function ChatApp() {
  const [sessionId, setSessionId] = useSessionId();
  const [loginError, setLoginError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");

  async function handleLogin(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setLoginError(null);
    const res = await fetch("/api/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username, password }),
    });
    if (res.ok) {
      const { sessionId } = await res.json();
      setSessionId(sessionId);
    } else {
      setLoginError("Login failed");
    }
    setLoading(false);
  }

  if (!sessionId) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <form
          onSubmit={handleLogin}
          className="flex flex-col gap-4 p-8 rounded shadow bg-white dark:bg-zinc-900 w-80"
        >
          <h1 className="text-xl font-bold mb-2">sexVZ Login</h1>
          <Input
            placeholder="Username"
            value={username}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
              setUsername(e.target.value)
            }
            required
          />
          <Input
            type="password"
            placeholder="Password"
            value={password}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
              setPassword(e.target.value)
            }
            required
          />
          {loginError && (
            <div className="text-red-500 text-sm">{loginError}</div>
          )}
          <Button type="submit" disabled={loading}>
            {loading ? "Logging in..." : "Login"}
          </Button>
        </form>
      </div>
    );
  }

  return <ChatMain sessionId={sessionId} />;
}

function ChatMain({ sessionId }: { sessionId: string }) {
  const [onlineUsers, setOnlineUsers] = useState<OnlineUser[]>([]);
  const [threads, setThreads] = useState<ThreadSummary[]>([]);
  const [selectedChat, setSelectedChat] = useState<ThreadSummary | null>(null);
  const [messages, setMessages] = useState<ThreadMessage[]>([]);
  const [loadingThread, setLoadingThread] = useState(false);
  const [loadingThreads, setLoadingThreads] = useState(true);
  const [loadingOnlineUsers, setLoadingOnlineUsers] = useState(true);
  const [hideUsersWithThread, setHideUsersWithThread] = useState(false);

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

  return (
    <div className="flex h-screen w-screen overflow-hidden">
      {/* Online Users */}
      <div
        className={`w-64 flex-shrink-0 h-full overflow-y-auto border-r border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900`}
      >
        <div className="p-2 h-full flex flex-col">
          <h2 className="font-semibold text-lg mb-2">Settings</h2>
          <Button
            variant="outline"
            className="mb-4"
            onClick={() => {
              localStorage.removeItem("sessionId");
              window.location.reload();
            }}
          >
            Logout
          </Button>
          <h2 className="font-semibold text-lg mb-2">Online</h2>
          <div className="mb-2 flex items-center gap-2">
            <Switch
              id="toggle-hide-users-with-thread"
              checked={hideUsersWithThread}
              onCheckedChange={setHideUsersWithThread}
            />
            <label
              htmlFor="toggle-hide-users-with-thread"
              className="text-sm select-none cursor-pointer"
            >
              Hide users with thread
            </label>
          </div>
          {loadingOnlineUsers ? (
            <div className="flex-1 flex items-center justify-center">
              <div className="w-8 h-8 border-4 border-zinc-300 border-t-blue-500 rounded-full animate-spin" />
            </div>
          ) : (
            filteredOnlineUsers.map((u) => (
              <div
                key={u.id}
                className="flex items-center gap-2 p-2 rounded hover:bg-zinc-100 dark:hover:bg-zinc-800 cursor-pointer"
              >
                <Image
                  src={u.imageUrl}
                  alt={u.username}
                  className="w-8 h-8 rounded-full object-cover"
                  width={32}
                  height={32}
                />
                <div>
                  <div className="font-medium text-sm">{u.username}</div>
                  <div className="text-xs text-zinc-500">{u.location}</div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
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
            <ProfilePanel userId={selectedChat.user.id} sessionId={sessionId} />
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
  );
}

function ThreadView({
  messages,
  loading,
  selectedThread,
  sessionId,
  onMessageSent,
}: {
  messages: ThreadMessage[];
  loading: boolean;
  selectedThread: ThreadSummary | null;
  sessionId: string;
  onMessageSent: () => void;
}) {
  const bottomRef = useRef<HTMLDivElement>(null);
  const [lightboxImage, setLightboxImage] = useState<string | null>(null);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  useEffect(() => {
    if (bottomRef.current)
      bottomRef.current.scrollIntoView({ behavior: "auto" });
  }, [messages]);
  if (loading)
    return (
      <div className="flex-1 flex items-center justify-center h-full">
        <div className="w-10 h-10 border-4 border-zinc-300 border-t-blue-500 rounded-full animate-spin" />
      </div>
    );
  if (!selectedThread) return null;
  async function handleSend(e: React.FormEvent) {
    e.preventDefault();
    if (!input.trim() || !selectedThread) return;
    setSending(true);
    // Prepare photo string: split as described
    let photo = selectedThread.user.imageUrl;
    if (photo.startsWith("https://sexvz.net/photo/")) {
      photo = photo
        .replace("https://sexvz.net/photo/", "")
        .replace(/\.\w+$/, "")
        .slice(0, -3); // remove "med"
    }
    await fetch("/api/send-message", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-session-id": sessionId,
      },
      body: JSON.stringify({
        dialogId: selectedThread.dialogId,
        text: input,
        name: selectedThread.user.name,
        title: selectedThread.subject,
        photo,
      }),
    });
    setInput("");
    setSending(false);
    onMessageSent();
  }
  return (
    <>
      <div className="flex flex-col gap-2 p-4 pb-20">
        {messages.map((msg, i) => {
          const isMe = msg.senderId !== selectedThread.user.id;
          return (
            <div
              key={i}
              className={`flex ${isMe ? "justify-end" : "justify-start"}`}
            >
              <div
                className={`max-w-[70%] rounded-lg px-4 py-2 shadow text-sm ${
                  isMe
                    ? "bg-blue-500 text-white"
                    : "bg-zinc-100 dark:bg-zinc-800"
                }`}
              >
                <div className="mb-1 flex items-center gap-2">
                  <Image
                    src={msg.senderImageUrl}
                    alt={msg.senderName}
                    className="w-5 h-5 rounded-full object-cover"
                    width={20}
                    height={20}
                  />
                  <span className="font-medium">
                    {isMe ? "Me" : msg.senderName}
                  </span>
                  <span className="text-xs text-zinc-400">
                    {new Date(msg.date).toLocaleTimeString()}
                  </span>
                </div>
                <div>{msg.message}</div>
                {msg.images && msg.images.length > 0 && (
                  <div className="flex gap-2 mt-2">
                    {msg.images.map((img, j) => (
                      <Image
                        key={j}
                        src={img}
                        alt="attachment"
                        className="w-24 h-24 object-cover rounded cursor-pointer hover:brightness-90 transition"
                        width={96}
                        height={96}
                        unoptimized
                        onClick={() => setLightboxImage(img)}
                      />
                    ))}
                  </div>
                )}
              </div>
            </div>
          );
        })}
        <div ref={bottomRef} />
      </div>
      <form
        onSubmit={handleSend}
        className="fixed bottom-0 right-0 left-[calc(16rem+20rem+24rem)] sm:left-[calc(16rem+20rem+24rem)] bg-white dark:bg-zinc-900 border-t border-zinc-200 dark:border-zinc-800 flex items-center gap-2 p-4 z-10"
      >
        <input
          type="text"
          className="flex-1 rounded border border-zinc-300 dark:border-zinc-700 px-3 py-2 text-sm bg-transparent outline-none focus:ring-2 focus:ring-blue-500"
          placeholder="Type a message..."
          value={input}
          onChange={(e) => setInput(e.target.value)}
          disabled={sending}
        />
        <button
          type="submit"
          className="bg-blue-500 text-white rounded px-4 py-2 text-sm font-medium disabled:opacity-50"
          disabled={sending || !input.trim()}
        >
          Send
        </button>
      </form>
      <Dialog
        open={!!lightboxImage}
        onOpenChange={(open) => !open && setLightboxImage(null)}
      >
        <DialogContent className="flex items-center justify-center p-0 bg-transparent shadow-none max-w-[98vw] max-h-[98vh] w-auto h-auto">
          <DialogTitle className="sr-only">Image preview</DialogTitle>
          {lightboxImage && (
            <Image
              src={lightboxImage}
              alt="Enlarged"
              className="w-full h-full max-w-[98vw] max-h-[98vh] object-contain rounded-lg"
              width={384}
              height={256}
            />
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}

function ProfilePanel({
  userId,
  sessionId,
}: {
  userId: string;
  sessionId: string;
}) {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(false);
  useEffect(() => {
    setLoading(true);
    fetch(`/api/profile?id=${userId}`, {
      headers: { "x-session-id": sessionId },
    })
      .then((r) => r.json())
      .then(setProfile)
      .finally(() => setLoading(false));
  }, [userId, sessionId]);
  if (loading)
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-zinc-300 border-t-blue-500 rounded-full animate-spin" />
      </div>
    );
  if (!profile)
    return (
      <div className="flex-1 flex items-center justify-center text-zinc-400">
        No profile found
      </div>
    );
  return <ProfileView profile={profile} />;
}

function ProfileView({ profile }: { profile: Profile }) {
  return (
    <div className="flex flex-col gap-4 p-0">
      <div className="w-full h-64 flex items-center justify-center bg-white">
        <Image
          src={profile.imageUrl}
          alt={profile.username}
          className="max-h-64 w-auto object-contain"
          width={384}
          height={256}
        />
      </div>
      <div className="flex flex-col gap-4 p-4">
        <div className="flex items-center gap-4">
          <div>
            <div className="font-bold text-lg">{profile.username}</div>
            <div className="text-sm text-zinc-500">{profile.location}</div>
            <div className="text-xs text-zinc-400">
              {profile.type}
              {profile.age ? `, ${profile.age}` : ""}
            </div>
          </div>
        </div>
        <div className="text-sm">
          {profile.orientation && <div>Orientation: {profile.orientation}</div>}
          {profile.alignment && <div>Alignment: {profile.alignment}</div>}
        </div>
        <div className="text-sm">
          <div className="font-semibold mb-1">Group Memberships</div>
          <ul className="list-disc list-inside">
            {profile.groupMemberships.map((g) => (
              <li key={g.id}>{g.name}</li>
            ))}
          </ul>
        </div>
        <div className="text-sm">
          <div className="font-semibold mb-1">Writes to types</div>
          <div>Male: {profile.writesToTypes.male}%</div>
          <div>Female: {profile.writesToTypes.female}%</div>
          <div>Couple: {profile.writesToTypes.couple}%</div>
        </div>
        <a
          href={profile.profileUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="text-blue-500 underline text-sm"
        >
          View on sexVZ
        </a>
      </div>
    </div>
  );
}
