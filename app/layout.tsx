import "./globals.css";
import type { Metadata } from "next";
import Script from "next/script";

export const metadata: Metadata = {
  title: "Sera Time",
  description: "Watch • Work • Earn",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="am">
      <head>
        <Script src="https://telegram.org/js/telegram-web-app.js?63" strategy="beforeInteractive" />
        <Script src="https://sad.adsgram.ai/js/sad.min.js" strategy="afterInteractive" />
      </head>
      <body>{children}</body>
    </html>
  );
}
