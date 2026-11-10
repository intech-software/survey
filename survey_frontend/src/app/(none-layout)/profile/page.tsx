"use client";
import { useState } from "react";
import { Check, Circle } from "lucide-react";
import useUserStore from "@/store/user.store";
import UpdateAvatar from "@/components/update-avatar/update-avatar";
import FieldDisplay from "@/components/field-display/field-display";
import ChangePassword, {
  PASSWORD_RULES,
} from "@/components/form-change-password/form-change-password";
import { cn } from "@/lib/utils";

const STATUS_LABELS: Record<string, string> = {
  active: "Đang hoạt động",
  inactive: "Ngừng hoạt động",
};

const formatDateTime = (value?: string | null) =>
  value
    ? new Date(value).toLocaleString("vi-VN", {
        dateStyle: "short",
        timeStyle: "short",
      })
    : "—";

export default function Profile() {
  const { user } = useUserStore();
  const [newPassword, setNewPassword] = useState("");

  return (
    <div className="w-full lg:h-full bg-white rounded-2xl shadow-md">
      <div className="grid p-2 grid-cols-1 lg:grid-cols-[1fr_2fr] lg:p-4 gap-4 h-full">
        <div className="shadow-lg border border-gray-200 p-4 rounded-lg h-full flex flex-col items-center">
          <UpdateAvatar />
          <div className="text-gray-700 mt-4 text-xl font-semibold text-center">
            {user?.name || "—"}
          </div>
          <div className="text-gray-400 text-md text-center wrap-anywhere">
            {user?.email || user?.username || "—"}
          </div>
          <div className="border border-gray-200 w-full my-2"></div>
          <p className="text-xs text-gray-400 text-center">
            Ảnh JPG, PNG hoặc WebP, tối đa 5 MB.
          </p>
        </div>

        <div className="flex flex-col gap-4 h-full p-0 lg:p-2">
          <div className="border border-gray-200 shadow-md p-4 rounded-lg">
            <h2 className="text-lg font-semibold mb-4">Thông tin cá nhân:</h2>
            <div className="w-full border border-t-gray-200 my-2"></div>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <div className="flex flex-col gap-2">
                <FieldDisplay lable="Họ và tên:" value={user?.name || "—"} />
                <FieldDisplay
                  lable="Tên đăng nhập:"
                  value={user?.username || "—"}
                />
                <FieldDisplay
                  lable="Trạng thái:"
                  value={
                    user?.status
                      ? (STATUS_LABELS[user.status] ?? user.status)
                      : "—"
                  }
                />
              </div>
              <div className="flex flex-col gap-2">
                <FieldDisplay lable="Email:" value={user?.email || "—"} />
                <FieldDisplay
                  lable="Ngày tạo tài khoản:"
                  value={formatDateTime(user?.created_at)}
                />
                <FieldDisplay
                  lable="Cập nhật lần cuối:"
                  value={formatDateTime(user?.updated_at)}
                />
              </div>
            </div>
          </div>

          <div className="border border-gray-200 shadow-md p-4 rounded-lg">
            <h2 className="text-lg font-semibold mb-4">Thay đổi mật khẩu:</h2>
            <div className="w-full border border-t-gray-200 my-2"></div>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <div>
                <ChangePassword onNewPasswordChange={setNewPassword} />
              </div>
              <div className="flex flex-col gap-2 md:pt-4">
                <h3 className="text-md text-gray-400 mb-2">
                  Mật khẩu tài khoản của bạn phải đáp ứng các yêu cầu sau:
                </h3>
                <ul className="flex flex-col gap-1 text-gray-700 pl-1">
                  {PASSWORD_RULES.map((rule) => {
                    const passed = newPassword !== "" && rule.test(newPassword);
                    return (
                      <li
                        key={rule.label}
                        className={cn(
                          "flex items-center gap-2",
                          passed && "text-green-600",
                        )}
                      >
                        {passed ? (
                          <Check className="size-4 shrink-0" />
                        ) : (
                          <Circle className="size-2 shrink-0 fill-current mx-1" />
                        )}
                        {rule.label}
                      </li>
                    );
                  })}
                </ul>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
