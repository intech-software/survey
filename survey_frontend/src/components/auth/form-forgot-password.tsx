"use client";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import FeatureUnavailable from "@/components/auth/feature-unavailable";

// UI only: password reset by email OTP is not enabled yet.
// Wire this form to the backend when the feature is approved.
export default function FormForgotPassword() {
  return (
    <div>
      <FeatureUnavailable message="Tính năng lấy lại mật khẩu đang được phát triển. Vui lòng liên hệ quản trị viên để được đặt lại mật khẩu." />
      <form className="grid gap-4" onSubmit={(event) => event.preventDefault()}>
        <fieldset disabled className="grid gap-4">
          <div className="grid gap-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              name="email"
              type="email"
              placeholder="Email đã đăng ký"
            />
          </div>
          <Button className="w-full" type="submit" size="lg">
            Gửi mã OTP
          </Button>
        </fieldset>
      </form>
      <div className="text-center pt-4">
        <Link href="/login" className="text-blue-500 hover:underline">
          Quay lại đăng nhập
        </Link>
      </div>
    </div>
  );
}
