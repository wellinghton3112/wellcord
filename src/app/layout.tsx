import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Wellcord BETA 0.1.25 - Chat com amigos",
  description: "Wellcord BETA 0.1.25 - Clone do Discord com Next.js + Supabase",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="pt-BR" className={`${geistSans.variable} ${geistMono.variable} h-full`}>
      <body className="h-full bg-[#313338] text-zinc-100 antialiased overflow-hidden">{children}</body>
    </html>
  );
}
