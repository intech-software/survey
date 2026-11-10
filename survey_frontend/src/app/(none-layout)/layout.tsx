"use client";
import Header from "@/components/header/header";

// Pages without the sidebar (same as EBR's (none-layout) used by /profile).
export default function NoneLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <div className="flex h-dvh flex-col overflow-hidden">
      <Header />
      <div className="flex min-h-0 flex-1 overflow-hidden">
        <div className="min-w-0 flex-1 overflow-auto p-2 bg-blue-50">
          {children}
        </div>
      </div>
    </div>
  );
}
