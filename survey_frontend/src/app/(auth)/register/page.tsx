import RegisterForm from "@/components/auth/form-register";
import AuthCard from "@/components/auth/auth-card";

export default function RegisterPage() {
  return (
    <AuthCard title="Đăng Ký Tài Khoản">
      <RegisterForm />
    </AuthCard>
  );
}
