import type { Metadata } from "next";
import { SideNav } from "@/components/layout/SideNav";
import { TopNav } from "@/components/layout/TopNav";
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
  title: "dotCMS Headless",
  description: "Next.js front end for a headless dotCMS instance",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full">
        <div className="flex min-h-screen">
          <SideNav />
          <div className="flex min-w-0 flex-1 flex-col">
            <TopNav />
            <main className="flex-1 bg-brand-canvas p-12">{children}</main>
          </div>
        </div>
      </body>
    </html>
  );
}
