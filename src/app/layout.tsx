import { Suspense } from "react";
import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { CartProvider } from "./components/cart-provider";
import ClearLegacyPwaCache from "./components/clear-legacy-pwa-cache";
import DynamicIslandNav from "./components/dynamic-island-nav";
import MountainLayout from "./components/mountain-layout";
import { Providers } from "./components/providers";
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
  title: "Altitude Cafe",
  description: "Coffee, rewards, and campus events at Altitude Cafe.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        <Providers>
          <CartProvider>
            <ClearLegacyPwaCache />
            <MountainLayout>{children}</MountainLayout>
            <Suspense
              fallback={
                <div
                  aria-hidden="true"
                  className="fixed inset-x-0 bottom-[calc(1rem+env(safe-area-inset-bottom))] z-50 mx-auto h-[3.75rem] w-[min(26rem,calc(100%-2rem))] rounded-full border border-white/10 bg-altitude-black/95 shadow-2xl shadow-black/30 backdrop-blur-xl"
                />
              }
            >
              <DynamicIslandNav />
            </Suspense>
          </CartProvider>
        </Providers>
      </body>
    </html>
  );
}
