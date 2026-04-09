import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "UNISON",
  description: "What happens when something that can think gets sent somewhere it was never meant to exist?",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
