import "./globals.css";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Sera Time",
  description: "Sera Time Ethiopian work marketplace"
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return <html lang="am"><body>{children}</body></html>;
}
