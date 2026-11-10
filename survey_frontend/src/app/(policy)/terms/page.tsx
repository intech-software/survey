import type { Metadata } from "next";
import PolicyPage, { type PolicySection } from "@/components/policy/policy-page";

export const metadata: Metadata = { title: "Điều khoản sử dụng | Survey" };

const sections: PolicySection[] = [
  {
    title: "Phạm vi áp dụng",
    body: "Điều khoản này áp dụng cho toàn bộ người dùng truy cập và sử dụng hệ thống Tecova Survey, bao gồm chuyên gia tư vấn, trưởng nhóm khảo sát, quản trị viên và các cá nhân được cấp quyền sử dụng. Khi đăng nhập, truy cập hoặc thực hiện thao tác trên hệ thống, người dùng được xem là đã đọc, hiểu và đồng ý tuân thủ các điều khoản dưới đây.",
  },
  {
    title: "Mục đích sử dụng hệ thống",
    body: "Tecova Survey được xây dựng để hỗ trợ đội ngũ GxP ghi nhận, tổng hợp và quản lý dữ liệu khảo sát dự án, bao gồm thông tin hiện trạng nhà xưởng, hệ thống tiện ích, hồ sơ tài liệu và các phát hiện trong quá trình khảo sát. Người dùng chỉ được sử dụng hệ thống cho mục đích công việc hợp lệ và trong phạm vi dự án được giao.",
  },
  {
    title: "Tài khoản và quyền truy cập",
    body: "Tài khoản do quản trị viên cấp theo vai trò công việc và phạm vi dự án. Người dùng chỉ được xem, tạo, chỉnh sửa, xuất hoặc xóa dữ liệu khi có quyền phù hợp. Mọi hành vi sử dụng tài khoản của người khác, cho mượn tài khoản, chia sẻ mật khẩu hoặc cố tình vượt quyền đều không được phép.",
  },
  {
    title: "Bảo mật thông tin đăng nhập",
    body: "Người dùng có trách nhiệm bảo vệ tên đăng nhập, mật khẩu, thiết bị đã đăng nhập và phiên làm việc của mình. Khi nghi ngờ tài khoản bị lộ, bị truy cập trái phép hoặc phát sinh hoạt động bất thường, người dùng cần thông báo ngay cho quản trị viên để được đổi mật khẩu và kiểm tra.",
  },
  {
    title: "Trách nhiệm ghi nhận dữ liệu khảo sát",
    body: "Người dùng cần ghi nhận dữ liệu chính xác, đầy đủ, rõ nguồn gốc và đúng thời điểm thực hiện khảo sát. Dữ liệu cần phản ánh đúng hiện trạng quan sát được; không được ghi nhận thông tin suy đoán như kết quả đã xác minh. Khi cần sửa dữ liệu đã lưu, người dùng ghi rõ lý do thay đổi theo hướng dẫn của trưởng nhóm.",
  },
  {
    title: "Bảo mật thông tin khách hàng",
    body: "Thông tin về khách hàng, dự án, quy trình sản xuất, bản vẽ, hình ảnh hiện trường và tài liệu thu thập được trong quá trình khảo sát là thông tin bảo mật. Người dùng không được sao chép, tải xuống, chụp màn hình, chuyển tiếp hoặc chia sẻ các thông tin này cho bên thứ ba khi chưa có sự cho phép hợp lệ, và không được sử dụng thông tin của dự án này cho dự án khác.",
  },
  {
    title: "Hành vi không được phép",
    body: "Người dùng không được cố ý làm sai lệch dữ liệu, xóa dữ liệu không thuộc trách nhiệm của mình, truy cập trái phép, dò tìm lỗ hổng, can thiệp vào luồng xử lý, làm gián đoạn hệ thống hoặc thực hiện các hành vi có thể ảnh hưởng đến tính toàn vẹn, bảo mật và khả dụng của hệ thống.",
  },
  {
    title: "Nhật ký hoạt động",
    body: "Hệ thống có thể ghi nhận nhật ký đăng nhập, thời điểm truy cập và các thao tác tạo, sửa, xóa dữ liệu. Nhật ký này được sử dụng để phục vụ vận hành, hỗ trợ kỹ thuật, truy vết thay đổi dữ liệu, điều tra sự cố và bảo vệ an toàn hệ thống.",
  },
  {
    title: "Tạm dừng hoặc thu hồi quyền truy cập",
    body: "Quyền truy cập có thể bị tạm dừng, giới hạn hoặc thu hồi khi người dùng thay đổi vị trí công việc, kết thúc dự án hoặc hợp đồng, không còn nhu cầu sử dụng, vi phạm điều khoản, hoặc khi hệ thống cần bảo trì, nâng cấp, xử lý sự cố kỹ thuật hay sự cố bảo mật.",
  },
  {
    title: "Bảo trì và tính sẵn sàng của hệ thống",
    body: "Hệ thống có thể được bảo trì định kỳ hoặc đột xuất để nâng cấp tính năng, sửa lỗi, cải thiện hiệu năng và tăng cường bảo mật. Trong thời gian bảo trì hoặc khi máy chủ, mạng, hạ tầng gặp sự cố, một số tính năng có thể tạm thời không khả dụng.",
  },
  {
    title: "Xử lý vi phạm",
    body: "Tùy theo mức độ vi phạm, người dùng có thể bị nhắc nhở, giới hạn quyền, khóa tài khoản tạm thời, thu hồi quyền truy cập hoặc bị áp dụng các biện pháp xử lý theo quy định nội bộ và thỏa thuận bảo mật đã ký.",
  },
  {
    title: "Thay đổi điều khoản",
    body: "Điều khoản sử dụng có thể được cập nhật theo nhu cầu vận hành, thay đổi quy trình hoặc yêu cầu bảo mật. Phiên bản mới có hiệu lực khi được công bố trên hệ thống. Người dùng nên kiểm tra định kỳ để nắm các thay đổi mới nhất.",
  },
];

export default function TermsPage() {
  return (
    <PolicyPage
      title="Điều khoản sử dụng"
      updatedAt="10/11/2026"
      sections={sections}
      related={{ href: "/policies", label: "Xem Chính sách bảo mật" }}
    />
  );
}
