"use client";

import { useEffect } from "react";
import { House } from "lucide-react";
import Header from "@/components/header/header";
import Sidebar from "@/components/sidebar/sidebar";
import useMobile from "@/hooks/use-mobile";
import { useSidebarStore } from "@/store/sidebar-store";

// Sidebar menu. Add one entry per page under src/app/(mainlayout).
const data = [
  {
    id: "home",
    name: "Trang chủ",
    icon: <House className="size-5 shrink-0" />,
    url: "/home",
  },
];

export default function MainLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const { isOpen, closeSidebar } = useSidebarStore();
  const isMobile = useMobile();

  // Same behaviour as EBR: the sidebar starts collapsed on phones/tablets.
  useEffect(() => {
    if (isMobile) {
      closeSidebar();
    }
  }, [isMobile, closeSidebar]);

  return (
    <div className="flex h-dvh flex-col overflow-hidden">
      <Header />
      <div className="flex min-h-0 flex-1 overflow-hidden">
        <Sidebar isOpen={isOpen} data={data} isMobile={isMobile} />
        <div className="relative min-h-0 min-w-0 flex-1 overflow-auto bg-blue-50 p-2">
          {children}
        </div>
      </div>
    </div>
  );
}
