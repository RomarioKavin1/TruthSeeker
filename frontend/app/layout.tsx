import type { Metadata } from "next";
import { IBM_Plex_Mono } from "next/font/google";

import "./globals.css";
import { ClientWalletProvider } from "./components/ClientWalletProvider";

const ibmPlexMono = IBM_Plex_Mono({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-ibm-plex-mono",
});

export const metadata: Metadata = {
  title: "TruthSeeker - Zero-Knowledge Identity Verification",
  description:
    "Discover truth through blockchain-verified content and zero-knowledge identity verification",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`${ibmPlexMono.variable} antialiased`}>
        <ClientWalletProvider>{children}</ClientWalletProvider>
      </body>
    </html>
  );
}
