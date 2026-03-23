import { NextResponse } from "next/server";
import { readFile } from "node:fs/promises";
import path from "node:path";

export const runtime = "nodejs";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const modeFilter = searchParams.get("mode"); // "active" | "passive" | null
  const problemIdFilter = searchParams.get("problemId"); // e.g. "problem6"

  const filePath = path.join(process.cwd(), "data", "chatlog.json");
  try {
    const fileContent = await readFile(filePath, "utf8");
    const logs = JSON.parse(fileContent);

    const sessionsMap = new Map();

    for (const log of logs) {
      if (!log.messages || log.messages.length === 0) continue;
      
      const sessionId = log.sessionId || log.messages[0].id;
      
      if (!sessionsMap.has(sessionId)) {
        let title = "New Chat";
        const firstUserMsg = log.messages.find((m: any) => m.role === "user");
        if (firstUserMsg && firstUserMsg.parts) {
          const textPart = firstUserMsg.parts.find((p: any) => p.type === "text");
          if (textPart && textPart.text) {
            title = textPart.text.slice(0, 30) + (textPart.text.length > 30 ? "..." : "");
          }
        }
        
        sessionsMap.set(sessionId, {
          sessionId,
          title,
          mode: log.mode || "unknown",
          problemId: log.problemId || null,
          updatedAt: log.at,
          messages: log.messages
        });
      } else {
        const session = sessionsMap.get(sessionId);
        if (new Date(log.at) > new Date(session.updatedAt)) {
          session.updatedAt = log.at;
          session.messages = log.messages;
          if (log.mode) session.mode = log.mode;
          if (log.problemId) session.problemId = log.problemId;
        }
      }
    }

    let sessionList = Array.from(sessionsMap.values());

    // Filter by mode if query param is provided
    if (modeFilter === "active" || modeFilter === "passive") {
      sessionList = sessionList.filter((s: any) => s.mode === modeFilter);
    }
    
    // Filter by problemId if query param is provided
    if (problemIdFilter) {
      sessionList = sessionList.filter((s: any) => s.problemId === problemIdFilter);
    }

    const sessions = sessionList.sort((a: any, b: any) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());

    return NextResponse.json({ sessions });
  } catch (error) {
    console.error("Error reading sessions:", error);
    return NextResponse.json({ sessions: [] });
  }
}
