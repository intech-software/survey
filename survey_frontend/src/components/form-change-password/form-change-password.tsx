"use client";
import { useState } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import * as z from "zod";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Spinner } from "@/components/ui/spinner";
import { getApiErrorMessage } from "@/lib/api-error";
import { userService } from "@/services/index.service";

// Keep in sync with PASSWORD_POLICY_REGEX in the backend ChangePasswordDto.
export const PASSWORD_RULES = [
  { label: "Ít nhất 8 ký tự", test: (v: string) => v.length >= 8 },
  { label: "Chứa ít nhất một chữ hoa (A-Z)", test: (v: string) => /[A-Z]/.test(v) },
  { label: "Chứa ít nhất một chữ thường (a-z)", test: (v: string) => /[a-z]/.test(v) },
  { label: "Chứa ít nhất một số (0-9)", test: (v: string) => /\d/.test(v) },
  {
    label: "Chứa ít nhất một ký tự đặc biệt (!@#$%^&*)",
    test: (v: string) => /[!@#$%^&*]/.test(v),
  },
];

const formSchema = z
  .object({
    currentPassword: z.string().min(1, "Vui lòng nhập mật khẩu hiện tại"),
    newPassword: z
      .string()
      .max(50, "Mật khẩu mới phải có nhiều nhất 50 ký tự")
      .refine(
        (value) => PASSWORD_RULES.every((rule) => rule.test(value)),
        "Mật khẩu mới chưa đáp ứng đủ yêu cầu bên cạnh",
      ),
    confirmNewPassword: z.string().min(1, "Vui lòng xác nhận mật khẩu mới"),
  })
  .refine((data) => data.newPassword === data.confirmNewPassword, {
    message: "Mật khẩu mới và xác nhận mật khẩu mới không khớp",
    path: ["confirmNewPassword"],
  })
  .refine((data) => data.newPassword !== data.currentPassword, {
    message: "Mật khẩu mới phải khác mật khẩu hiện tại",
    path: ["newPassword"],
  });

type FormValues = z.infer<typeof formSchema>;

export default function ChangePassword({
  onNewPasswordChange,
}: {
  onNewPasswordChange?: (value: string) => void;
}) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      currentPassword: "",
      newPassword: "",
      confirmNewPassword: "",
    },
  });

  const onSubmit = async (data: FormValues) => {
    try {
      setIsSubmitting(true);
      await userService.changePassword({
        currentPassword: data.currentPassword,
        newPassword: data.newPassword,
      });
      toast.success("Đổi mật khẩu thành công");
      form.reset();
      onNewPasswordChange?.("");
    } catch (error) {
      toast.error(getApiErrorMessage(error, "Đổi mật khẩu thất bại."));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="w-full p-0 md:p-4">
      <Form {...form}>
        <form
          onSubmit={form.handleSubmit(onSubmit)}
          className="gap-4 flex flex-col"
        >
          <FormField
            control={form.control}
            name="currentPassword"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Mật khẩu hiện tại</FormLabel>
                <FormControl>
                  <Input
                    type="password"
                    autoComplete="current-password"
                    placeholder="Nhập mật khẩu hiện tại"
                    {...field}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="newPassword"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Mật khẩu mới</FormLabel>
                <FormControl>
                  <Input
                    type="password"
                    autoComplete="new-password"
                    placeholder="Nhập mật khẩu mới"
                    {...field}
                    onChange={(event) => {
                      field.onChange(event);
                      onNewPasswordChange?.(event.target.value);
                    }}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="confirmNewPassword"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Xác nhận mật khẩu mới</FormLabel>
                <FormControl>
                  <Input
                    type="password"
                    autoComplete="new-password"
                    placeholder="Nhập xác nhận mật khẩu mới"
                    {...field}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting && <Spinner className="mr-2" />}
            Đổi mật khẩu
          </Button>
        </form>
      </Form>
    </div>
  );
}
