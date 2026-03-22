import type { UIMessage } from "ai";

export type ChatRequestBody = {
  id?: string;
  messages: UIMessage[];
  // NOTE (kept for reference): previously used to send editor content to /api/chat.
  // editorText?: string;
  trigger?: "submit-message" | "regenerate-message" | "resume-stream";
  messageId?: string;
};
