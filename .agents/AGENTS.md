# Quy tắc Phát triển Dự án LMS 5 cấp (Supabase + Vercel)

File này hướng dẫn các AI Agent kế cận hiểu rõ quy chuẩn phát triển của dự án này để tiếp tục phát triển mà không làm phá vỡ kiến trúc cũ.

---

## Quy tắc thiết kế Backend & Database (Supabase)
1. **Kiểm tra quyền truy cập cấp học**: Mọi route lấy dữ liệu bài học (`/api/lessons/:id`) hoặc bài kiểm tra (`/api/tests/:id`) bắt buộc phải đi qua middleware `checkLevelAccess` trong `/server/middleware/auth.js`.
2. **Cơ chế lưu trữ**: 
   - Không được sửa đổi file `database.json` làm kho lưu trữ chính. Dự án đã chuyển đổi hoàn toàn sang **Supabase Postgres**.
   - Module `db.js` đóng vai trò là lớp trừu tượng cơ sở dữ liệu. Mọi tương tác trực tiếp với Supabase phải được viết tại đây.
3. **Mã hóa mật khẩu**: Tất cả tài khoản mới tạo phải được mã hóa mật khẩu thông qua thư viện `bcryptjs` ở backend.

---

## Quy tắc thiết kế Frontend (React)
1. **Quản lý phiên đăng nhập**: Sử dụng hook `useAuth` từ `client/src/context/AuthContext.jsx`. Không tự ý viết các cơ chế đăng nhập/lưu token riêng lẻ.
2. **Định dạng CSS**: Sử dụng hệ màu biến CSS và thiết kế **Glassmorphism** tối màu trong `client/src/index.css`. Giữ tính thống nhất màu sắc theo cấp bậc (Level 1: Blue, Level 2: Green, Level 3: Teal, Level 4: Purple, Level 5: Gold).
3. **Gọi API**: Luôn gọi API thông qua đối tượng `api` trong `client/src/utils/api.js` để tự động đính kèm token xác thực và chuyển đổi môi trường dev/production động.

---

## Quy tắc Deploy & Hosting
1. **Biến môi trường**: Không bao giờ commit file `server/.env` lên git. Các biến môi trường phải được thiết lập thủ công trên Vercel Settings.
2. **SPA Routing**: Giữ nguyên luật rewrite fallback trỏ về `index.html` trong `vercel.json` để tránh lỗi 404 khi người dùng nhấn F5 refresh trang trên Vercel.
