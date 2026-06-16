import type { Metadata } from "next";
import { Outfit } from "next/font/google";
import "./globals.css";
import { ToastProvider } from "@/components/Toast";
import { SidebarProvider } from "@/context/SidebarContext";
import { ThemeProvider } from "@/components/theme-provider";

const outfit = Outfit({
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "SIPAS - Sistem Informasi Persuratan",
  description:
    "Sistem Informasi Persuratan Digital untuk pengelolaan surat masuk, surat keluar, dan approval.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="id" suppressHydrationWarning>
      <head>
        {/* Material Symbols for Toast and existing components */}
        <link
          href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:wght,FILL@100..700,0..1&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className={outfit.className}>
        <ThemeProvider attribute="class" defaultTheme="light" enableSystem>
          <SidebarProvider>
            <ToastProvider>{children}</ToastProvider>
          </SidebarProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}

