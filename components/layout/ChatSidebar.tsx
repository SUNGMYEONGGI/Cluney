"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

// Extend session type to include problemId
type Session = {
  sessionId: string;
  title: string;
  mode: string;
  updatedAt: string;
  problemId?: string; // New field we will save in logs
};

type ChatSidebarProps = {
  problemId: string | null;
  onNewChat: () => void;
  onSelectSession: (session: Session) => void;
  currentSessionId: string;
  currentMode: "active" | "passive";
};

export function ChatSidebar({
  problemId,
  onNewChat,
  onSelectSession,
  currentSessionId,
  currentMode,
}: ChatSidebarProps) {
  const [sessions, setSessions] = useState<Session[]>([]);
  const [isHoveringImage, setIsHoveringImage] = useState(false);
  const router = useRouter();

  // Load problem image URL
  const [problemImageUrl, setProblemImageUrl] = useState<string | null>(null);

  useEffect(() => {
    if (problemId) {
      setProblemImageUrl(`/api/image/${problemId}.png`);
    } else {
      setProblemImageUrl(null);
    }
  }, [problemId]);

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

  // Filter sessions by problemId
  const problemSessions = sessions.filter((s) => s.problemId === problemId || !s.problemId); // Temporary fallback until logs have problemId

  return (
    <>
      <aside className="hidden md:flex w-[260px] flex-shrink-0 flex-col h-screen bg-background border-r border-border">
        {/* Top Header */}
        <div className="flex items-center justify-between px-4 pt-5 pb-3">
          <div className="flex items-center gap-2">
            <Link href="/" className="hover:bg-muted p-1 rounded-md transition-colors text-muted-foreground hover:text-foreground">
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
                <path fillRule="evenodd" d="M9.205 16.205a.75.75 0 0 1-1.06 0l-5.5-5.5a.75.75 0 0 1 0-1.06l5.5-5.5a.75.75 0 1 1 1.06 1.06L4.81 9.645h12.44a.75.75 0 0 1 0 1.5H4.81l4.395 4.395a.75.75 0 0 1 0 1.06Z" clipRule="evenodd" />
              </svg>
            </Link>
            <span className="text-base font-bold text-foreground">
              {problemId ? `${problemId.replace('problem', '')}번 문제` : "문제"}
            </span>
          </div>
          <button className="text-muted-foreground hover:text-foreground p-1 transition-colors">
            {/* Sidebar toggle icon form storyboard */}
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5">
              <rect width="18" height="18" x="3" y="3" rx="2" ry="2" />
              <path d="M9 3v18" />
            </svg>
          </button>
        </div>

        {/* Action Buttons */}
        <div className="px-3 pb-3 space-y-1">
          <button
            onClick={onNewChat}
            className="flex items-center gap-2.5 w-full justify-start px-3 py-2 text-sm font-medium transition-colors rounded-lg text-foreground/80 hover:bg-muted hover:text-foreground"
          >
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4">
              <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
              <path d="M12 7v6" />
              <path d="M9 10h6" />
            </svg>
            새 채팅
          </button>
          
          <button className="flex items-center gap-2.5 w-full justify-start px-3 py-2 text-sm font-medium transition-colors rounded-lg text-foreground/80 hover:bg-muted hover:text-foreground">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4">
              <circle cx="11" cy="11" r="8" />
              <path d="m21 21-4.35-4.35" />
            </svg>
            채팅 검색
          </button>
        </div>

        {/* Current Problem Thumbnail */}
        {problemImageUrl && (
          <div className="px-4 py-3 border-y border-border/50 bg-muted/20">
            <div 
              className="relative w-full aspect-video rounded-lg border border-border bg-white shadow-sm overflow-hidden cursor-zoom-in group"
              onMouseEnter={() => setIsHoveringImage(true)}
              onMouseLeave={() => setIsHoveringImage(false)}
            >
              <img 
                src={problemImageUrl}
                alt="현재 문제"
                className="w-full h-full object-cover p-1 opacity-90 group-hover:opacity-100 transition-opacity"
              />
              <div className="absolute inset-0 flex items-center justify-center bg-black/5 opacity-0 group-hover:opacity-100 transition-opacity">
                <span className="bg-background/90 text-foreground text-[10px] font-bold px-2 py-1 rounded shadow-sm">
                  크게 보기
                </span>
              </div>
            </div>
          </div>
        )}

        {/* Session history */}
        <div className="flex-1 overflow-y-auto px-2 py-3 space-y-3">
          <div className="px-2 pb-1">
            <div className="flex items-center gap-1">
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-3.5 h-3.5 text-muted-foreground">
                <path fillRule="evenodd" d="M5.22 8.22a.75.75 0 0 1 1.06 0L10 11.94l3.72-3.72a.75.75 0 1 1 1.06 1.06l-4.25 4.25a.75.75 0 0 1-1.06 0L5.22 9.28a.75.75 0 0 1 0-1.06Z" clipRule="evenodd" />
              </svg>
              <span className="text-xs font-bold text-foreground">내 채팅</span>
            </div>
          </div>

          <div className="space-y-0.5">
            {problemSessions.length === 0 ? (
              <p className="text-xs text-muted-foreground px-4 py-2 opacity-70">
                해당 문제의 채팅이 없습니다.
              </p>
            ) : (
              problemSessions.map((session) => (
                <button
                  key={session.sessionId}
                  onClick={() => onSelectSession(session)}
                  className={`w-full text-left text-[13px] px-4 py-2 rounded-md truncate transition-colors ${
                    currentSessionId === session.sessionId
                      ? "bg-accent/60 text-foreground font-medium"
                      : "text-muted-foreground hover:bg-accent/40 hover:text-foreground"
                  }`}
                  title={session.title}
                >
                  {session.title}
                </button>
              ))
            )}
          </div>
        </div>

        {/* Bottom User profile and Modes */}
        <div className="px-3 pb-4 pt-3 border-t border-border/50 space-y-2">
          {/* Mode buttons */}
          <div className="space-y-1">
            <Link
              href={`/passive${problemId ? `?problem=${problemId}` : ''}`}
              className={`flex items-center gap-2 w-full text-xs px-3 py-1.5 rounded-md border transition-colors ${
                currentMode === "passive"
                  ? "border-primary bg-primary/10 text-primary font-medium"
                  : "border-border/50 text-muted-foreground hover:bg-muted hover:text-foreground"
              }`}
            >
              <span className="w-1.5 h-1.5 rounded-full bg-blue-400 flex-shrink-0" />
              Passive chatbot
            </Link>
            <Link
              href={`/active${problemId ? `?problem=${problemId}` : ''}`}
              className={`flex items-center gap-2 w-full text-xs px-3 py-1.5 rounded-md border transition-colors ${
                currentMode === "active"
                  ? "border-primary bg-primary/10 text-primary font-medium"
                  : "border-border/50 text-muted-foreground hover:bg-muted hover:text-foreground"
              }`}
            >
              <span className="w-1.5 h-1.5 rounded-full bg-green-400 flex-shrink-0" />
              Active chatbot
            </Link>
          </div>

          {/* User profile */}
          <div className="flex items-center gap-2.5 px-2 py-2 rounded-lg hover:bg-muted/50 cursor-pointer transition-colors mt-2">
            <div className="w-7 h-7 rounded-full bg-primary/20 border border-border flex items-center justify-center flex-shrink-0 overflow-hidden">
              <img src="/Clueny CI.png" alt="Myeonggi Seong" className="w-full h-full object-cover" onError={e => (e.currentTarget.style.display = 'none')} />
            </div>
            <span className="text-xs font-medium text-foreground truncate">
              Myeonggi Seong
            </span>
          </div>
        </div>
      </aside>

      {/* Hover Effect Modal for Problem Image */}
      {isHoveringImage && problemImageUrl && (
        <div className="fixed inset-0 z-50 pointer-events-none flex items-center justify-center bg-black/10 backdrop-blur-[2px] animate-in fade-in duration-200">
          <div className="bg-white p-4 rounded-xl shadow-2xl border border-border/50 max-w-4xl max-h-[85vh] transform scale-100 transition-transform duration-300">
            {/* The storyboard shows the slide hint tooltip connected to the image */}
            <div className="absolute -left-32 top-10 bg-white border border-border/50 rounded shadow p-2 text-[10px] whitespace-nowrap opacity-90">
              슬라이드 3<br/>
              링크를 따라가려면 &lt;Ctrl&gt; 키를 누른 채 클릭하세요.
            </div>
            <img 
              src={problemImageUrl} 
              alt="문제 텍스트" 
              className="max-w-full max-h-[80vh] object-contain rounded"
            />
          </div>
        </div>
      )}
    </>
  );
}
