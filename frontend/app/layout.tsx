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
  title: "SonifyReads",
  description: "Convert your PDF documents into high-quality audio files. Upload, process, and receive audio via email in minutes.",
  keywords: ["audio converter", "PDF reader", "text-to-speech", "accessibility tool", "document audio"],
  
  openGraph: {
    title: "SonifyReads - Listen to Your Documents",
    description: "Transform reading into listening. Convert any PDF into natural-sounding audio.",
    url: "https://sonifyreads.com",
    siteName: "SonifyReads",
    images: [
      {
        url: "https://sonifyreads.com/og-image.jpg",
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
    images: ["https://sonifyreads.com/twitter-card.jpg"],
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
        url: "/safari-pinned-tab.svg",
        color: "#5bbad5",
      },
    ],
  },
  
  manifest: "/site.webmanifest",
  
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#ffffff" },
    { media: "(prefers-color-scheme: dark)", color: "#1a1a1a" },
  ],
  
  viewport: {
    width: "device-width",
    initialScale: 1,
    maximumScale: 1,
  },
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
