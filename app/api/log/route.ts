import { safeValidateUIMessages } from "ai";
import { z } from "zod";
import { appendJsonArray, getKstTimestamp } from "@/lib/server/persist";

export const runtime = "nodejs";

const requestSchema = z.object({
  sessionId: z.string().optional(),
  mode: z.enum(["active", "passive"]).optional(),
  event: z.string(),
  messages: z.unknown().optional(),
  error: z.string().optional(),
  meta: z.object({
    finishReason: z.string().optional(),
    isAbort: z.boolean().optional(),
    isError: z.boolean().optional(),
    isDisconnect: z.boolean().optional(),
  }).optional(),
});

export async function POST(req: Request) {
  try {
    const body = requestSchema.parse(await req.json());

    const validated =
      body.messages === undefined
        ? undefined
        : await safeValidateUIMessages({ messages: body.messages });

    if (validated && !validated.success) {
      return new Response(validated.error.message, { status: 400 });
    }

    // Map messages to strict format, also preserving any image URLs attached to messages
    let formattedMessages = undefined;
    if (validated && validated.success) {
      const rawMessages = (body.messages as any[]) || [];
      formattedMessages = validated.data.map((msg, idx) => {
        const rawMsg = rawMessages[idx] || {};
        const formatted: any = {
          id: msg.id,
          role: msg.role,
          parts: msg.parts?.map(part => {
            const formattedPart: any = { type: part.type };
            if (part.type === "text") {
              formattedPart.text = part.text;
            }
            if ('state' in part) {
              formattedPart.state = (part as any).state;
            }
            return formattedPart;
          }) || []
        };
        // Preserve permanent image URLs if present
        if (rawMsg.images && rawMsg.images.length > 0) {
          formatted.images = rawMsg.images;
        }
        return formatted;
      });
    }

    await appendJsonArray({
      fileName: "chatlog.json",
      entry: {
        sessionId: body.sessionId,
        mode: body.mode,
        at: getKstTimestamp(),
        event: body.event,
        meta: body.meta || {},
        messages: formattedMessages || [],
        userAgent: req.headers.get("user-agent") || "unknown",
      },
    });

    return Response.json({ ok: true });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return new Response(error.message, { status: 400 });
    }
    const message = error instanceof Error ? error.message : "Unknown error";
    return new Response(message, { status: 500 });
  }
}
