import { safeValidateUIMessages, streamText, type UIMessage } from "ai";
import { z } from "zod";
import { buildPrompt } from "@/lib/ai/buildPrompt";
import { getChatModel } from "@/lib/ai/provider";

export const runtime = "nodejs";

const requestSchema = z.object({
  messages: z.unknown(),
  mode: z.enum(["active", "passive"]).optional(),
  problemId: z.string().nullable().optional(),
  attachments: z.array(
    z.object({
      name: z.string(),
      type: z.string(),
      url: z.string()
    })
  ).optional(),
});

export async function POST(req: Request) {
  try {
    const json = await req.json();
    const body = requestSchema.parse(json);

    const validated = await safeValidateUIMessages({ messages: body.messages });
    if (!validated.success) {
      return new Response(validated.error.message, { status: 400 });
    }

    let coreMessages = validated.data as UIMessage[];

    // Attach base64 images to the last user message if they exist
    if (body.attachments && body.attachments.length > 0 && coreMessages.length > 0) {
      const lastMessage = coreMessages[coreMessages.length - 1];
      if (lastMessage.role === 'user') {
        const enhancedMessage = {
          ...lastMessage,
          experimental_attachments: body.attachments.map(att => ({
            name: att.name,
            contentType: att.type,
            url: att.url
          }))
        };
        coreMessages[coreMessages.length - 1] = enhancedMessage;
      }
    }

    const { system, messages } = await buildPrompt({
      messages: coreMessages as UIMessage[],
      mode: body.mode,
      problemId: body.problemId,
    });

    const model = getChatModel();
    const result = streamText({
      model,
      system,
      messages,
      maxRetries: 2, // 설명 : maxretires란, 
      temperature: 0.7, // 설명 : temperature란, 
    });
    return result.toUIMessageStreamResponse();
  } catch (error) {
    if (error instanceof z.ZodError) {
      return new Response(error.message, { status: 400 });
    }
    const message = error instanceof Error ? error.message : "Unknown error";
    return new Response(message, { status: 500 });
  }
}
