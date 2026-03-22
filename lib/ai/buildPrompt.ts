import { convertToModelMessages, type ModelMessage, type UIMessage } from "ai";
import fs from "node:fs/promises";
import path from "node:path";

const ACTIVE_PROMPT_PATH = path.join(process.cwd(), "lib", "ai", "active-prompt.md");
const PASSIVE_PROMPT_PATH = path.join(process.cwd(), "lib", "ai", "passive-prompt.md");


let cachedActivePrompt: string | null = null;
let cachedPassivePrompt: string | null = null;

async function getSystemPrompt(mode: "active" | "passive"): Promise<string> {
  if (mode === "active") {
    if (!cachedActivePrompt) {
      try {
        cachedActivePrompt = await fs.readFile(ACTIVE_PROMPT_PATH, "utf8");
      } catch {
        cachedActivePrompt = "You are an active helpful assistant.";
      }
    }
    return cachedActivePrompt;
  } else {
    if (!cachedPassivePrompt) {
      try {
        cachedPassivePrompt = await fs.readFile(PASSIVE_PROMPT_PATH, "utf8");
      } catch {
        cachedPassivePrompt = "You are a passive helpful assistant.";
      }
    }
    return cachedPassivePrompt;
  }
}

/*
 * NOTE (kept for reference):
 * Previous version used `editorText` as system-context for the model.
 * Requirement change: do NOT include editorText in buildPrompt.
 *
 * const MAX_EDITOR_CHARS = 8_000;
 *
 * function buildSystemPrompt(editorText?: string) {
 *   const trimmed = (editorText ?? "").trim();
 *   if (!trimmed) {
 *     return "You are a helpful assistant.";
 *   }
 *
 *   const clipped =
 *     trimmed.length > MAX_EDITOR_CHARS
 *       ? `${trimmed.slice(0, MAX_EDITOR_CHARS)}\n\n[...truncated]`
 *       : trimmed;
 *
 *   return [
 *     "You are a helpful writing assistant.",
 *     "Use the editor content as context when it helps answer the user's question.",
 *     "",
 *     "Editor content:",
 *     clipped,
 *   ].join("\n");
 * }
 */

export async function buildPrompt({
  messages,
  mode = "active",
  problemId,
}: {
  messages: UIMessage[];
  mode?: "active" | "passive";
  problemId?: string | null;
}): Promise<{ system: string; messages: ModelMessage[] }> {
  const messagesWithoutIds = messages.map(({ id, ...rest }) => {
    void id;
    return rest;
  });
  const modelMessages = await convertToModelMessages(messagesWithoutIds);

  // Augment model messages with experimental_attachments so the AI model sees the images
  messages.forEach((msg, i) => {
    const attachments = (msg as any).experimental_attachments;
    if (attachments && attachments.length > 0) {
      const modelMsg = modelMessages[i];
      if (modelMsg.role === 'user') {
        // If content is a string, convert to array of parts
        if (typeof modelMsg.content === 'string') {
          modelMsg.content = [{ type: 'text', text: modelMsg.content }];
        }
        
        // Append image parts
        attachments.forEach((att: any) => {
          if (att.url && att.url.startsWith('data:image/')) {
            (modelMsg.content as any[]).push({
              type: 'image',
              image: att.url
            });
          }
        });
      }
    }
  });

  const system = await getSystemPrompt(mode);
  
  if (problemId) {
    const imageDir = path.join(process.cwd(), "data", "image");
    try {
      const files = await fs.readdir(imageDir);
      const file = files.find(f => f.startsWith(problemId + "."));
      if (file) {
        const filePath = path.join(imageDir, file);
        const buffer = await fs.readFile(filePath);
        const base64 = buffer.toString("base64");
        const ext = path.extname(file).toLowerCase();
        const mimeType = ext === ".png" ? "image/png" : ext === ".jpeg" || ext === ".jpg" ? "image/jpeg" : "image/webp";
        
        let firstUserMsg = modelMessages.find(m => m.role === 'user');
        if (!firstUserMsg) {
          firstUserMsg = { role: 'user', content: [] };
          modelMessages.unshift(firstUserMsg);
        }
        if (typeof firstUserMsg.content === 'string') {
          firstUserMsg.content = [{ type: 'text', text: firstUserMsg.content }];
        }
        const parts = firstUserMsg.content as any[];
        parts.unshift({
          type: 'image',
          image: `data:${mimeType};base64,${base64}`
        });
        parts.unshift({
          type: 'text',
          text: `[System Note: The user is currently solving the attached math problem (${problemId}). Please assist them based on this problem context.]\n\n`
        });
      }
    } catch(e) {
      console.error("Failed to load problem image for AI context", e);
    }
  }

  return { system, messages: modelMessages };
}
