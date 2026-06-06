import type { Metadata } from "next";
import { Geist, Geist_Mono, Barlow_Condensed, JetBrains_Mono } from "next/font/google";
import "./globals.css";
import { DashboardProvider } from "@/lib/dashboard-context";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const barlowCondensed = Barlow_Condensed({
  variable: "--font-barlow",
  subsets: ["latin"],
  weight: ["400", "600", "700", "800"],
});

const jetbrainsMono = JetBrains_Mono({
  variable: "--font-jetbrains",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

export const metadata: Metadata = {
  title: "Chad Polio Campaign — War Room",
  description: "Real-time campaign coverage dashboard",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} ${barlowCondensed.variable} ${jetbrainsMono.variable} h-full antialiased ltheme`}
    >
      <body className="min-h-full flex flex-col">
        <DashboardProvider>{children}</DashboardProvider>
      </body>
    </html>
  );
}
