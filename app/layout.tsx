import type { Metadata, Viewport } from "next";
import type { ReactNode } from "react";
import Script from "next/script";
import "./globals.css";

export const metadata: Metadata = {
  title: "Sera Time",
  description: "የኢትዮጵያ ስራ እና ገቢ መድረክ — ስራ ይስሩ፣ ገቢ ያግኙ",
  manifest: "/manifest.webmanifest",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: "#07111f",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="am">
      <body>
        <Script
          src="https://telegram.org/js/telegram-web-app.js?63"
          strategy="beforeInteractive"
        />
        {children}
      </body>
    </html>
  );
}
