import type { Metadata } from "next";
import { Plus_Jakarta_Sans } from "next/font/google";
import "./globals.css";

const plusJakartaSans = Plus_Jakarta_Sans({
  variable: "--font-plus-jakarta-sans",
  subsets: ["latin", "vietnamese"],
  display: 'swap',
});

export const metadata: Metadata = {
  title: "Ẩm thực Cần Giuộc Review",
  description: "Khám phá ẩm thực Cần Giuộc - Review quán ăn, tìm món ngon gần bạn",
  manifest: "/manifest.json",
  themeColor: "#f97316",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "Ăn Uống CG",
  },
  icons: {
    icon: "/icon-512x512.png",
    apple: "/icon-192x192.png",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="vi">
      <head>
        <meta name="application-name" content="Ăn Uống Cần Giuộc" />
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="default" />
        <meta name="apple-mobile-web-app-title" content="Ăn Uống CG" />
        <meta name="theme-color" content="#f97316" />
        <link rel="manifest" href="/manifest.json" />
        <link rel="apple-touch-icon" href="/icon-192x192.png" />
      </head>
      <body className={`${plusJakartaSans.variable} antialiased`}>
        {children}
        <script
          dangerouslySetInnerHTML={{
            __html: `
              if ('serviceWorker' in navigator) {
                window.addEventListener('load', function() {
                  navigator.serviceWorker.register('/sw.js').catch(function(err) {
                    console.log('SW registration failed:', err);
                  });
                });
              }
            `,
          }}
        />
      </body>
    </html>
  );
}
