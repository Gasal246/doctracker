import type { Metadata } from "next";
import { Patrick_Hand, Short_Stack } from "next/font/google";
import "./globals.css";

const sketchSans = Patrick_Hand({
  variable: "--font-sketch-sans",
  subsets: ["latin"],
  weight: "400",
});

const sketchAccent = Short_Stack({
  variable: "--font-sketch-accent",
  subsets: ["latin"],
  weight: "400",
});

export const metadata: Metadata = {
  title: "Doc Tracker",
  description: "Sketch-styled document expiry tracking application",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${sketchSans.variable} ${sketchAccent.variable} h-full`}
    >
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
