"use client";

import { PASSWORD_RULES } from "@/components/form-change-password/form-change-password";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { API_ROUTES } from "@/lib/api-routes";
import { getInitials, resolveAvatarUrl } from "@/lib/avatar-url";
import { getSearchScopePath, matchesSearchKeyword } from "@/lib/search-utils";
import userService, { type ManagedUserPayload } from "@/services/user.service";
import useSearchStore from "@/store/search.store";
import useUserStore from "@/store/user.store";
import { Check, Edit2, Eye, EyeOff, Loader2, Plus, Trash2, X } from "lucide-react";
import { usePathname } from "next/navigation";
import { type FormEvent, useMemo, useState } from "react";
import { toast } from "sonner";
import useSWR from "swr";

type UserForm = {
  username: string;
  name: string;
  email: string;
  status: "active" | "inactive";
  password: string;
};

const emptyForm = (): UserForm => ({
  username: "",
  name: "",
  email: "",
  status: "active",
  password: "",
});

const ERROR_MESSAGES: Record<string, string> = {
  "Username already exists": "Tên đăng nhập đã tồn tại (kể cả tài khoản đã xóa).",
  "Email already exists": "Email đã được dùng cho tài khoản khác.",
  "Username or email already exists": "Tên đăng nhập hoặc email đã tồn tại.",
  "You cannot delete your own account": "Bạn không thể xóa tài khoản đang đăng nhập.",
  "You cannot deactivate your own account":
    "Bạn không thể khóa tài khoản đang đăng nhập.",
  "User not found": "Không tìm thấy người dùng.",
  "email must be an email": "Email không hợp lệ.",
};

const getErrorMessage = (error: unknown, fallback: string) => {
  const data = (
    error as { response?: { data?: { message?: unknown } } }
  )?.response?.data;
  const raw = data?.message;
  const messages = Array.isArray(raw) ? raw : typeof raw === "string" ? [raw] : [];
  if (messages.length === 0) return fallback;
  return messages
    .map((message) => ERROR_MESSAGES[String(message)] ?? String(message))
    .join("; ");
};

const formatDate = (value?: string | null) =>
  value ? new Date(value).toLocaleDateString("vi-VN") : "";

const USERNAME_PATTERN = /^[A-Za-z0-9._-]{3,50}$/;
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const selectClassName =
  "min-h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring disabled:cursor-not-allowed disabled:opacity-50";

