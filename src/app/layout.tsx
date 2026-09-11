import type { Metadata, Viewport } from "next";
import "@fontsource/ibm-plex-sans-arabic/400.css";
import "@fontsource/ibm-plex-sans-arabic/500.css";
import "@fontsource/ibm-plex-sans-arabic/600.css";
import "@fontsource/inter/400.css";
import "@fontsource/inter/500.css";
import "@fontsource/inter/600.css";
import "./tokens.css";
import "./globals.css";
import { appConfig } from "@/config/app";
import { color } from "@/design/tokens";
import { getContext, readAppearanceCookie } from "@/server/session";

export async function generateMetadata(): Promise<Metadata> {
  const ctx = await getContext();
  const name = ctx?.data.household.settings.productName ?? appConfig.defaultProductName;
  return {
    title: { default: name, template: `%s · ${name}` },
    description: "متابعة رحلة الحمل والولادة وما بعدها",
    applicationName: name,
    appleWebApp: { capable: true, statusBarStyle: "black-translucent", title: name },
  };
}

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: color.canvas },
    { media: "(prefers-color-scheme: dark)", color: color.darkCanvas },
  ],
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const [ctx, appearance] = await Promise.all([getContext(), readAppearanceCookie()]);
  // The cookie (a device preference) wins when present: it is unaffected by
  // which demo store instance answers this request. See appearanceCookie().
  const theme = appearance?.theme ?? ctx?.data.household.settings.theme ?? "system";
  const reduceMotion = (appearance?.reduceMotion ?? ctx?.data.household.settings.reduceMotion) ? "reduced" : undefined;
  return (
    <html lang="ar" dir="rtl" data-theme={theme === "system" ? undefined : theme} data-motion={reduceMotion}>
      <body>{children}</body>
    </html>
  );
}
