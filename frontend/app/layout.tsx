import type { Metadata, Viewport } from "next";
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

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#ffffff" },
    { media: "(prefers-color-scheme: dark)", color: "#1a1a1a" },
  ],
};

export const metadata: Metadata = {
  title: "SonifyReads",
  description: "Convert your PDF documents into high-quality audio files. Upload, process, and receive audio via email in minutes.",
  keywords: ["audio converter", "PDF reader", "text-to-speech", "accessibility tool", "document audio"],
  
  openGraph: {
    title: "SonifyReads - Listen to Your Documents",
    description: "Transform reading into listening. Convert any PDF into natural-sounding audio.",
    url: "https://sonifyreads.vercel.app",
    siteName: "SonifyReads",
    images: [
      {
        url: "https://sonifyreads.vercel.app/favicon.ico",
        width: 1200,
        height: 630,
      },
    ],
    locale: "en_US",
    type: "website",
  },
  
  twitter: {
    card: "summary_large_image",
    title: "SonifyReads - PDF to Audio",
    description: "Your documents, in audio form.",
    images: ["https://sonifyreads.vercel.app/favicon.ico"],
  },
  
  icons: {
    icon: [
      { url: "/favicon.ico" },
      { url: "/favicon-16x16.png", sizes: "16x16", type: "image/png" },
      { url: "/favicon-32x32.png", sizes: "32x32", type: "image/png" },
    ],
    apple: [
      { url: "/apple-touch-icon.png", sizes: "180x180", type: "image/png" },
    ],
    other: [
      {
        rel: "mask-icon",
        url: "/favicon.ico",
        color: "#5bbad5",
      },
    ],
  },
  
  manifest: "/site.webmanifest"
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
        {children}
      </body>
    </html>
  );
}