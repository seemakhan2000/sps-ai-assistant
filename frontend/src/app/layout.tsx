
import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: {
    default: "SPS AI Assistant",
    template: "%s | SPS AI Assistant"
  },
  description:
    "Intelligent assistance for professional conversations by Software Productivity Strategists.",
  applicationName: "SPS AI Assistant"
};

export default function RootLayout({
  children
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}