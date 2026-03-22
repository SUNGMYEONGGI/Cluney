"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

type Session = {
  sessionId: string;
  title: string;
  mode: string;
  updatedAt: string;
};

type HomeSidebarProps = {
  /** Called when user clicks "New chat" (only in chat pages) */
  onNewChat?: () => void;
  /** Called when user clicks a history session (only in chat pages) */
  onSelectSession?: (session: Session) => void;
  /** Currently active session ID for highlight (only in chat pages) */
  currentSessionId?: string;
  /** Current mode for Active/Passive highlight */
  currentMode?: "active" | "passive";
};

function getDateLabel(dateStr: string): string {
  const date = new Date(dateStr);
  const now = new Date();

  const toKSTDateStr = (d: Date) => {
    const kst = new Date(d.getTime() + 9 * 3600_000);
    return kst.toISOString().slice(0, 10);
  };

  const todayStr = toKSTDateStr(now);
  const dateOnlyStr = toKSTDateStr(date);

  if (dateOnlyStr === todayStr) return "오늘";

  const yesterday = new Date(now.getTime() - 86_400_000);
  if (dateOnlyStr === toKSTDateStr(yesterday)) return "어제";

  const weekAgo = new Date(now.getTime() - 7 * 86_400_000);
  if (date > weekAgo) return "이번주";

  const [y, m] = dateOnlyStr.split("-");
  return `${y}-${m}`;
}

export function HomeSidebar({
  onNewChat,
  onSelectSession,
  currentSessionId,
  currentMode,
}: HomeSidebarProps) {
  const [sessions, setSessions] = useState<Session[]>([]);
  const router = useRouter();

  const loadSessions = useCallback(async () => {
    try {
      const res = await fetch("/api/sessions");
      if (res.ok) {
        const data = await res.json();
        setSessions(data.sessions || []);
      }
    } catch (e) {
      console.error(e);
    }
  }, []);

  useEffect(() => {
    loadSessions();
  }, [loadSessions]);

  // Group by date
  const grouped = sessions.reduce<Record<string, Session[]>>((acc, s) => {
    const label = getDateLabel(s.updatedAt);
    if (!acc[label]) acc[label] = [];
    acc[label].push(s);
    return acc;
  }, {});

  const dateOrder = Object.keys(grouped).sort((a, b) => {
    const priority = (l: string) =>
      l === "오늘" ? 0 : l === "어제" ? 1 : l === "이번주" ? 2 : 3;
    const pa = priority(a);
    const pb = priority(b);
    if (pa !== pb) return pa - pb;
    return b.localeCompare(a);
  });

  const handleSessionClick = (session: Session) => {
    if (onSelectSession) {
      // Inside a chat page — use callback
      onSelectSession(session);
    } else {
      // From home — navigate to the right mode page
      router.push(`/${session.mode}?session=${session.sessionId}`);
    }
  };

  return (
    <aside className="hidden md:flex w-[240px] flex-shrink-0 flex-col h-screen bg-background border-r border-border">
      {/* Header */}
      <div className="flex items-center gap-2 px-4 pt-5 pb-3">
        <svg
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          className="w-4 h-4 text-muted-foreground"
        >
          <circle cx="11" cy="11" r="8" />
          <path d="m21 21-4.35-4.35" />
        </svg>
        <span className="text-sm font-semibold text-foreground">최근 대화</span>

        {/* New chat button (chat pages only) */}
        {onNewChat && (
          <button
            onClick={onNewChat}
            className="ml-auto flex items-center justify-center w-6 h-6 rounded-md hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
            title="새 채팅"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              className="w-4 h-4"
            >
              <path d="M12 5v14M5 12h14" />
            </svg>
          </button>
        )}
      </div>

      {/* Session history */}
      <div className="flex-1 overflow-y-auto px-2 py-1 space-y-3">
        {sessions.length === 0 && (
          <p className="text-xs text-muted-foreground px-2 pt-2">
            대화 기록이 없습니다.
          </p>
        )}

        {dateOrder.map((label) => (
          <div key={label}>
            <div className="flex items-center gap-1 px-2 py-1">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 20 20"
                fill="currentColor"
                className="w-3 h-3 text-muted-foreground"
              >
                <path
                  fillRule="evenodd"
                  d="M5.22 8.22a.75.75 0 0 1 1.06 0L10 11.94l3.72-3.72a.75.75 0 1 1 1.06 1.06l-4.25 4.25a.75.75 0 0 1-1.06 0L5.22 9.28a.75.75 0 0 1 0-1.06Z"
                  clipRule="evenodd"
                />
              </svg>
              <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">
                {label}
              </span>
            </div>

            {grouped[label].map((session) => (
              <button
                key={session.sessionId}
                onClick={() => handleSessionClick(session)}
                className={`w-full text-left text-xs px-3 py-1.5 rounded-md truncate transition-colors ${
                  currentSessionId === session.sessionId
                    ? "bg-accent/50 text-foreground"
                    : "text-foreground/70 hover:bg-accent/40 hover:text-foreground"
                }`}
                title={session.title}
              >
                {session.title}
              </button>
            ))}
          </div>
        ))}
      </div>

      {/* Bottom section */}
      <div className="px-3 pb-4 space-y-2 border-t border-border/50 pt-3">
        {/* User profile */}
        <div className="flex items-center gap-2 px-2 py-2 rounded-lg hover:bg-muted/50 cursor-pointer transition-colors">
          <div className="w-7 h-7 rounded-full bg-primary/20 border border-border flex items-center justify-center flex-shrink-0">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              fill="currentColor"
              className="w-4 h-4 text-primary/70"
            >
              <path
                fillRule="evenodd"
                d="M7.5 6a4.5 4.5 0 119 0 4.5 4.5 0 01-9 0zM3.751 20.105a8.25 8.25 0 0116.498 0 .75.75 0 01-.437.695A18.683 18.683 0 0112 22.5c-2.786 0-5.433-.608-7.812-1.7a.75.75 0 01-.437-.695z"
                clipRule="evenodd"
              />
            </svg>
          </div>
          <span className="text-xs font-medium text-foreground truncate">
            Myeonggi Seong
          </span>
        </div>
      </div>
    </aside>
  );
}
