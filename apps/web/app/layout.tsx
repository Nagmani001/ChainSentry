import type { Metadata } from "next";
import { Inter, Roboto_Mono } from "next/font/google";
import "./globals.css";
import { AppShell } from "../components/AppShell";
import { PrivyShell } from "../components/PrivyShell";

const inter = Inter({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-sans-fallback",
  display: "swap",
});

const robotoMono = Roboto_Mono({
  subsets: ["latin"],
  weight: ["400", "500"],
  variable: "--font-mono-fallback",
  display: "swap",
});

export const metadata: Metadata = {
  title: "ChainSentry",
  description: "Observability for smart contracts — logs, metrics and traces.",
  icons: {
    icon: [
      { url: "/icon.png", type: "image/png" },
      { url: "/logo.png", type: "image/png" },
    ],
    apple: [{ url: "/apple-icon.png", type: "image/png" }],
  },
  openGraph: {
    title: "ChainSentry",
    description: "Observability for smart contracts — logs, metrics and traces.",
    images: [{ url: "/opengraph-image.png", type: "image/png" }],
  },
  twitter: {
    card: "summary_large_image",
    title: "ChainSentry",
    description: "Observability for smart contracts — logs, metrics and traces.",
    images: ["/opengraph-image.png"],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${inter.variable} ${robotoMono.variable}`}>
      <body suppressHydrationWarning>
        <PrivyShell>
          <AppShell>{children}</AppShell>
        </PrivyShell>
      </body>
    </html>
  );
}
