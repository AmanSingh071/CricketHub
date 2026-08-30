import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "CricketHub | Live Cricket",
  description: "Live cricket scores, fixtures, rankings and match centres.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
