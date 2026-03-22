"use client";

import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport, type UIMessage } from "ai";
import { useEffect, useMemo, useRef, useState } from "react";
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
import styles from "./ChatPane.module.css";
type ChatPaneProps = {
  disabled?: boolean;
  onMessagesChange?: (messages: UIMessage[]) => void;
  initialMode?: "active" | "passive";
  sessionId?: string;
  problemId?: string | null;
  initialMessages?: UIMessage[];
};

function messageToText(message: UIMessage): string {
  if (!message.parts || message.parts.length === 0) {
    return (message as any).content || "";
  }
  return message.parts
    .filter((part): part is { type: "text"; text: string } => part.type === "text")
    .map((part) => part.text)
    .join("");
}

export function ChatPane({
  disabled = false,
  onMessagesChange,
  initialMode = "active",
  sessionId = "default",
  problemId = null,
  initialMessages = []
}: ChatPaneProps) {
  const transport = useMemo(
    () =>
      new DefaultChatTransport({
        api: "/api/chat",
      }),
    [],
  );

  const messagesRef = useRef<UIMessage[]>([]);

  // Local state to keep images visible even after the AI SDK consumes them
  const [localAttachments, setLocalAttachments] = useState<Record<string, { name: string, url: string }[]>>({});
  // Track attachments that were just sent but don't have a message ID yet
  const [lastSentAttachments, setLastSentAttachments] = useState<{ name: string, url: string }[] | null>(null);
  
  const localAttachmentsRef = useRef<Record<string, { name: string, url: string }[]>>({});
  useEffect(() => {
    localAttachmentsRef.current = localAttachments;
  }, [localAttachments]);

  const { messages, sendMessage, status, stop, error, clearError, setMessages } = useChat({
    id: sessionId,
    transport,
    onFinish: async ({ messages, finishReason, isAbort, isError, isDisconnect }) => {
      // Create a cloned messages array and augment user messages with permanent image URLs
      const logsToSave = JSON.parse(JSON.stringify(messages)).map((msg: any) => {
        const imgs = localAttachmentsRef.current[msg.id];
        if (imgs && imgs.length > 0) {
          // Attach image URLs to the message so they survive history reload
          return { ...msg, images: imgs };
        }
        return msg;
      });

      // Restore real-time logging to chatlog.json
      // We also need to add problemId to our logs
      void fetch("/api/log", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sessionId,
          mode,
          problemId,
          event: "chat_finish",
          messages: logsToSave,
          meta: {
            finishReason,
            isAbort,
            isError,
            isDisconnect,
          },
        }),
      });
    },
    onError: (err) => {
      void fetch("/api/log", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sessionId,
          event: "chat_error",
          error: err.message,
          messages: messagesRef.current,
        }),
      });
    },
  });

  const [input, setInput] = useState("");
  const [mode, setMode] = useState<"active" | "passive">(initialMode);
  const [attachments, setAttachments] = useState<File[]>([]);
  // Store generated blob URLs to avoid hydration mismatch and memory leaks
  const [attachmentPreviews, setAttachmentPreviews] = useState<string[]>([]);

  // localAttachments state has been moved up

  const bottomRef = useRef<HTMLDivElement | null>(null);
  const isBusy = status === "submitted" || status === "streaming";

  // UI states
  const [isDragging, setIsDragging] = useState(false);
  const [isMounted, setIsMounted] = useState(false);
  const [previewImage, setPreviewImage] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [isPlusMenuOpen, setIsPlusMenuOpen] = useState(false);
  const [showFormulaDialog, setShowFormulaDialog] = useState(false);
  
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleCopy = (text: string, id: string) => {
    navigator.clipboard.writeText(text).then(() => {
      setCopiedId(id);
      setTimeout(() => setCopiedId(null), 2000);
    });
  };

  useEffect(() => {
    setIsMounted(true);
  }, []);

  useEffect(() => {
    setMode(initialMode);
  }, [initialMode]);

  useEffect(() => {
    if (initialMessages && initialMessages.length > 0) {
      // @ts-ignore
      setMessages(initialMessages);
      // Restore image attachments from history - each message may carry an `images` field
      const restoredAttachments: Record<string, { name: string; url: string }[]> = {};
      for (const msg of initialMessages as any[]) {
        if (msg.images && msg.images.length > 0) {
          restoredAttachments[msg.id] = msg.images;
        }
      }
      if (Object.keys(restoredAttachments).length > 0) {
        setLocalAttachments(restoredAttachments);
      }
    } else {
      const pNum = problemId ? problemId.replace('problem', '') : '';
      const contentStr = `안녕, 나는 수학학습을 도와주는 Cluney야.\n${pNum ? pNum + '번 문제에 대해 어떤 것이 궁금해?' : '어떤 것이 궁금해?'}`;
      const greetingMsg = {
        id: `greeting-${sessionId}`,
        role: "assistant",
        content: contentStr,
        parts: [{ type: "text", text: contentStr }]
      } as UIMessage;
      // @ts-ignore
      setMessages([greetingMsg]);
      setLocalAttachments({});
    }
  }, [sessionId, initialMessages, setMessages, problemId]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ block: "end" });
  }, [messages.length, status, attachments.length]);

  useEffect(() => {
    messagesRef.current = messages;
    onMessagesChange?.(messages);

    // Image persistence logic: If we have lastSentAttachments and a new user message just appeared, link them
    if (lastSentAttachments && messages.length > 0) {
      const lastUserMessage = [...messages].reverse().find(m => m.role === "user");
      if (lastUserMessage && !localAttachments[lastUserMessage.id]) {
        setLocalAttachments(prev => ({
          ...prev,
          [lastUserMessage.id]: lastSentAttachments
        }));
        setLastSentAttachments(null);
      }
    }
  }, [messages, onMessagesChange, lastSentAttachments, localAttachments]);

  // Clean up blob URLs to prevent memory leaks
  useEffect(() => {
    return () => {
      attachmentPreviews.forEach(url => URL.revokeObjectURL(url));
    };
  }, [attachmentPreviews]);

  async function submitInput() {
    const text = input.trim();
    if (!text) return; // Require text even if there are attachments
    if (disabled) return;
    if (isBusy) return;

    // Clear input field immediately for UX
    setInput("");

    // Clear previews when attachments are cleared
    const currentAttachments = [...attachments];
    attachmentPreviews.forEach(url => URL.revokeObjectURL(url));
    setAttachmentPreviews([]);
    setAttachments([]);

    // We will convert images to base64 Data URLs so they can be sent securely via JSON payload
    const processedAttachmentsForAI = await Promise.all(
      currentAttachments.map((file: File) => {
        return new Promise<{ name: string; type: string; url: string }>((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = () => resolve({ name: file.name, type: file.type, url: reader.result as string });
          reader.onerror = reject;
          reader.readAsDataURL(file);
        });
      })
    );

    // Concurrently upload them to our local API for permanent UI storage / history
    let uploadedUrls: { name: string, url: string }[] = [];
    if (processedAttachmentsForAI.length > 0) {
      try {
        const res = await fetch("/api/upload", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ 
            images: processedAttachmentsForAI.map(att => ({ name: att.name, type: att.type, base64: att.url })) 
          })
        });
        if (res.ok) {
          const data = await res.json();
          uploadedUrls = data.images.map((img: any) => ({ name: img.originalName, url: img.url }));
        }
      } catch (err) {
        console.error("Failed to upload images permanently:", err);
      }
    }

    // Store them in a temp state until the AI SDK generates a message for them
    if (uploadedUrls.length > 0) {
      setLastSentAttachments(uploadedUrls); // Use the permanent URLs for the UI
    } else if (processedAttachmentsForAI.length > 0) {
      setLastSentAttachments(processedAttachmentsForAI); // Fallback to base64 if upload fails
    }

    // Use standard sendMessage (append was causing reference errors)
    await sendMessage(
      { text },
      {
        body: {
          mode,
          problemId,
          attachments: processedAttachmentsForAI // AI payload always needs Base64
        }
      }
    );
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!input.trim()) return;
    await submitInput();
  }

  async function onKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key !== "Enter") return;
    if (e.shiftKey) return;
    if (e.nativeEvent.isComposing) return;
    if (disabled || isBusy) return;
    e.preventDefault();
    await submitInput();
  }

  const handlePaste = (e: React.ClipboardEvent) => {
    if (e.clipboardData.files && e.clipboardData.files.length > 0) {
      e.preventDefault();
      const files = Array.from(e.clipboardData.files).filter(file => file.type.startsWith('image/'));
      if (files.length > 0) {
        setAttachments(prev => [...prev, ...files]);
        const newPreviews = files.map(f => URL.createObjectURL(f));
        setAttachmentPreviews(prev => [...prev, ...newPreviews]);
      }
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const files = Array.from(e.dataTransfer.files).filter(file => file.type.startsWith('image/'));
      if (files.length > 0) {
        setAttachments(prev => [...prev, ...files]);
        const newPreviews = files.map(f => URL.createObjectURL(f));
        setAttachmentPreviews(prev => [...prev, ...newPreviews]);
      }
    }
  };

  const removeAttachment = (index: number) => {
    setAttachments(prev => prev.filter((_, i) => i !== index));
    setAttachmentPreviews(prev => {
      const newPreviews = [...prev];
      URL.revokeObjectURL(newPreviews[index]);
      newPreviews.splice(index, 1);
      return newPreviews;
    });
  };

  if (!isMounted) return null;

  return (
    <section className="flex flex-col h-full w-full">
      <header className="flex items-center justify-between p-4 border-b border-border bg-background shadow-sm z-10 w-full md:sticky top-0 sticky-nav sticky-bg blur-bg bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="flex items-center gap-2">
          <h2 className="text-lg font-semibold tracking-tight text-foreground/90">
            {mode === "active" ? "Active Bot" : "Passive Bot"}
          </h2>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs text-muted-foreground font-medium uppercase tracking-wider mr-2">{status === "ready" ? "" : status}</span>
          {isBusy && (
            <button
              className="inline-flex items-center justify-center rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 disabled:pointer-events-none disabled:opacity-50 border border-input bg-background hover:bg-accent hover:text-accent-foreground h-8 px-3 shadow-sm"
              type="button"
              onClick={() => stop()}
            >
              Stop
            </button>
          )}
          {error && (
            <button
              className="inline-flex items-center justify-center rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 disabled:pointer-events-none disabled:opacity-50 border border-destructive/50 bg-destructive/10 text-destructive hover:bg-destructive/20 h-8 px-3 shadow-sm"
              type="button"
              onClick={() => clearError()}
            >
              Clear error
            </button>
          )}
        </div>
      </header>

      <div className="flex-1 overflow-y-auto p-4 md:px-6 md:py-8 space-y-8 scroll-smooth">
        {messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-muted-foreground animate-in fade-in duration-500">
            <div className="mb-6 animate-in zoom-in duration-700">
              <img src="/logo_hai.png" alt="HAI LAB Logo" className="h-24 w-auto drop-shadow-md" />
            </div>
            <h3 className="text-xl font-medium text-foreground mb-2">Welcome to your Assistant</h3>
            <p className="max-w-md text-center">Ask a question, paste an image, or drag and drop files to get started.</p>
          </div>
        ) : (
          messages.map((m) => {
            const text = messageToText(m);
            const isUser = m.role === "user";

            // Extract experimental attachments from the message if they exist
            const parts = m.parts || [];
            const nonTextParts = parts.filter(p => p.type !== 'text');
            // Use local attachments dictionary for persistence, fallback to experimental_attachments
            const fallbackAttachments = (m as any).experimental_attachments || [];
            const activeAttachments = localAttachments[m.id] || fallbackAttachments;

            return (
              <div
                key={m.id}
                className={`flex w-full group ${isUser ? "justify-end" : "justify-start"}`}
              >
                <div className={`flex max-w-[85%] md:max-w-[75%] gap-3 md:gap-4 ${isUser ? "flex-row-reverse" : "flex-row"}`}>
                  <div className={`flex-shrink-0 h-8 w-8 rounded-full flex items-center justify-center shadow-sm border ${isUser ? "bg-primary border-primary text-primary-foreground" : "bg-card border-border text-foreground"}`}>
                    {isUser ? (
                      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5">
                        <path fillRule="evenodd" d="M7.5 6a4.5 4.5 0 119 0 4.5 4.5 0 01-9 0zM3.751 20.105a8.25 8.25 0 0116.498 0 .75.75 0 01-.437.695A18.683 18.683 0 0112 22.5c-2.786 0-5.433-.608-7.812-1.7a.75.75 0 01-.437-.695z" clipRule="evenodd" />
                      </svg>
                    ) : (
                      <img src="/Clueny CI.png" alt="Cluney" className="w-full h-full object-cover rounded-full" onError={(e) => { (e.currentTarget as HTMLImageElement).src = '/logo_hai.png'; }} />
                    )}
                  </div>
                  <div className={`flex flex-col gap-2 ${isUser ? "items-end" : "items-start"}`}>
                    <div className={`p-4 rounded-2xl shadow-sm ${isUser ? "bg-primary text-primary-foreground rounded-tr-sm" : "bg-card border border-border text-card-foreground rounded-tl-sm w-full"}`}>
                      {isUser ? (
                        <>
                          {/* Render submitted images in history above text for Users */}
                          {activeAttachments.length > 0 && (
                            <div className="mb-3 flex flex-wrap gap-2">
                              {activeAttachments.map((att: any, i: number) => (
                                <div key={i} className="relative rounded-md border border-border/20 overflow-hidden shadow-sm bg-background cursor-pointer hover:opacity-90 transition-opacity" onClick={() => setPreviewImage(att.url)}>
                                  <img src={att.url} alt={att.name || "attachment"} className="max-w-full md:max-w-xs h-auto object-contain rounded-md" />
                                </div>
                              ))}
                            </div>
                          )}

                          {(text || parts.length === 0) && (
                            <div className="prose prose-sm prose-invert max-w-none break-words whitespace-pre-wrap leading-relaxed">
                              {text}
                            </div>
                          )}

                          {/* Render attachments info if available (fallback for non-image parts) */}
                          {nonTextParts.length > 0 && activeAttachments.length === 0 && (
                            <div className="mt-3 flex flex-wrap gap-2 text-xs opacity-80">
                              {nonTextParts.map((part, i) => (
                                <div key={i} className="flex items-center gap-1 bg-background/20 rounded p-1.5 border border-border/10">
                                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-3 h-3">
                                    <path fillRule="evenodd" d="M15.621 4.379a3 3 0 00-4.242 0l-7 7a3 3 0 004.241 4.243h.001l.497-.5a.75.75 0 011.064 1.057l-.498.501-.002.002a4.5 4.5 0 01-6.364-6.364l7-7a4.5 4.5 0 016.368 6.36l-3.455 3.553A2.625 2.625 0 119.52 9.52l3.45-3.451a.75.75 0 111.061 1.06l-3.45 3.451a1.125 1.125 0 001.587 1.595l3.454-3.553a3 3 0 000-4.242z" clipRule="evenodd" />
                                  </svg>
                                  <span>Attachment {i + 1}</span>
                                </div>
                              ))}
                            </div>
                          )}
                        </>
                      ) : (
                        <>
                          {/* AI Bubble Structure uses Markdown */}
                          {(text || parts.length === 0) && (
                            <div className="flex flex-col gap-2">
                              <div className="prose prose-sm dark:prose-invert max-w-full break-words leading-relaxed overflow-x-auto">
                                <ReactMarkdown
                                  remarkPlugins={[remarkGfm, remarkMath]}
                                  rehypePlugins={[rehypeKatex]}
                                >
                                  {text || "(non-text message)"}
                                </ReactMarkdown>
                              </div>
                              <button
                                onClick={() => handleCopy(text, m.id)}
                                className="self-end text-xs text-muted-foreground hover:text-foreground transition-colors p-1 rounded-md flex items-center gap-1 mt-1 opacity-70 hover:opacity-100"
                                aria-label="Copy message"
                                title="Copy message"
                              >
                                {copiedId === m.id ? (
                                  <>
                                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-3.5 h-3.5 text-green-500">
                                      <path fillRule="evenodd" d="M16.704 4.153a.75.75 0 01.143 1.052l-8 10.5a.75.75 0 01-1.127.075l-4.5-4.5a.75.75 0 011.06-1.06l3.894 3.893 7.48-9.817a.75.75 0 011.05-.143z" clipRule="evenodd" />
                                    </svg>
                                    <span>Copied!</span>
                                  </>
                                ) : (
                                  <>
                                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-3.5 h-3.5">
                                      <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 17.25v3.375c0 .621-.504 1.125-1.125 1.125h-9.75a1.125 1.125 0 01-1.125-1.125V7.875c0-.621.504-1.125 1.125-1.125H6.75a9.06 9.06 0 011.5.124m7.5 10.376h3.375c.621 0 1.125-.504 1.125-1.125V11.25c0-4.46-3.243-8.161-7.5-8.876a9.06 9.06 0 00-1.5-.124H9.375c-.621 0-1.125.504-1.125 1.125v3.5m7.5 10.375H9.375a1.125 1.125 0 01-1.125-1.125v-9.25m12 6.625v-1.875a3.375 3.375 0 00-3.375-3.375h-1.5a1.125 1.125 0 01-1.125-1.125v-1.5a3.375 3.375 0 00-3.375-3.375H9.75" />
                                    </svg>
                                    <span>Copy</span>
                                  </>
                                )}
                              </button>
                            </div>
                          )}
                        </>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            );
          })
        )}
        {isBusy && (
          <div className="flex w-full justify-start animate-in fade-in duration-300">
            <div className="flex max-w-[85%] gap-4 flex-row">
              <div className="flex-shrink-0 h-8 w-8 rounded-full bg-card border border-border text-foreground flex items-center justify-center shadow-sm">
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5">
                  <path fillRule="evenodd" d="M9.315 7.584C12.195 3.883 16.695 1.5 21.5 1.5a.75.75 0 01.75.75c0 5.056-2.123 9.67-5.59 12.606-.61.528-1.503.738-2.274.526-.856-.234-1.745-.487-2.606-.796-.134.4-.236.81-.303 1.229a1.5 1.5 0 00.323 1.134l1.625 2.032a1.5 1.5 0 01-.3 2.158l-1.346 1.01a1.5 1.5 0 01-2.115-.224l-2.008-2.51a1.5 1.5 0 01.077-2.035c.182-.206.376-.407.58-.6-.62-.162-1.25-.333-1.874-.537-.775-.253-1.501-.798-1.824-1.558-.297-.7-.61-1.39-.937-2.072a1.5 1.5 0 01.6-1.921l1.73-1.039a1.5 1.5 0 00.672-1.666 4.982 4.982 0 01-.157-.961c-.012-.132.086-.242.217-.253.94-.078 1.838-.344 2.645-.769z" clipRule="evenodd" />
                </svg>
              </div>
              <div className="p-4 rounded-2xl bg-card border border-border rounded-tl-sm shadow-sm">
                <div className="flex gap-1.5 items-center h-5">
                  <span className="w-1.5 h-1.5 bg-foreground/50 rounded-full animate-bounce [animation-delay:-0.3s]"></span>
                  <span className="w-1.5 h-1.5 bg-foreground/50 rounded-full animate-bounce [animation-delay:-0.15s]"></span>
                  <span className="w-1.5 h-1.5 bg-foreground/50 rounded-full animate-bounce"></span>
                </div>
              </div>
            </div>
          </div>
        )}
        <div ref={bottomRef} className="h-2" />
      </div>

      {error && (
        <div className="mx-4 md:mx-auto max-w-3xl w-full p-3 bg-destructive/10 border border-destructive/20 text-destructive text-sm rounded-lg mb-2 shadow-sm animate-in slide-in-from-bottom-2">
          {error.message.includes("high demand") || error.message.includes("503") || error.message.includes("overloaded")
            ? "현재 구글 서버의 사용량이 많아 응답이 지연되고 있습니다. 잠시 후 다시 시도해 주세요. (재시도 횟수를 늘려두었으니 잠시 기다려보셔도 좋습니다.)"
            : error.message}
        </div>
      )}

      <div className="p-4 pt-0 mb-4 bg-transparent max-w-3xl mx-auto w-full relative">
        <form onSubmit={onSubmit} className="relative">
          
          {/* Plus button popup menu */}
          {isPlusMenuOpen && (
            <div className="absolute left-0 bottom-[calc(100%+12px)] bg-background/95 backdrop-blur-md border border-border rounded-xl shadow-[0_4px_24px_rgba(0,0,0,0.08)] p-2 flex flex-col gap-1 w-[200px] z-20 animate-in fade-in slide-in-from-bottom-2">
              <button 
                type="button" 
                onClick={() => {
                  setShowFormulaDialog(true);
                  setIsPlusMenuOpen(false);
                }}
                className="flex items-center gap-3 px-3 py-2.5 hover:bg-muted rounded-lg text-sm font-medium text-foreground transition-colors"
               >
                <div className="w-5 h-5 flex items-center justify-center text-muted-foreground">
                  <span className="italic font-serif font-bold">fx</span>
                </div>
                수식 작성하기
              </button>
              <button 
                type="button" 
                onClick={() => {
                  fileInputRef.current?.click();
                  setIsPlusMenuOpen(false);
                }}
                className="flex items-center gap-3 px-3 py-2.5 hover:bg-muted rounded-lg text-sm font-medium text-foreground transition-colors"
               >
                <div className="w-5 h-5 flex items-center justify-center text-muted-foreground">
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4">
                    <path d="m21.44 11.05-9.19 9.19a6 6 0 0 1-8.49-8.49l8.57-8.57A4 4 0 1 1 18 8.84l-8.59 8.57a2 2 0 0 1-2.83-2.83l8.49-8.48"/>
                  </svg>
                </div>
                사진 및 파일 추가
              </button>
            </div>
          )}

          {/* New Pill-shaped Input Container */}
          <div 
            className={`flex flex-col bg-background border-2 transition-colors rounded-[32px] shadow-sm overflow-visible ${
              isDragging ? "border-primary bg-primary/5" : "border-border/80 focus-within:border-border"
            }`}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
          >
            {/* Attachment Previews */}
            {attachmentPreviews.length > 0 && (
              <div className="flex flex-wrap gap-2 p-3 border-b border-border/30 bg-muted/20 rounded-t-[30px]">
                {attachmentPreviews.map((url, i) => (
                  <div key={i} className="relative group rounded-xl overflow-hidden border border-border shadow-sm w-16 h-16 flex-shrink-0 bg-background">
                    <img src={url} alt={`첨부 ${i+1}`} className="w-full h-full object-cover" />
                    <button
                      type="button"
                      onClick={() => removeAttachment(i)}
                      className="absolute top-1 right-1 bg-black/60 text-white rounded-full w-5 h-5 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity disabled:opacity-0 hover:bg-black/80"
                      disabled={disabled || isBusy}
                      title="삭제"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-3.5 h-3.5">
                        <path d="M6.28 5.22a.75.75 0 00-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 101.06 1.06L10 11.06l3.72 3.72a.75.75 0 101.06-1.06L11.06 10l3.72-3.72a.75.75 0 00-1.06-1.06L10 8.94 6.28 5.22z" />
                      </svg>
                    </button>
                  </div>
                ))}
              </div>
            )}
            
            <div className="flex items-end gap-1 p-1">
              <button
                type="button"
                onClick={() => setIsPlusMenuOpen(!isPlusMenuOpen)}
                className="flex-shrink-0 w-10 h-10 flex items-center justify-center rounded-full hover:bg-muted text-foreground transition-colors mb-[3px] ml-1 z-10"
                disabled={disabled || isBusy}
                title="메뉴"
              >
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="w-6 h-6">
                  <path d="M12 5v14M5 12h14" />
                </svg>
              </button>

              <textarea
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={onKeyDown}
                onPaste={handlePaste}
                placeholder="메시지를 입력하세요... (이미지 붙여넣기 가능)"
                disabled={disabled || isBusy}
                className="flex-1 min-h-[46px] max-h-[160px] py-3.5 px-2 bg-transparent resize-none outline-none placeholder:text-muted-foreground/50 focus:ring-0 text-sm text-foreground my-auto"
                rows={1}
                dir="auto"
                style={{
                  height: '46px',
                  ...(input.length > 40 || input.includes('\n') ? {height: 'auto'} : {})
                }}
              />
              
              <button
                type="submit"
                disabled={(!input.trim() && attachments.length === 0) || disabled || isBusy}
                className="flex-shrink-0 w-10 h-10 flex items-center justify-center rounded-full hover:bg-muted text-foreground transition-transform active:scale-95 disabled:opacity-50 disabled:active:scale-100 disabled:bg-transparent mb-[3px] mr-1"
                title="보내기 (Enter)"
              >
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-[1.125rem] h-[1.125rem] translate-x-[1px] translate-y-[-1px]">
                  <path d="m22 2-7 20-4-9-9-4Z" />
                  <path d="M22 2 11 13" />
                </svg>
              </button>
            </div>
          </div>
          
          {/* Hidden file input */}
          <input
            type="file"
            ref={fileInputRef}
            className="hidden"
            multiple
            accept="image/*"
            onChange={(e) => {
              if (e.target.files && e.target.files.length > 0) {
                const filesList = Array.from(e.target.files);
                setAttachments(prev => [...prev, ...filesList]);
                setAttachmentPreviews(prev => [...prev, ...filesList.map(f => URL.createObjectURL(f))]);
                e.target.value = '';
              }
            }}
          />
        </form>
      </div>

      {/* Formula Dialog (Mock) */}
      {showFormulaDialog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm animate-in fade-in">
          <div className="bg-background rounded-2xl shadow-xl w-full max-w-md p-6 animate-in zoom-in-95">
            <h3 className="text-lg font-bold mb-4">수식 작성하기</h3>
            <p className="text-sm text-muted-foreground mb-4">수식 렌더링 에디터가 이 자리에 들어갑니다.</p>
            <textarea 
              className="w-full h-32 p-3 rounded-lg border border-input bg-background/50 text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50" 
              placeholder="$$ \int x^2 dx $$"
            />
            <div className="flex justify-end gap-2 mt-6">
              <button onClick={() => setShowFormulaDialog(false)} className="px-4 py-2 rounded-lg text-sm font-medium hover:bg-muted text-muted-foreground transition-colors">취소</button>
              <button onClick={() => setShowFormulaDialog(false)} className="px-4 py-2 rounded-lg text-sm font-medium bg-primary text-primary-foreground hover:bg-primary/90 transition-colors">입력</button>
            </div>
          </div>
        </div>
      )}
      {previewImage && (
        <div 
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in"
          onClick={() => setPreviewImage(null)}
        >
          <div className="relative max-w-5xl max-h-[90vh] w-full h-full flex items-center justify-center">
            <button 
              className="absolute top-4 right-4 bg-black/50 text-white rounded-full p-2 hover:bg-black/70 transition-colors z-50"
              onClick={(e) => {
                e.stopPropagation();
                setPreviewImage(null);
              }}
            >
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-6 h-6">
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
            <img 
              src={previewImage} 
              alt="Preview" 
              className="max-w-full max-h-[90vh] object-contain rounded-md shadow-2xl" 
              onClick={(e) => e.stopPropagation()} // Prevent clicking image from closing modal
            />
          </div>
        </div>
      )}
    </section>
  );
}
