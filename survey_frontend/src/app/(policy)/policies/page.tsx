import type { Metadata } from "next";
import PolicyPage, { type PolicySection } from "@/components/policy/policy-page";

export const metadata: Metadata = { title: "Chính sách bảo mật | Survey" };

const sections: PolicySection[] = [
  {
    title: "Mục đích thu thập dữ liệu",
    body: "Tecova Survey thu thập và xử lý thông tin nhằm phục vụ hoạt động khảo sát dự án của đội ngũ GxP, bao gồm quản lý tài khoản người dùng, ghi nhận dữ liệu khảo sát, tổng hợp phát hiện và lập báo cáo cho dự án.",
  },
  {
    title: "Loại thông tin được xử lý",
    body: "Thông tin tài khoản gồm họ tên, tên đăng nhập, email và nhật ký đăng nhập. Dữ liệu khảo sát có thể gồm thông tin dự án, mô tả hiện trạng, hình ảnh, tài liệu và ghi chú do người dùng được phân quyền nhập vào hệ thống. Hệ thống không yêu cầu nhập dữ liệu cá nhân của bên thứ ba ngoài chức danh và đầu mối liên hệ cần thiết cho công việc.",
  },
  {
    title: "Phạm vi sử dụng thông tin",
    body: "Dữ liệu chỉ được sử dụng cho mục đích thực hiện và quản lý dự án. Dữ liệu của từng khách hàng được sử dụng trong phạm vi dự án tương ứng, không được kết hợp hoặc chia sẻ sang dự án khác khi chưa có sự cho phép hợp lệ.",
  },
  {
    title: "Bảo vệ tài khoản",
    body: "Mật khẩu được lưu dưới dạng mã hóa một chiều. Phiên đăng nhập được bảo vệ bằng token có thời hạn và được thu hồi khi người dùng đăng xuất. Người dùng không được chia sẻ mật khẩu, token hoặc thiết bị đã đăng nhập cho người khác, và cần báo ngay cho quản trị viên khi phát hiện truy cập bất thường.",
  },
  {
    title: "Lưu trữ và bảo mật dữ liệu",
    body: "Dữ liệu được lưu trữ trên hệ thống do Tecova quản lý. Các biện pháp kỹ thuật như xác thực người dùng, phân quyền truy cập và bảo vệ phiên đăng nhập được áp dụng để hạn chế truy cập trái phép. Thời gian lưu trữ dữ liệu khảo sát tuân theo thỏa thuận với khách hàng và quy định nội bộ.",
  },
  {
    title: "Quyền của người dùng",
    body: "Người dùng có thể đề nghị quản trị viên kiểm tra, cập nhật thông tin tài khoản hoặc khóa tài khoản khi không còn nhu cầu sử dụng.",
  },
  {
    title: "Thay đổi chính sách",
    body: "Chính sách này có thể được cập nhật để phù hợp với thay đổi trong quy trình vận hành hoặc yêu cầu quản trị. Phiên bản mới có hiệu lực khi được công bố trên hệ thống.",
  },
];

export default function PoliciesPage() {
  return (
    <PolicyPage
      title="Chính sách bảo mật"
      updatedAt="10/11/2026"
      sections={sections}
      related={{ href: "/terms", label: "Xem Điều khoản sử dụng" }}
    />
  );
}
