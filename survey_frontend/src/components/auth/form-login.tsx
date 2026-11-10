"use client";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { login } from "@/services/auth.service";
import { setCookie } from "@/services/setcookie";
import { useTokens } from "@/store/token.store";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { useState } from "react";
import { Spinner } from "@/components/ui/spinner";
import { Eye, EyeClosed } from "lucide-react";

const formSchema = z.object({
  username: z
    .string()
    .min(2, "Tên đăng nhập phải lớn hơn 2 ký tự")
    .max(50, "Tên đăng nhập phải nhỏ hơn 50 ký tự"),
  password: z
    .string()
    .min(6, "Mật khẩu phải lớn hơn 6 ký tự")
    .max(50, "Mật khẩu phải nhỏ hơn 50 ký tự"),
});

export default function LoginForm() {
  const { setTokens } = useTokens();
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const router = useRouter();

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      username: "",
      password: "",
    },
  });

  async function onSubmit(values: z.infer<typeof formSchema>) {
    try {
      setIsLoading(true);
      const { accessToken, refreshToken } = await login(
        values.username,
        values.password,
      );
      if (!accessToken || !refreshToken) {
        throw new Error("Missing tokens in login response");
      }
      await setCookie({ accessToken, refreshToken });
      setTokens(accessToken, refreshToken);
      toast.success("Đăng nhập thành công!");
      router.replace("/home");
      router.refresh();
    } catch (error) {
      toast.error("Đăng nhập thất bại. Vui lòng kiểm tra lại thông tin.");
      console.error("Login failed:", error);
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)}>
        <FormField
          control={form.control}
          name="username"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Username</FormLabel>
              <FormControl>
                <input
                  placeholder="Username"
                  autoComplete="username"
                  className="mb-4 p-2 border border-gray-300 rounded"
                  {...field}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="password"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Password</FormLabel>
              <FormControl>
                <div className="relative">
                  <input
                    placeholder="Password"
                    autoComplete="current-password"
                    type={showPassword ? "text" : "password"}
                    className="mb-4 p-2 border border-gray-300 rounded w-full"
                    {...field}
                  />
                  <button
                    type="button"
                    aria-label={showPassword ? "Ẩn mật khẩu" : "Hiện mật khẩu"}
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-2 top-2"
                  >
                    {showPassword ? <EyeClosed /> : <Eye />}
                  </button>
                </div>
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <Button className="w-full" type="submit" size="lg" disabled={isLoading}>
          {isLoading && <Spinner className="mr-2" />}
          Đăng Nhập
        </Button>
      </form>
    </Form>
  );
}
