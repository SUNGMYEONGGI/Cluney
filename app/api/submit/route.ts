import { safeValidateUIMessages } from "ai";
import { z } from "zod";
import { writeSubmission } from "@/lib/server/persist";

export const runtime = "nodejs";

const requestSchema = z.object({
  editorText: z.string(),
  editorHtml: z.string().optional(),
  messages: z.unknown(),
});

export async function POST(req: Request) {
  try {
    const body = requestSchema.parse(await req.json());

    const validated = await safeValidateUIMessages({ messages: body.messages });
    if (!validated.success) {
      return new Response(validated.error.message, { status: 400 });
    }

    const saved = await writeSubmission({
      editorText: body.editorText,
      editorHtml: body.editorHtml,
      messages: validated.data,
    });

    return Response.json({ ok: true, ...saved });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return new Response(error.message, { status: 400 });
    }
    const message = error instanceof Error ? error.message : "Unknown error";
    return new Response(message, { status: 500 });
  }
}