function StatusPill({ status }: { status: string }) {
  const active = status === "active";
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-xs font-semibold ring-1 ${
        active
          ? "bg-green-50 text-green-700 ring-green-200"
          : "bg-gray-100 text-gray-600 ring-gray-200"
      }`}
    >
      <span
        className={`size-2 rounded-full ${active ? "bg-green-600" : "bg-gray-400"}`}
      />
      {active ? "Hoạt động" : "Đã khóa"}
    </span>
  );
}

export default function UsersPage() {
  const pathname = usePathname();
  const currentUser = useUserStore((state) => state.user);
  const searchKeyword = useSearchStore(
    (state) => state.searchByPath[getSearchScopePath(pathname)] ?? "",
  );
  const { data, error, isLoading, mutate } = useSWR(
    API_ROUTES.users.base,
    userService.fetchUsers,
  );

  const [editingUser, setEditingUser] = useState<CurrentUser | null>(null);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [form, setForm] = useState<UserForm>(emptyForm);
  const [showPassword, setShowPassword] = useState(false);
  const [deletingUser, setDeletingUser] = useState<CurrentUser | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const users = useMemo(
    () =>
      (data ?? []).filter((user) =>
        matchesSearchKeyword(
          [user.username, user.name, user.email],
          searchKeyword,
        ),
      ),
    [data, searchKeyword],
  );

  const isEditing = Boolean(editingUser);
  const isSelf = (user: CurrentUser | null) =>
    Boolean(user && currentUser && user.id === currentUser.id);
  const passwordFilled = form.password.length > 0;

  const openCreate = () => {
    setEditingUser(null);
    setForm(emptyForm());
    setShowPassword(false);
    setIsFormOpen(true);
  };

  const openEdit = (user: CurrentUser) => {
    setEditingUser(user);
    setForm({
      username: user.username,
      name: user.name,
      email: user.email ?? "",
      status: user.status === "inactive" ? "inactive" : "active",
      password: "",
    });
    setShowPassword(false);
    setIsFormOpen(true);
  };

  const closeForm = () => {
    if (isSubmitting) return;
    setIsFormOpen(false);
    setEditingUser(null);
  };

  const validate = () => {
    if (!USERNAME_PATTERN.test(form.username.trim())) {
      toast.error(
        "Tên đăng nhập 3–50 ký tự, chỉ gồm chữ không dấu, số, dấu chấm, gạch dưới, gạch ngang.",
      );
      return false;
    }
    if (!form.name.trim()) {
      toast.error("Vui lòng nhập họ tên.");
      return false;
    }
    if (form.email.trim() && !EMAIL_PATTERN.test(form.email.trim())) {
      toast.error("Email không hợp lệ.");
      return false;
    }
    if (!isEditing || passwordFilled) {
      if (
        form.password.length > 50 ||
        !PASSWORD_RULES.every((rule) => rule.test(form.password))
      ) {
        toast.error("Mật khẩu chưa đáp ứng đủ yêu cầu.");
        return false;
      }
    }
    return true;
  };

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (isSubmitting || !validate()) return;

    setIsSubmitting(true);
    try {
      if (editingUser) {
        const payload: ManagedUserPayload = {};
        const username = form.username.trim();
        const name = form.name.trim();
        const email = form.email.trim() || null;
        if (username !== editingUser.username) payload.username = username;
        if (name !== editingUser.name) payload.name = name;
        if (email !== (editingUser.email ?? null)) payload.email = email;
        if (form.status !== editingUser.status) payload.status = form.status;
        if (passwordFilled) payload.password = form.password;

        if (Object.keys(payload).length === 0) {
          setIsFormOpen(false);
          return;
        }
        await userService.updateUser(editingUser.id, payload);
        toast.success(
          payload.password
            ? "Đã cập nhật người dùng và đặt lại mật khẩu."
            : "Đã cập nhật người dùng.",
        );
      } else {
        await userService.createUser({
          username: form.username.trim(),
          name: form.name.trim(),
          email: form.email.trim() || null,
          status: form.status,
          password: form.password,
        });
        toast.success("Đã thêm người dùng.");
      }
      await mutate();
      setIsFormOpen(false);
      setEditingUser(null);
    } catch (submitError) {
      toast.error(
        getErrorMessage(
          submitError,
          editingUser ? "Không thể cập nhật người dùng." : "Không thể thêm người dùng.",
        ),
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const confirmDelete = async () => {
    if (!deletingUser) return;
    setIsSubmitting(true);
    try {
      await userService.deleteUser(deletingUser.id);
      toast.success("Đã xóa người dùng.");
      setDeletingUser(null);
      await mutate();
    } catch (deleteError) {
      toast.error(getErrorMessage(deleteError, "Không thể xóa người dùng."));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="flex h-full min-h-0 flex-col overflow-hidden rounded-md border bg-white">
      <div className="flex items-center justify-between gap-2 border-b p-3">
        <div className="min-w-0">
          <h2 className="text-base font-semibold">Người dùng</h2>
          <p className="text-xs text-gray-500">
            {data ? `${data.length} tài khoản` : "Quản lý tài khoản đăng nhập"}
          </p>
        </div>
        <Button
          type="button"
          size="sm"
          className="shrink-0 bg-slate-900 text-white hover:bg-slate-800"
          onClick={openCreate}
        >
          <Plus className="size-4" />
          Thêm mới
        </Button>
      </div>

      <div className="min-h-0 flex-1 overflow-auto">
        {isLoading && !data ? (
          <div className="divide-y">
            {Array.from({ length: 5 }).map((_, index) => (
              <div key={index} className="flex items-center gap-3 p-3">
                <Skeleton className="size-10 rounded-full" />
                <div className="flex-1 space-y-2">
                  <Skeleton className="h-4 w-40" />
                  <Skeleton className="h-3 w-24" />
                </div>
              </div>
            ))}
          </div>
        ) : error && !data ? (
          <p className="p-4 text-center text-sm text-red-600">
            {getErrorMessage(error, "Không thể tải danh sách người dùng.")}
          </p>
        ) : users.length === 0 ? (
          <p className="p-4 text-center text-sm text-gray-500">
            {searchKeyword ? "Không có người dùng phù hợp." : "Chưa có người dùng."}
          </p>
        ) : (
          <>
            {/* Desktop / tablet: table */}
            <table className="hidden w-full text-sm md:table">
              <thead className="sticky top-0 z-10 bg-gray-50 text-left text-xs uppercase text-gray-500">
                <tr>
                  <th className="px-3 py-2 font-semibold">Người dùng</th>
                  <th className="px-3 py-2 font-semibold">Email</th>
                  <th className="px-3 py-2 font-semibold">Trạng thái</th>
                  <th className="px-3 py-2 font-semibold">Ngày tạo</th>
                  <th className="w-24 px-3 py-2" />
                </tr>
              </thead>
              <tbody className="divide-y">
                {users.map((user) => (
                  <tr key={user.id} className="hover:bg-gray-50">
                    <td className="px-3 py-2">
                      <div className="flex items-center gap-3">
                        <Avatar className="size-9">
                          <AvatarImage src={resolveAvatarUrl(user.avatar)} alt="" />
                          <AvatarFallback>{getInitials(user.name)}</AvatarFallback>
                        </Avatar>
                        <div className="min-w-0">
                          <p className="truncate font-semibold text-gray-900">
                            {user.name}
                            {isSelf(user) ? (
                              <span className="ml-2 text-xs font-normal text-blue-600">
                                (bạn)
                              </span>
                            ) : null}
                          </p>
                          <p className="truncate text-xs text-gray-500">
                            {user.username}
                          </p>
                        </div>
                      </div>
                    </td>
                    <td className="max-w-56 truncate px-3 py-2 text-gray-700">
                      {user.email}
                    </td>
                    <td className="px-3 py-2">
                      <StatusPill status={user.status} />
                    </td>
                    <td className="px-3 py-2 text-gray-700">
                      {formatDate(user.created_at)}
                    </td>
                    <td className="px-3 py-2">
                      <div className="flex justify-end gap-1">
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon-sm"
                          onClick={() => openEdit(user)}
                          title="Sửa"
                          aria-label={`Sửa ${user.username}`}
                        >
                          <Edit2 className="size-4" />
                        </Button>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon-sm"
                          className="text-red-600 hover:bg-red-50 hover:text-red-700"
                          disabled={isSelf(user)}
                          onClick={() => setDeletingUser(user)}
                          title={
                            isSelf(user)
                              ? "Không thể xóa tài khoản đang đăng nhập"
                              : "Xóa"
                          }
                          aria-label={`Xóa ${user.username}`}
                        >
                          <Trash2 className="size-4" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            {/* Phone: list */}
            <div className="divide-y md:hidden">
              {users.map((user) => (
                <div key={user.id} className="flex items-center gap-3 p-3">
                  <Avatar className="size-10">
                    <AvatarImage src={resolveAvatarUrl(user.avatar)} alt="" />
                    <AvatarFallback>{getInitials(user.name)}</AvatarFallback>
                  </Avatar>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold">
                      {user.name}
                      {isSelf(user) ? (
                        <span className="ml-1 text-xs font-normal text-blue-600">
                          (bạn)
                        </span>
                      ) : null}
                    </p>
                    <p className="truncate text-xs text-gray-500">
                      {user.username}
                      {user.email ? ` · ${user.email}` : ""}
                    </p>
                    <div className="mt-1">
                      <StatusPill status={user.status} />
                    </div>
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon-sm"
                    onClick={() => openEdit(user)}
                    aria-label={`Sửa ${user.username}`}
                  >
                    <Edit2 className="size-4" />
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon-sm"
                    className="text-red-600"
                    disabled={isSelf(user)}
                    onClick={() => setDeletingUser(user)}
                    aria-label={`Xóa ${user.username}`}
                  >
                    <Trash2 className="size-4" />
                  </Button>
                </div>
              ))}
            </div>
          </>
        )}
      </div>

      <Dialog open={isFormOpen} onOpenChange={(open) => (open ? null : closeForm())}>
        <DialogContent className="max-h-[90dvh] overflow-y-auto sm:max-w-lg">
          <form onSubmit={(event) => void submit(event)}>
            <DialogHeader>
              <DialogTitle>
                {isEditing ? "Sửa người dùng" : "Thêm người dùng"}
              </DialogTitle>
              <DialogDescription>
                {isEditing
                  ? "Để trống mật khẩu nếu không muốn đặt lại."
                  : "Người dùng đăng nhập bằng tên đăng nhập và mật khẩu này."}
              </DialogDescription>
            </DialogHeader>

            <div className="mt-4 grid gap-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="grid gap-2">
                  <Label htmlFor="user-username">
                    Tên đăng nhập <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    id="user-username"
                    value={form.username}
                    maxLength={50}
                    autoComplete="off"
                    disabled={isSubmitting}
                    onChange={(event) =>
                      setForm((current) => ({ ...current, username: event.target.value }))
                    }
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="user-name">
                    Họ tên <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    id="user-name"
                    value={form.name}
                    maxLength={255}
                    disabled={isSubmitting}
                    onChange={(event) =>
                      setForm((current) => ({ ...current, name: event.target.value }))
                    }
                  />
                </div>
              </div>
              <div className="grid gap-4 sm:grid-cols-[1fr_160px]">
                <div className="grid gap-2">
                  <Label htmlFor="user-email">Email</Label>
                  <Input
                    id="user-email"
                    type="email"
                    value={form.email}
                    maxLength={255}
                    disabled={isSubmitting}
                    onChange={(event) =>
                      setForm((current) => ({ ...current, email: event.target.value }))
                    }
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="user-status">Trạng thái</Label>
                  <select
                    id="user-status"
                    value={form.status}
                    disabled={isSubmitting || isSelf(editingUser)}
                    className={selectClassName}
                    onChange={(event) =>
                      setForm((current) => ({
                        ...current,
                        status: event.target.value as UserForm["status"],
                      }))
                    }
                  >
                    <option value="active">Hoạt động</option>
                    <option value="inactive">Đã khóa</option>
                  </select>
                </div>
              </div>
              <div className="grid gap-2">
                <Label htmlFor="user-password">
                  {isEditing ? "Đặt lại mật khẩu" : "Mật khẩu"}
                  {isEditing ? null : <span className="text-red-500"> *</span>}
                </Label>
                <div className="relative">
                  <Input
                    id="user-password"
                    type={showPassword ? "text" : "password"}
                    value={form.password}
                    maxLength={50}
                    autoComplete="new-password"
                    placeholder={isEditing ? "Để trống nếu không đổi" : ""}
                    disabled={isSubmitting}
                    className="pr-10"
                    onChange={(event) =>
                      setForm((current) => ({ ...current, password: event.target.value }))
                    }
                  />
                  <button
                    type="button"
                    className="absolute inset-y-0 right-0 flex w-10 items-center justify-center text-gray-500"
                    onClick={() => setShowPassword((current) => !current)}
                    aria-label={showPassword ? "Ẩn mật khẩu" : "Hiện mật khẩu"}
                  >
                    {showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                  </button>
                </div>
                {!isEditing || passwordFilled ? (
                  <ul className="grid gap-1 text-xs sm:grid-cols-2">
                    {PASSWORD_RULES.map((rule) => {
                      const passed = rule.test(form.password);
                      return (
                        <li
                          key={rule.label}
                          className={`flex items-center gap-1 ${
                            passed ? "text-green-600" : "text-gray-500"
                          }`}
                        >
                          {passed ? <Check className="size-3" /> : <X className="size-3" />}
                          {rule.label}
                        </li>
                      );
                    })}
                  </ul>
                ) : null}
                {isEditing && passwordFilled ? (
                  <p className="text-xs text-amber-700">
                    Đặt lại mật khẩu sẽ đăng xuất người dùng này khỏi mọi thiết bị.
                  </p>
                ) : null}
              </div>
            </div>

            <DialogFooter className="mt-6">
              <Button type="button" variant="outline" disabled={isSubmitting} onClick={closeForm}>
                Hủy
              </Button>
              <Button
                type="submit"
                disabled={isSubmitting}
                className="bg-slate-900 text-white hover:bg-slate-800"
              >
                {isSubmitting ? <Loader2 className="size-4 animate-spin" /> : null}
                Lưu
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog
        open={Boolean(deletingUser)}
        onOpenChange={(open) => {
          if (!open && !isSubmitting) setDeletingUser(null);
        }}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Xóa người dùng</DialogTitle>
            <DialogDescription>
              Tài khoản sẽ không đăng nhập được và bị ẩn khỏi danh sách. Tên người
              dùng vẫn được giữ trên các phiếu khảo sát đã ký hoặc đã nhập kết quả.
            </DialogDescription>
          </DialogHeader>
          <div className="rounded border bg-slate-50 p-3 text-sm">
            <p className="font-semibold text-slate-900">{deletingUser?.name}</p>
            <p className="mt-1 text-slate-600">{deletingUser?.username}</p>
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              disabled={isSubmitting}
              onClick={() => setDeletingUser(null)}
            >
              Hủy
            </Button>
            <Button
              type="button"
              variant="destructive"
              disabled={isSubmitting}
              onClick={() => void confirmDelete()}
            >
              {isSubmitting ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <Trash2 className="size-4" />
              )}
              Xóa
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
