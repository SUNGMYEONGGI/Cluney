"use client";

import type { UIMessage } from "ai";
import { useCallback, useState, useEffect, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { ChatPane } from "@/components/chat/ChatPane";
import { ChatSidebar } from "@/components/layout/ChatSidebar";

// UUID Generator fallback
function generateUUID(): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === "x" ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

// Inner component that can safely use useSearchParams
function ChatPageInner({ mode }: { mode: "active" | "passive" }) {
  const searchParams = useSearchParams();
  const sessionParam = searchParams.get("session");
  const problemParam = searchParams.get("problem");

  const [chatMessages, setChatMessages] = useState<UIMessage[]>([]);
  const [sessionId, setSessionId] = useState(() => sessionParam || generateUUID());
  const [sessions, setSessions] = useState<any[]>([]);
  const [initialMessages, setInitialMessages] = useState<UIMessage[]>([]);

  // If ?session= param changes (e.g. user came from sidebar link), load that session
  useEffect(() => {
    if (sessionParam && sessionParam !== sessionId) {
      setSessionId(sessionParam);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sessionParam]);

  const loadSessions = useCallback(async () => {
    try {
      const res = await fetch(`/api/sessions?mode=${mode}`);
      if (res.ok) {
        const data = await res.json();
        setSessions(data.sessions || []);
      }
    } catch (e) {
      console.error(e);
    }
  }, [mode]);

  useEffect(() => {
    if (!sessionId) setSessionId(generateUUID());
    loadSessions();
  }, [sessionId, loadSessions]);

  // When sessionId comes from query param, load its messages
  useEffect(() => {
    if (!sessionParam) return;
    const found = sessions.find((s: any) => s.sessionId === sessionParam);
    if (found) {
      setInitialMessages(found.messages || []);
    }
  }, [sessionParam, sessions]);

  const handleMessagesChange = useCallback((messages: UIMessage[]) => {
    setChatMessages(messages);
  }, []);

  const handleNewChat = () => {
    setChatMessages([]);
    setInitialMessages([]);
    setSessionId(generateUUID());
  };

  const handleSelectSession = (session: any) => {
    setSessionId(session.sessionId);
    setInitialMessages(session.messages || []);
  };

  return (
    <div className="flex h-screen w-full bg-background text-foreground overflow-hidden">
      {/* Shared sidebar - passes callbacks for session manipulation */}
      <ChatSidebar
        problemId={problemParam}
        onNewChat={handleNewChat}
        onSelectSession={handleSelectSession}
        currentSessionId={sessionId}
        currentMode={mode}
      />

      {/* Main area: Full Chat UI */}
      <div className="flex flex-1 flex-col h-full bg-[#F3F4F6] overflow-hidden">
        {sessionId && (
          <ChatPane
            key={sessionId}
            sessionId={sessionId}
            problemId={problemParam}
            initialMessages={initialMessages}
            onMessagesChange={handleMessagesChange}
            initialMode={mode}
          />
        )}
      </div>
    </div>
  );
}

export default function ChatPage({ params }: { params: any }) {
  const [mode, setMode] = useState<"active" | "passive">("active");
  
  // Use React.use() conditionally or unwrap promise inside useEffect if it's a promise,
  // Next 15 pages receive params as a Promise.
  useEffect(() => {
    if (params && typeof params.then === 'function') {
      params.then((resolved: any) => {
        setMode(resolved.mode === "passive" ? "passive" : "active");
      });
    } else if (params) {
      setMode(params.mode === "passive" ? "passive" : "active");
    }
  }, [params]);

  return (
    <Suspense fallback={<div className="flex h-screen items-center justify-center text-muted-foreground text-sm">불러오는 중...</div>}>
      <ChatPageInner mode={mode} />
    </Suspense>
  );
}
