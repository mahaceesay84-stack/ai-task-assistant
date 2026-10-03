import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "AI Task Assistant",
  description: "Break down, prioritize and summarize your tasks with an AI agent.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-slate-950 text-slate-200 antialiased">{children}</body>
    </html>
  );
}
