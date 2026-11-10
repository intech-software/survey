"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import useMobile from "@/hooks/use-mobile";
import { useSidebarStore } from "@/store/sidebar-store";

function SidebarMenu({
  item,
  isOpen,
}: {
  item: {
    id: string;
    name: string;
    icon: React.ReactNode;
    url: string;
  };
  isOpen: boolean;
}) {
  const pathname = usePathname();
  const firstPath = "/" + pathname.split("/")[1];
  const isMobile = useMobile();
  const { closeSidebar } = useSidebarStore();

  return (
    <div
      className={`w-full border-b border-gray-200 pl-4 text-sm font-normal ${
        item.url === firstPath
          ? "bg-blue-100 text-gray-800"
          : "text-gray-600"
      } hover:bg-blue-50 hover:text-gray-800`}
    >
      <Link href={item.url} onClick={() => isMobile && closeSidebar()}>
        <div className="flex items-center gap-2 p-2 ">
          {item.icon}
          {isOpen && item.name}
        </div>
      </Link>
    </div>
  );
}

export default function Sidebar({
  isOpen,
  data,
  isMobile,
}: {
  isOpen: boolean;
  data: any[];
  isMobile: boolean;
}) {
  return (
    <div
      className={` border-r border-gray-200 h-full min-h-0 shrink-0 overflow-y-auto ${isMobile && !isOpen ? "w-0" : isOpen ? "w-64" : "w-20"} transition-all duration-300 ease-in-out`}
    >
      <div className="flex flex-col h-full justify-between">
        <div className="flex flex-col items-center justify-between p-2 w-full">
          {data.map((item) => (
            <SidebarMenu key={item.id} item={item} isOpen={isOpen} />
          ))}
        </div>
        <div className="p-2 text-center text-sm text-gray-500">
          version beta 1.0.0
        </div>
      </div>
    </div>
  );
}
