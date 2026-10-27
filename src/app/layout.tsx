import type { ReactNode } from "react";
import { IBM_Plex_Sans, JetBrains_Mono } from "next/font/google";
import { Footer } from "@/components/site/Footer";
import { TopBar } from "@/components/site/TopBar";
import { getContent } from "@/content";
import "./globals.css";

const plexSans = IBM_Plex_Sans({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-plex-sans",
});

const jetbrainsMono = JetBrains_Mono({
  subsets: ["latin"],
  weight: ["400", "500", "700"],
  variable: "--font-jetbrains-mono",
});

export default function RootLayout({ children }: { children: ReactNode }) {
  const { topBar, footer } = getContent().home();

  return (
    <html lang="en-GB" className={`${plexSans.variable} ${jetbrainsMono.variable}`}>
      <body className="min-h-screen font-sans antialiased">
        <TopBar {...topBar} />
        {children}
        <Footer {...footer} />
      </body>
    </html>
  );
}
