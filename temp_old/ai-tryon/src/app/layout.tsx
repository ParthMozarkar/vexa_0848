import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import Navbar from "@/components/Navbar";

const inter = Inter({ subsets: ["latin"], display: "swap" });

export const metadata: Metadata = {
  title: "VEXA — AI 3D Body Avatar Platform",
  description:
    "VEXA is a B2B SaaS API platform powering personalized 3D body avatars for fashion marketplaces. Give every shopper a try-on that looks like them.",
  openGraph: {
    title: "VEXA — AI 3D Body Avatar Platform",
    description:
      "Personalized 3D avatars for fashion marketplaces. Built on SMPL-X + React Three Fiber.",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <body className={`${inter.className} antialiased`}>
        <Navbar />
        <main className="min-h-screen pt-20">
          {children}
        </main>
      </body>
    </html>
  );
}
