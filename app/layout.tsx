import type { Metadata } from "next";
import "./globals.css";
import "./estate.css";

export const metadata: Metadata = {
  title: "Estate",
  description: "A multiplayer property trading board game",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
