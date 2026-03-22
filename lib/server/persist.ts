import { appendFile, mkdir, writeFile, readFile } from "node:fs/promises";
import path from "node:path";
import { randomUUID } from "node:crypto";

export function getKstTimestamp() {
  const date = new Date();
  // Add 9 hours in milliseconds
  const kstTime = new Date(date.getTime() + (9 * 60 * 60 * 1000));
  
  // Format to standard ISO-like string with +09:00 timezone
  const year = kstTime.getUTCFullYear();
  const month = String(kstTime.getUTCMonth() + 1).padStart(2, '0');
  const day = String(kstTime.getUTCDate()).padStart(2, '0');
  const hours = String(kstTime.getUTCHours()).padStart(2, '0');
  const minutes = String(kstTime.getUTCMinutes()).padStart(2, '0');
  const seconds = String(kstTime.getUTCSeconds()).padStart(2, '0');
  const milliseconds = String(kstTime.getUTCMilliseconds()).padStart(3, '0');

  return `${year}-${month}-${day}T${hours}:${minutes}:${seconds}.${milliseconds}+09:00`;
}

function getDataDir() {
  return path.join(process.cwd(), "data");
}

function safeTimestampForFilename(date = new Date()) {
  return date.toISOString().replace(/[:.]/g, "-");
}

export async function appendJsonl({
  fileName,
  entry,
}: {
  fileName: string;
  entry: unknown;
}) {
  const dataDir = getDataDir();
  await mkdir(dataDir, { recursive: true });
  const filePath = path.join(dataDir, fileName);
  await appendFile(filePath, `${JSON.stringify(entry)}\n`, "utf8");
}

export async function appendJsonArray({
  fileName,
  entry,
}: {
  fileName: string;
  entry: unknown;
}) {
  const dataDir = getDataDir();
  await mkdir(dataDir, { recursive: true });
  const filePath = path.join(dataDir, fileName);

  let currentArray: unknown[] = [];
  try {
    const fileContent = await readFile(filePath, "utf8");
    if (fileContent.trim()) {
      currentArray = JSON.parse(fileContent);
    }
  } catch (error: any) {
    if (error.code !== "ENOENT") {
      console.error(`Error reading ${fileName}:`, error);
    } // If ENOENT, file doesn't exist yet, which is expected.
  }

  if (Array.isArray(currentArray)) {
    currentArray.push(entry);
  } else {
    // Failsafe in case the JSON isn't an array
    currentArray = [currentArray, entry];
  }

  await writeFile(filePath, JSON.stringify(currentArray, null, 2), "utf8");
}

export async function writeSubmission({
  editorText,
  editorHtml,
  messages,
}: {
  editorText: string;
  editorHtml?: string;
  messages: unknown;
}) {
  const id = randomUUID();
  const timestamp = safeTimestampForFilename();
  const dataDir = getDataDir();
  const submissionsDir = path.join(dataDir, "submissions");
  await mkdir(submissionsDir, { recursive: true });

  const fileName = `${timestamp}_${id}.json`;
  const filePath = path.join(submissionsDir, fileName);

  const payload = {
    id,
    submittedAt: new Date().toISOString(),
    editorText,
    editorHtml,
    messages,
  };

  await writeFile(filePath, JSON.stringify(payload, null, 2), "utf8");

  return { id, fileName };
}

