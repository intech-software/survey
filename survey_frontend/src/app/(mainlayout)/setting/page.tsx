"use client";

import { UsersPage } from "@/features/users";
import { cn } from "@/lib/utils";
import { Settings, Users } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { type ComponentType, Suspense } from "react";

type SettingSection = {
  key: string;
  label: string;
  description: string;
  icon: ComponentType<{ className?: string }>;
};

// Same layout as EBR's /setting page. Add new sections here.
const SETTING_SECTIONS: SettingSection[] = [
  {
    key: "users",
    label: "Người dùng",
    description: "Thêm, sửa, khóa và xóa tài khoản đăng nhập.",
    icon: Users,
  },
];

const DEFAULT_SECTION = SETTING_SECTIONS[0].key;

function SettingPlaceholder() {
  return (
    <div className="flex h-full min-h-80 flex-col items-center justify-center rounded-lg border border-dashed bg-white p-8 text-center">
      <Settings className="mb-3 size-8 text-gray-400" />
      <h2 className="text-lg font-semibold">Chọn một mục cài đặt</h2>
      <p className="mt-1 max-w-md text-sm text-gray-500">
        Các nhóm cài đặt hệ thống sẽ được quản lý trong khu vực này.
      </p>
    </div>
  );
}

function SettingContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const activeSection = searchParams.get("section") ?? DEFAULT_SECTION;

  return (
    <div className="flex h-full min-h-0 flex-col gap-3 rounded-lg bg-white p-3 shadow-md">
      <div className="border-b pb-3">
        <h1 className="text-xl font-semibold">Cài đặt</h1>
        <p className="mt-1 text-sm text-gray-500">
          Quản lý các cấu hình vận hành của hệ thống.
        </p>
      </div>

      <div className="grid min-h-0 flex-1 grid-rows-[auto_minmax(0,1fr)] gap-3 lg:grid-cols-[280px_minmax(0,1fr)] lg:grid-rows-1">
        <aside className="min-h-0 rounded-md border bg-gray-50 p-2">
          <div className="space-y-1">
            {SETTING_SECTIONS.map((section) => {
              const Icon = section.icon;
              const isActive = activeSection === section.key;

              return (
                <button
                  key={section.key}
                  type="button"
                  onClick={() => router.push(`/setting?section=${section.key}`)}
                  className={cn(
                    "flex w-full items-start gap-3 rounded-md p-3 text-left transition",
                    isActive
                      ? "bg-white shadow-sm ring-1 ring-blue-100"
                      : "hover:bg-white",
                  )}
                >
                  <Icon
                    className={cn(
                      "mt-0.5 size-5 shrink-0",
                      isActive ? "text-blue-600" : "text-gray-500",
                    )}
                  />
                  <span className="min-w-0">
                    <span className="block text-sm font-semibold">
                      {section.label}
                    </span>
                    <span className="mt-0.5 block text-xs leading-5 text-gray-500">
                      {section.description}
                    </span>
                  </span>
                </button>
              );
            })}
          </div>
        </aside>

        <main className="min-h-[60dvh] overflow-hidden lg:min-h-0">
          {activeSection === "users" ? <UsersPage /> : <SettingPlaceholder />}
        </main>
      </div>
    </div>
  );
}

export default function SettingPage() {
  return (
    <Suspense fallback={null}>
      <SettingContent />
    </Suspense>
  );
}
