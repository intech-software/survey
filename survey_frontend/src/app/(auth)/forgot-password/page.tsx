import FormForgotPassword from "@/components/auth/form-forgot-password";
import AuthCard from "@/components/auth/auth-card";

export default function ForgotPasswordPage() {
  return (
    <AuthCard
      title="Đặt lại mật khẩu"
      description="Sử dụng OTP gửi qua email để bảo vệ tài khoản."
    >
      <FormForgotPassword />
    </AuthCard>
  );
}
