import { useRef, useState, useEffect } from "react";
import Image from "next/image";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { ThreadMessage, ThreadSummary } from "./types";

interface ThreadViewProps {
  messages: ThreadMessage[];
  loading: boolean;
  selectedThread: ThreadSummary | null;
  sessionId: string;
  onMessageSent: () => void;
}

export function ThreadView({
  messages,
  loading,
  selectedThread,
  sessionId,
  onMessageSent,
}: ThreadViewProps) {
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
    <div className="relative flex-1 h-full">
      <div className="flex flex-col gap-2 p-4 pb-24 h-full overflow-y-auto">
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
        className="absolute bottom-0 left-0 right-0 bg-white dark:bg-zinc-900 border-t border-zinc-200 dark:border-zinc-800 flex items-center gap-2 p-4 z-10 w-full"
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
    </div>
  );
}
