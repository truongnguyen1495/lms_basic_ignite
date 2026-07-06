const jwt = require('jsonwebtoken');
const { getUserById, getLessonById, getTestById } = require('../db');

const JWT_SECRET = 'lms-super-secret-key-12345';

// Middleware xác thực JWT bất đồng bộ
async function authenticateToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

  if (!token) {
    return res.status(401).json({ message: 'Không tìm thấy token xác thực.' });
  }

  jwt.verify(token, JWT_SECRET, async (err, decoded) => {
    if (err) {
      return res.status(403).json({ message: 'Token không hợp lệ hoặc đã hết hạn.' });
    }

    try {
      const user = await getUserById(decoded.id);

      if (!user) {
        return res.status(404).json({ message: 'Người dùng không tồn tại.' });
      }

      if (user.status === 'locked') {
        return res.status(403).json({ message: 'Tài khoản của bạn đã bị khóa.' });
      }

      req.user = user;
      next();
    } catch (dbErr) {
      console.error('Lỗi DB trong authenticateToken:', dbErr);
      return res.status(500).json({ message: 'Lỗi máy chủ nội bộ khi xác thực.' });
    }
  });
}

// Middleware chỉ cho phép Admin
function adminOnly(req, res, next) {
  if (!req.user) {
    return res.status(401).json({ message: 'Chưa xác thực.' });
  }
  if (req.user.role !== 'admin') {
    return res.status(403).json({ message: 'Chỉ có Super Admin mới có quyền thực hiện hành động này.' });
  }
  next();
}

// Middleware kiểm tra quyền truy cập cấp độ bài học hoặc test bất đồng bộ
async function checkLevelAccess(req, res, next) {
  if (!req.user) {
    return res.status(401).json({ message: 'Chưa xác thực.' });
  }

  // Admin có toàn quyền truy cập tất cả cấp độ
  if (req.user.role === 'admin') {
    return next();
  }

  const { id } = req.params;
  const path = req.baseUrl + req.path;

  let targetLevel = 1;

  try {
    if (path.includes('/lessons')) {
      const lesson = await getLessonById(id);
      if (!lesson) {
        return res.status(404).json({ message: 'Không tìm thấy bài học.' });
      }
      targetLevel = lesson.level;
    } else if (path.includes('/tests')) {
      const test = await getTestById(id);
      if (!test) {
        return res.status(404).json({ message: 'Không tìm thấy bài kiểm tra.' });
      }
      targetLevel = test.level;
    }

    // Học viên được xem từ Cấp 1 đến Cấp của họ
    if (req.user.level < targetLevel) {
      return res.status(403).json({
        message: `Bạn không có quyền truy cập nội dung này. Cần đạt Cấp ${targetLevel} (Hiện tại: Cấp ${req.user.level}).`
      });
    }

    next();
  } catch (err) {
    console.error('Lỗi DB trong checkLevelAccess:', err);
    return res.status(500).json({ message: 'Lỗi hệ thống khi kiểm tra cấp học.' });
  }
}

module.exports = {
  authenticateToken,
  adminOnly,
  checkLevelAccess,
  JWT_SECRET
};
