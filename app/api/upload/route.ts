import { NextResponse } from "next/server";
import { writeFile, mkdir } from "node:fs/promises";
import path from "node:path";
import { randomUUID } from "node:crypto";

export const runtime = "nodejs";

export async function POST(req: Request) {
  try {
    const { images } = await req.json(); // Expects { images: [{name: string, type: string, base64: string}] }
    
    if (!images || !Array.isArray(images)) {
      return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
    }

    const imageDir = path.join(process.cwd(), "data", "image");
    await mkdir(imageDir, { recursive: true });

    const savedImages = await Promise.all(
      images.map(async (img) => {
        // Extract base64 data (remove "data:image/png;base64," prefix)
        const base64Data = img.base64.replace(/^data:image\/\w+;base64,/, "");
        const buffer = Buffer.from(base64Data, "base64");
        
        // Generate a unique filename while preserving extension if possible
        const ext = img.name ? path.extname(img.name) || ".png" : ".png";
        const filename = `${randomUUID()}${ext}`;
        const filePath = path.join(imageDir, filename);

        await writeFile(filePath, buffer);

        return {
          originalName: img.name,
          url: `/api/image/${filename}`,
          type: img.type || "image/png"
        };
      })
    );

    return NextResponse.json({ success: true, images: savedImages });
  } catch (error) {
    console.error("Error uploading images:", error);
    return NextResponse.json({ error: "Failed to upload images" }, { status: 500 });
  }
}
