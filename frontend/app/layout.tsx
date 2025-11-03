import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import CollapsibleNavbar from "@/components/navigation/unav-collaps";
import { Toaster } from "sonner";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Recognize my draw - AI Quick Draw Game",
  description: "Test your drawing skills with our AI-powered quick draw game! Draw objects as fast as you can and see if our AI can recognize what you're creating.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <CollapsibleNavbar />
        {children}
        <Toaster />
      </body>
    </html>
  );
}
