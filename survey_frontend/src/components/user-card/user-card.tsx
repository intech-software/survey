"use client";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useRouter } from "next/navigation";
import { useLogout } from "@/hooks/use-logout";
import { getInitials, resolveAvatarUrl } from "@/lib/avatar-url";
import { LayoutGrid, LogOut, Settings, User } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

const ALL_APPLICATIONS_URL = process.env.NEXT_PUBLIC_ALL_APPLICATIONS_URL;

type UserCardProps = {
  user: CurrentUser | null | undefined;
  variant?: "default" | "hero";
};

export default function UserCard({ user, variant = "default" }: UserCardProps) {
  const { logout } = useLogout();
  const router = useRouter();
  const isHero = variant === "hero";
  const subtitle =
    [user?.position, user?.department].filter(Boolean).join(" ") ||
    user?.username;

  return (
    <div>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button
            type="button"
            aria-label="Tài khoản"
            className={cn(
              "flex items-center gap-2 rounded-full transition",
              isHero
                ? "px-2 py-1 hover:bg-white/10 focus-visible:bg-white/10"
                : "",
            )}
          >
            <div
              className={cn(
                "hidden flex-col md:flex",
                isHero ? "items-end text-right" : "items-end text-right",
              )}
            >
              {user ? (
                <>
                  <span
                    className={cn(
                      "font-bold",
                      isHero ? "text-sm font-semibold text-white" : "",
                    )}
                  >
                    {user.name}
                  </span>
                  <span
                    className={cn(
                      "text-xs",
                      isHero ? "text-white/60" : "text-gray-500",
                    )}
                  >
                    {subtitle}
                  </span>
                </>
              ) : (
                <>
                  <Skeleton
                    className={cn("mb-1 h-4 w-24", isHero ? "bg-white/12" : "")}
                  />
                  <Skeleton
                    className={cn("h-4 w-24", isHero ? "bg-white/12" : "")}
                  />
                </>
              )}
            </div>
            <Avatar
              size={isHero ? "lg" : "default"}
              className={cn(
                isHero
                  ? "ring-2 ring-white/15 shadow-[0_8px_20px_rgba(0,0,0,0.25)]"
                  : "",
              )}
            >
              {user?.avatar && (
                <AvatarImage
                  src={resolveAvatarUrl(user.avatar)}
                  alt={user.name}
                  className="object-cover"
                />
              )}
              <AvatarFallback className="bg-green-600 text-white font-semibold">
                {user ? (
                  getInitials(user.name)
                ) : (
                  <Skeleton className="size-full rounded-full" />
                )}
              </AvatarFallback>
            </Avatar>
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="min-w-56">
          {user && (
            <>
              <DropdownMenuLabel className="flex flex-col">
                <span className="font-semibold">{user.name}</span>
                <span className="text-xs font-normal text-gray-500">
                  {user.email || user.username}
                </span>
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
            </>
          )}
          {/* The settings page is not built yet. */}
          <DropdownMenuItem disabled>
            <Settings className="mr-2 h-4 w-4" />
            Cài đặt
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => router.push("/profile")}>
            <User className="mr-2 h-4 w-4" />
            Hồ sơ cá nhân
          </DropdownMenuItem>
          <DropdownMenuItem
            disabled={!ALL_APPLICATIONS_URL}
            onClick={() => {
              if (ALL_APPLICATIONS_URL) {
                window.location.href = ALL_APPLICATIONS_URL;
              }
            }}
          >
            <LayoutGrid className="mr-2 h-4 w-4" />
            Tất cả ứng dụng
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem
            variant="destructive"
            onClick={async () => {
              await logout();
            }}
          >
            <LogOut className="mr-2 h-4 w-4" />
            Đăng xuất
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}
