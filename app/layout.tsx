import type { Metadata } from "next";
import { Source_Sans_3, Barlow_Condensed } from "next/font/google";
import "./globals.css";
import { DashboardProvider } from "@/lib/dashboard-context";

const sourceSans = Source_Sans_3({
  variable: "--font-source-sans",
  subsets: ["latin", "latin-ext"],
  weight: ["400", "600", "700"],
});

const barlowCondensed = Barlow_Condensed({
  variable: "--font-barlow",
  subsets: ["latin"],
  weight: ["400", "600", "700", "800"],
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
      className={`${sourceSans.variable} ${barlowCondensed.variable} h-full antialiased ltheme`}
    >
      <body className="min-h-full flex flex-col">
        <DashboardProvider>{children}</DashboardProvider>
      </body>
    </html>
  );
}
