# Tài liệu Kiến trúc Hệ thống LMS 5 cấp học (Supabase + Vercel)

Tài liệu này lưu giữ toàn bộ kiến thức, cấu trúc và thiết lập của dự án LMS phục vụ cho việc duy trì, sửa lỗi và nâng cấp dự án về sau.

---

## 1. Công nghệ & Hạ tầng (Tech Stack)
* **Frontend**: React (Vite) + Vanilla CSS (Giao diện tối màu Glassmorphism cao cấp).
* **Backend**: Node.js + Express.js (Chạy dưới dạng Serverless Functions trên Vercel).
* **Database**: PostgreSQL (Được lưu trữ trên đám mây **Supabase**).
* **Xác thực**: JSON Web Tokens (JWT) lưu ở Client và xác thực bất đồng bộ trên Backend.

---

## 2. Cấu trúc Cơ sở dữ liệu Supabase
Hệ thống sử dụng cơ sở dữ liệu gồm 7 bảng:

1. **`users`**: Lưu trữ tài khoản Admin và Học viên.
   * `id` (TEXT, PK)
   * `username` (TEXT, UNIQUE, LOWERCASE)
   * `password` (TEXT, Bcrypt Hash)
   * `role` (TEXT, 'admin' hoặc 'student')
   * `full_name` (TEXT)
   * `level` (INTEGER, 1-5)
   * `status` (TEXT, 'active' hoặc 'locked')

2. **`lessons`**: Lưu bài học theo từng cấp bậc.
   * `id` (TEXT, PK)
   * `level` (INTEGER, 1-5)
   * `title` (TEXT)
   * `content` (TEXT)
   * `video_url` (TEXT, link Youtube)
   * `order_index` (INTEGER, dùng để sắp xếp)

3. **`tests`**: Lưu thông tin bài kiểm tra trắc nghiệm.
   * `id` (TEXT, PK)
   * `level` (INTEGER, 1-5)
   * `title` (TEXT)
   * `passing_score` (INTEGER, mặc định 80)

4. **`questions`**: Câu hỏi của bài test (liên kết khóa ngoại).
   * `id` (TEXT, PK)
   * `test_id` (TEXT, FK references tests.id)
   * `question_text` (TEXT)
   * `options` (TEXT[], mảng lựa chọn)
   * `correct_option_index` (INTEGER)

5. **`test_submissions`**: Kết quả làm bài test của học viên.
   * `id` (TEXT, PK)
   * `user_id` (TEXT, FK references users.id)
   * `test_id` (TEXT, FK references tests.id)
   * `score` (INTEGER, điểm số %)
   * `passed` (BOOLEAN, trạng thái đạt/chưa đạt)
   * `answers` (JSONB, lưu câu trả lời chi tiết)
   * `submitted_at` (TIMESTAMP)

6. **`lesson_progress`**: Tiến độ hoàn thành bài học của học viên.
   * `id` (BIGSERIAL, PK)
   * `user_id` (TEXT, FK)
   * `lesson_id` (TEXT, FK)
   * `completed` (BOOLEAN)
   * `completed_at` (TIMESTAMP)

7. **`level_up_requests`**: Yêu cầu xin lên cấp của học viên.
   * `id` (TEXT, PK)
   * `user_id` (TEXT, FK)
   * `current_level` (INTEGER)
   * `requested_level` (INTEGER)
   * `status` (TEXT, 'pending' | 'approved' | 'rejected')
   * `created_at` (TIMESTAMP)
   * `reviewed_at` (TIMESTAMP)

---

## 3. Quy trình Phân quyền (Permission Rules)
* **Quyền truy cập Cấp học (1-5)**:
  * Học viên Cấp độ $N$ chỉ được xem các bài học và làm bài kiểm tra từ Cấp 1 đến Cấp $N$.
  * Backend kiểm tra quyền truy cập thông qua Middleware `checkLevelAccess` trong `/server/middleware/auth.js`. Mọi hành vi gọi API vượt cấp đều bị chặn bằng mã lỗi `403 Forbidden`.
* **Điều kiện xin nâng cấp**:
  * Học viên phải hoàn thành tất cả các bài học (lưu trong `lesson_progress`) và vượt qua toàn bộ bài kiểm tra (lưu trong `test_submissions` đạt trạng thái `passed = true`) của Cấp hiện tại để mở khóa nút "Gửi yêu cầu nâng cấp".
  * Sau khi gửi, Admin duyệt yêu cầu thì cấp của học viên mới tăng lên $N+1$ trên bảng `users` ở Supabase, mở khóa các nội dung cấp tiếp theo.

---

## 4. Deploy lên Vercel
* Dự án chạy theo mô hình Monorepo (frontend ở `client/`, backend ở `server/` và entrypoint của Vercel ở `api/index.js`).
* File `vercel.json` định nghĩa quy tắc rewrite:
  * Trỏ `/api/*` tới serverless function của Express.
  * Trỏ các route SPA (React Router) về `client/index.html` thông qua filesystem handler để tránh lỗi 404 khi nhấn F5 refresh.
