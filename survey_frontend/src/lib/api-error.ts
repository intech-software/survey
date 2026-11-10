import axios from "axios";

// Vietnamese messages for the backend's English error texts.
const MESSAGES: Record<string, string> = {
  "Current password is incorrect": "Mật khẩu hiện tại không đúng.",
  "New password must be different from the current password":
    "Mật khẩu mới phải khác mật khẩu hiện tại.",
  "Only JPG, PNG or WebP images are allowed":
    "Chỉ chấp nhận ảnh JPG, PNG hoặc WebP.",
  "The uploaded file is not a valid image": "File tải lên không phải ảnh hợp lệ.",
  "File too large": "Ảnh vượt quá dung lượng cho phép (5 MB).",
  "No file uploaded": "Chưa chọn ảnh.",
};

export const getApiErrorMessage = (error: unknown, fallback: string) => {
  if (axios.isAxiosError(error)) {
    if (!error.response) {
      return "Không kết nối được máy chủ. Vui lòng thử lại.";
    }
    const raw = (error.response.data as { message?: string | string[] })
      ?.message;
    const message = Array.isArray(raw) ? raw[0] : raw;
    if (message && MESSAGES[message]) {
      return MESSAGES[message];
    }
    if (error.response.status === 413) {
      return MESSAGES["File too large"];
    }
  }
  return fallback;
};
