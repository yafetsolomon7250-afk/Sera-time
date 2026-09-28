import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Sera Time — Work • Earn • Grow",
  description: "Sera Time Ethiopian work marketplace",
  manifest: "/manifest.webmanifest",
  themeColor: "#07111f"
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="am"><body>{children}</body></html>;
}
