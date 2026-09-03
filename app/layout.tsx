import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Album / Bouquet",
  description: "Turn an album or song cover into a florist-ready bouquet reference.",
  icons: {
    icon: "/favicon.svg",
    shortcut: "/favicon.svg",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="antialiased">{children}</body>
    </html>
  );
}
