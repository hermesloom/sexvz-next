"use client";
import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { ChatMain, useSessionId } from "./components/chat/chat-main";

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
