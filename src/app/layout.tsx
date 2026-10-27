import type { ReactNode } from "react";
import type { Metadata } from "next";
import { IBM_Plex_Sans, JetBrains_Mono } from "next/font/google";
import { Footer } from "@/components/site/Footer";
import { TopBar } from "@/components/site/TopBar";
import { getContent } from "@/content";
import { baseOpenGraph } from "./metadata";
import "./globals.css";

// No canonical here: each page sets its own, and an inherited one would point every page at home.
export const metadata: Metadata = {
  metadataBase: new URL(getContent().siteUrl()),
  openGraph: baseOpenGraph(),
};

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
