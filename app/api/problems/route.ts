import { NextResponse } from "next/server";
import { readdir } from "node:fs/promises";
import path from "node:path";

export const runtime = "nodejs";

export async function GET() {
  const imageDir = path.join(process.cwd(), "data", "image");
  try {
    const files = await readdir(imageDir);
    const problems = files
      .filter((f) => /\.(png|jpg|jpeg|webp|gif)$/i.test(f))
      .sort()
      .map((f) => {
        const id = f.replace(/\.[^.]+$/, ""); // e.g. "problem1"
        return {
          id,
          fileName: f,
          imageUrl: `/api/image/${f}`,
        };
      });
    return NextResponse.json({ problems });
  } catch (error) {
    console.error("Error reading image directory:", error);
    return NextResponse.json({ problems: [] });
  }
}
