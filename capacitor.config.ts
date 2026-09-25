import type { CapacitorConfig } from "@capacitor/cli";
const config: CapacitorConfig = {
  appId: "com.seratime.app",
  appName: "Sera Time",
  webDir: "public",
  server: {
    url: process.env.NEXT_PUBLIC_APP_URL || "https://YOUR-DOMAIN.vercel.app",
    cleartext: false
  }
};
export default config;
