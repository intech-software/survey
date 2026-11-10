import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { cookies } from "next/headers";
import { TokenProvider } from "@/store/token.store";
import { Toaster } from "@/components/ui/sonner";
import { ThemeProvider } from "@/components/theme-provider/theme-provider";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Survey",
  description: "Ứng dụng dùng cho hoạt động khảo sát dự án team GxP.",
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const cookieStore = await cookies();
  const accessToken = cookieStore.get("accessToken")?.value;
  const refreshToken = cookieStore.get("refreshToken")?.value;

  return (
    <html lang="vi" suppressHydrationWarning>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <ThemeProvider
          attribute="class"
          defaultTheme="light"
          enableSystem
          disableTransitionOnChange
        >
          <TokenProvider
            initalToken={{
              accessToken: accessToken || null,
              refreshToken: refreshToken || null,
            }}
          >
            {children}
            <Toaster position="top-right" />
          </TokenProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
