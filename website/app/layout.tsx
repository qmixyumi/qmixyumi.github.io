import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "QMI × YUMI | 旅行冒險日誌",
  description: "每段旅程，都是我們的支線任務。雙人旅行藏寶圖、旅費與回憶。",
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
    <html lang="zh-HK">
      <body className="antialiased">{children}</body>
    </html>
  );
}
