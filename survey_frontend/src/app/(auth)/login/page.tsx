import Link from "next/link";
import LoginForm from "@/components/auth/form-login";
import AuthCard from "@/components/auth/auth-card";

export default function LoginPage() {
  return (
    <AuthCard title="Đăng Nhập Vào Survey">
      <LoginForm />
      <p className="text-center p-4 pb-0">
        Bạn chưa có tài khoản?
        <Link href="/register" className="text-blue-500 hover:underline px-2">
          Đăng ký
        </Link>
      </p>
      <div className="text-center">
        <Link href="/forgot-password" className="text-blue-500 hover:underline">
          Lấy lại mật khẩu
        </Link>
      </div>
      <p className="text-center text-sm text-gray-500 mt-4">
        Đăng nhập đồng nghĩa với đã đồng ý
        <Link href="/terms" className="text-blue-500 hover:underline px-1">
          Điều khoản sử dụng
        </Link>
        và
        <Link href="/policies" className="text-blue-500 hover:underline px-1">
          Chính sách bảo mật
        </Link>
        của chúng tôi
      </p>
    </AuthCard>
  );
}
