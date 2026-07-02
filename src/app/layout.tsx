import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "JourneyAX — Caroma Bathroom Configurator",
  description: "AI-powered conversational bathroom configurator by Caroma. Design, configure, price, and order bathroom fixtures in one conversation.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
