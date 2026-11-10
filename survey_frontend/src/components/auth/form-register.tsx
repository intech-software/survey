"use client";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import FeatureUnavailable from "@/components/auth/feature-unavailable";

// UI only: self-registration is not enabled yet. Accounts are created by the
// administrator. Wire this form to the backend when the feature is approved.
const fields = [
  { id: "name", label: "Họ và tên", type: "text", placeholder: "Nguyễn Văn A" },
  { id: "username", label: "Username", type: "text", placeholder: "Username" },
  { id: "email", label: "Email", type: "email", placeholder: "email@tecova.vn" },
  { id: "password", label: "Mật khẩu", type: "password", placeholder: "Mật khẩu" },
  {
    id: "confirmPassword",
    label: "Nhập lại mật khẩu",
    type: "password",
    placeholder: "Nhập lại mật khẩu",
  },
];

export default function RegisterForm() {
  return (
    <div>
      <FeatureUnavailable message="Tính năng đăng ký đang được phát triển. Vui lòng liên hệ quản trị viên để được cấp tài khoản." />
      <form className="grid gap-4" onSubmit={(event) => event.preventDefault()}>
        <fieldset disabled className="grid gap-4">
          {fields.map((field) => (
            <div key={field.id} className="grid gap-2">
              <Label htmlFor={field.id}>{field.label}</Label>
              <Input
                id={field.id}
                name={field.id}
                type={field.type}
                placeholder={field.placeholder}
              />
            </div>
          ))}
          <Button className="w-full" type="submit" size="lg">
            Đăng Ký
          </Button>
        </fieldset>
      </form>
      <p className="text-center pt-4">
        Đã có tài khoản?
        <Link href="/login" className="text-blue-500 hover:underline px-2">
          Đăng nhập
        </Link>
      </p>
    </div>
  );
}
