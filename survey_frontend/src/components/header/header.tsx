"use client";
import Image from "next/image";
import Link from "next/link";
import useSWR from "swr";
import { useEffect } from "react";
import { MdDehaze } from "react-icons/md";
import UserCard from "../user-card/user-card";
import Notification from "../notification/notification";
import Search from "../search/search";
import { useSidebarStore } from "@/store/sidebar-store";
import useUserStore from "@/store/user.store";
import { API_ROUTES } from "@/lib/api-routes";
import { userService } from "@/services/index.service";

export default function Header() {
  const { toggleSidebar } = useSidebarStore();
  const { setUser } = useUserStore();
  const { data: user } = useSWR(API_ROUTES.users.me, userService.fetcherMe);

  useEffect(() => {
    if (user) {
      setUser(user);
    }
  }, [user, setUser]);

  return (
    <header className="flex shrink-0 items-center justify-between p-2 bg-white px-4 border-b border-gray-200 h-[60px]">
      <div className="flex items-center gap-2">
        <button
          type="button"
          aria-label="Thu gọn / mở rộng menu"
          onClick={toggleSidebar}
          className="p-2 rounded-full hover:bg-gray-100"
        >
          <MdDehaze size={22} />
        </button>
        <Link href="/home" className="flex items-center gap-2">
          <Image
            src="/logo.png"
            alt="Tecova"
            width={140}
            height={32}
            priority
            className="h-auto w-[110px] px-2 md:w-[140px]"
          />
          <h1 className="text-xl hidden md:block">KHẢO SÁT</h1>
        </Link>
      </div>

      <div className="flex items-center gap-4">
        <Search />
        <Notification content={[]} />
        <UserCard user={user} />
      </div>
    </header>
  );
}
