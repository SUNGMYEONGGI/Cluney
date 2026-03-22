import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Editor + Chat",
  description: "Tiptap editor + streaming chat assistant (AI SDK)",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ko" suppressHydrationWarning>
      <body suppressHydrationWarning>{children}</body>
    </html>
  );
}
