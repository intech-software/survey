"use client";
import { useRef, useState } from "react";
import { mutate } from "swr";
import { toast } from "sonner";
import { FaPen } from "react-icons/fa";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Spinner } from "@/components/ui/spinner";
import { API_ROUTES } from "@/lib/api-routes";
import { getApiErrorMessage } from "@/lib/api-error";
import { getInitials, resolveAvatarUrl } from "@/lib/avatar-url";
import { userService } from "@/services/index.service";
import useUserStore from "@/store/user.store";

const MAX_BYTES = 5 * 1024 * 1024;
const ACCEPTED_TYPES = ["image/jpeg", "image/png", "image/webp"];

export default function UpdateAvatar() {
  const { user, setUser } = useUserStore();
  const [isUploading, setIsUploading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const uploadAvatar = async (file: File) => {
    if (!ACCEPTED_TYPES.includes(file.type)) {
      toast.error("Chỉ chấp nhận ảnh JPG, PNG hoặc WebP.");
      return;
    }
    if (file.size > MAX_BYTES) {
      toast.error("Ảnh vượt quá dung lượng cho phép (5 MB).");
      return;
    }
    try {
      setIsUploading(true);
      const updatedUser = await userService.uploadAvatar(file);
      setUser(updatedUser);
      await mutate(API_ROUTES.users.me, updatedUser, { revalidate: false });
      toast.success("Đã cập nhật ảnh đại diện.");
    } catch (error) {
      toast.error(getApiErrorMessage(error, "Cập nhật ảnh đại diện thất bại."));
    } finally {
      setIsUploading(false);
      if (inputRef.current) {
        inputRef.current.value = "";
      }
    }
  };

  return (
    <div className="relative">
      <Avatar className="size-40 md:size-60">
        <AvatarImage
          src={resolveAvatarUrl(user?.avatar)}
          alt={user?.name || "Ảnh đại diện"}
          className="object-cover"
        />
        <AvatarFallback className="bg-green-600 text-5xl font-semibold text-white md:text-7xl">
          {getInitials(user?.name)}
        </AvatarFallback>
      </Avatar>
      <label
        title="Đổi ảnh đại diện"
        className="bg-blue-500 size-10 md:size-12 rounded-full flex items-center justify-center text-white absolute bottom-1 right-1 md:bottom-2 md:right-2 cursor-pointer hover:bg-blue-600 has-[:disabled]:cursor-wait has-[:disabled]:opacity-70"
      >
        {isUploading ? (
          <Spinner className="size-5" />
        ) : (
          <FaPen className="size-4" />
        )}
        <span className="sr-only">Đổi ảnh đại diện</span>
        <input
          ref={inputRef}
          type="file"
          accept={ACCEPTED_TYPES.join(",")}
          disabled={isUploading}
          className="sr-only"
          onChange={(event) => {
            const file = event.target.files?.[0];
            if (file) {
              void uploadAvatar(file);
            }
          }}
        />
      </label>
    </div>
  );
}
