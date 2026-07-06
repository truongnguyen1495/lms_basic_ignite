const express = require('express');
const cors = require('cors');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const { readDB, writeDB, initDB } = require('./db');
const { authenticateToken, adminOnly, checkLevelAccess, JWT_SECRET } = require('./middleware/auth');

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());

// Khởi tạo database và mã hóa mật khẩu mẫu
initDB();

// -------------------------------------------------------------
// 1. AUTHENTICATION ENDPOINTS
// -------------------------------------------------------------

// Đăng nhập
app.post('/api/auth/login', (req, res) => {
  const { username, password } = req.body;
  if (!username || !password) {
    return res.status(400).json({ message: 'Vui lòng điền đầy đủ tên đăng nhập và mật khẩu.' });
  }

  const db = readDB();
  const user = db.users.find(u => u.username.toLowerCase() === username.toLowerCase());

  if (!user) {
    return res.status(401).json({ message: 'Tên đăng nhập hoặc mật khẩu không chính xác.' });
  }

  if (user.status === 'locked') {
    return res.status(403).json({ message: 'Tài khoản của bạn đã bị khóa.' });
  }

  const isPasswordValid = bcrypt.compareSync(password, user.password);
  if (!isPasswordValid) {
    return res.status(401).json({ message: 'Tên đăng nhập hoặc mật khẩu không chính xác.' });
  }

  const token = jwt.sign({ id: user.id, username: user.username, role: user.role }, JWT_SECRET, {
    expiresIn: '24h'
  });

  res.json({
    token,
    user: {
      id: user.id,
      username: user.username,
      fullName: user.fullName,
      role: user.role,
      level: user.level
    }
  });
});

// Lấy thông tin tài khoản hiện tại
app.get('/api/auth/me', authenticateToken, (req, res) => {
  res.json({
    user: {
      id: req.user.id,
      username: req.user.username,
      fullName: req.user.fullName,
      role: req.user.role,
      level: req.user.level
    }
  });
});


// -------------------------------------------------------------
// 2. ADMIN - USER/STUDENT MANAGEMENT
// -------------------------------------------------------------

// Lấy danh sách học viên
app.get('/api/admin/students', authenticateToken, adminOnly, (req, res) => {
  const db = readDB();
  const students = db.users.filter(u => u.role === 'student');
  res.json(students);
});

// Thêm học viên mới
app.post('/api/admin/students', authenticateToken, adminOnly, (req, res) => {
  const { username, password, fullName, level } = req.body;

  if (!username || !password || !fullName || !level) {
    return res.status(400).json({ message: 'Vui lòng cung cấp đầy đủ thông tin.' });
  }

  const db = readDB();
  const existingUser = db.users.find(u => u.username.toLowerCase() === username.toLowerCase());
  if (existingUser) {
    return res.status(400).json({ message: 'Tên đăng nhập đã tồn tại.' });
  }

  const salt = bcrypt.genSaltSync(10);
  const hashedPassword = bcrypt.hashSync(password, salt);

  const newStudent = {
    id: `student-${Date.now()}`,
    username: username.trim(),
    password: hashedPassword,
    role: 'student',
    fullName: fullName.trim(),
    level: parseInt(level, 10) || 1,
    status: 'active'
  };

  db.users.push(newStudent);
  writeDB(db);

  res.status(201).json({
    message: 'Tạo học viên thành công.',
    student: {
      id: newStudent.id,
      username: newStudent.username,
      fullName: newStudent.fullName,
      level: newStudent.level,
      status: newStudent.status
    }
  });
});

// Sửa học viên
app.put('/api/admin/students/:id', authenticateToken, adminOnly, (req, res) => {
  const { id } = req.params;
  const { fullName, password, level, status } = req.body;

  const db = readDB();
  const userIndex = db.users.findIndex(u => u.id === id && u.role === 'student');

  if (userIndex === -1) {
    return res.status(404).json({ message: 'Không tìm thấy học viên.' });
  }

  const user = db.users[userIndex];

  if (fullName) user.fullName = fullName.trim();
  if (level) user.level = parseInt(level, 10);
  if (status) user.status = status;

  if (password && password.trim() !== '') {
    const salt = bcrypt.genSaltSync(10);
    user.password = bcrypt.hashSync(password, salt);
  }

  db.users[userIndex] = user;
  writeDB(db);

  res.json({
    message: 'Cập nhật thông tin học viên thành công.',
    student: {
      id: user.id,
      username: user.username,
      fullName: user.fullName,
      level: user.level,
      status: user.status
    }
  });
});

// Xóa hoặc khóa học viên (ở đây hỗ trợ xóa hẳn khỏi DB)
app.delete('/api/admin/students/:id', authenticateToken, adminOnly, (req, res) => {
  const { id } = req.params;
  const db = readDB();
  const userIndex = db.users.findIndex(u => u.id === id && u.role === 'student');

  if (userIndex === -1) {
    return res.status(404).json({ message: 'Không tìm thấy học viên.' });
  }

  db.users.splice(userIndex, 1);
  
  // Dọn dẹp các bảng liên quan
  db.testSubmissions = db.testSubmissions.filter(s => s.userId !== id);
  db.lessonProgress = db.lessonProgress.filter(p => p.userId !== id);
  db.levelUpRequests = db.levelUpRequests.filter(r => r.userId !== id);

  writeDB(db);
  res.json({ message: 'Đã xóa học viên thành công.' });
});


// -------------------------------------------------------------
// 3. LESSONS ENDPOINTS
// -------------------------------------------------------------

// Lấy toàn bộ bài học (cho cả học viên và admin)
app.get('/api/lessons', authenticateToken, (req, res) => {
  const db = readDB();
  const isStudent = req.user.role === 'student';

  const processedLessons = db.lessons.map(lesson => {
    // Nếu học viên chưa đạt cấp của bài học, ẩn các thông tin nội dung chi tiết
    if (isStudent && req.user.level < lesson.level) {
      return {
        id: lesson.id,
        level: lesson.level,
        title: lesson.title,
        orderIndex: lesson.orderIndex,
        isLocked: true
      };
    }
    return {
      ...lesson,
      isLocked: false
    };
  });

  res.json(processedLessons);
});

// Lấy chi tiết bài học (Có phân quyền theo cấp độ)
app.get('/api/lessons/:id', authenticateToken, checkLevelAccess, (req, res) => {
  const { id } = req.params;
  const db = readDB();
  const lesson = db.lessons.find(l => l.id === id);
  
  if (!lesson) {
    return res.status(404).json({ message: 'Không tìm thấy bài học.' });
  }

  res.json(lesson);
});

// Thêm bài học mới (Admin)
app.post('/api/admin/lessons', authenticateToken, adminOnly, (req, res) => {
  const { title, content, level, videoUrl, orderIndex } = req.body;

  if (!title || !level) {
    return res.status(400).json({ message: 'Tiêu đề và Cấp độ là bắt buộc.' });
  }

  const db = readDB();
  const newLesson = {
    id: `lesson-${Date.now()}`,
    level: parseInt(level, 10),
    title: title.trim(),
    content: (content || '').trim(),
    videoUrl: (videoUrl || '').trim(),
    orderIndex: parseInt(orderIndex, 10) || 1
  };

  db.lessons.push(newLesson);
  writeDB(db);

  res.status(201).json({ message: 'Tạo bài học thành công.', lesson: newLesson });
});

// Sửa bài học (Admin)
app.put('/api/admin/lessons/:id', authenticateToken, adminOnly, (req, res) => {
  const { id } = req.params;
  const { title, content, level, videoUrl, orderIndex } = req.body;

  const db = readDB();
  const lessonIndex = db.lessons.findIndex(l => l.id === id);

  if (lessonIndex === -1) {
    return res.status(404).json({ message: 'Không tìm thấy bài học.' });
  }

  const lesson = db.lessons[lessonIndex];

  if (title) lesson.title = title.trim();
  if (content !== undefined) lesson.content = content.trim();
  if (level) lesson.level = parseInt(level, 10);
  if (videoUrl !== undefined) lesson.videoUrl = videoUrl.trim();
  if (orderIndex !== undefined) lesson.orderIndex = parseInt(orderIndex, 10);

  db.lessons[lessonIndex] = lesson;
  writeDB(db);

  res.json({ message: 'Cập nhật bài học thành công.', lesson });
});

// Xóa bài học (Admin)
app.delete('/api/admin/lessons/:id', authenticateToken, adminOnly, (req, res) => {
  const { id } = req.params;
  const db = readDB();
  const lessonIndex = db.lessons.findIndex(l => l.id === id);

  if (lessonIndex === -1) {
    return res.status(404).json({ message: 'Không tìm thấy bài học.' });
  }

  db.lessons.splice(lessonIndex, 1);
  // Dọn dẹp tiến trình hoàn thành của bài học này
  db.lessonProgress = db.lessonProgress.filter(p => p.lessonId !== id);

  writeDB(db);
  res.json({ message: 'Đã xóa bài học thành công.' });
});


// -------------------------------------------------------------
// 4. TESTS & SUBMISSIONS ENDPOINTS
// -------------------------------------------------------------

// Lấy toàn bộ bài test (cho cả học viên và admin)
app.get('/api/tests', authenticateToken, (req, res) => {
  const db = readDB();
  const isStudent = req.user.role === 'student';

  const processedTests = db.tests.map(test => {
    // Nếu học viên chưa đạt cấp của bài test, ẩn danh sách câu hỏi
    if (isStudent && req.user.level < test.level) {
      return {
        id: test.id,
        level: test.level,
        title: test.title,
        passingScore: test.passingScore,
        isLocked: true
      };
    }
    
    // Nếu là học viên đã được mở khóa cấp này, gửi về các thông tin cơ bản
    // nhưng KHÔNG bao gồm correctOptionIndex ở danh sách câu hỏi
    if (isStudent) {
      const sanitizedQuestions = test.questions.map(q => {
        const { correctOptionIndex, ...publicData } = q;
        return publicData;
      });
      return {
        id: test.id,
        level: test.level,
        title: test.title,
        passingScore: test.passingScore,
        questions: sanitizedQuestions,
        isLocked: false
      };
    }

    // Nếu là admin thì gửi full dữ liệu
    return {
      ...test,
      isLocked: false
    };
  });

  res.json(processedTests);
});

// Lấy chi tiết bài test (Có kiểm tra quyền cấp độ)
app.get('/api/tests/:id', authenticateToken, checkLevelAccess, (req, res) => {
  const { id } = req.params;
  const db = readDB();
  const test = db.tests.find(t => t.id === id);

  if (!test) {
    return res.status(404).json({ message: 'Không tìm thấy bài kiểm tra.' });
  }

  // Nếu là học viên, loại bỏ chỉ số đáp án đúng (correctOptionIndex) để tránh gian lận
  if (req.user.role === 'student') {
    const sanitizedQuestions = test.questions.map(q => {
      const { correctOptionIndex, ...publicData } = q;
      return publicData;
    });
    return res.json({
      id: test.id,
      level: test.level,
      title: test.title,
      passingScore: test.passingScore,
      questions: sanitizedQuestions
    });
  }

  res.json(test);
});

// Thêm bài test mới (Admin)
app.post('/api/admin/tests', authenticateToken, adminOnly, (req, res) => {
  const { title, level, passingScore, questions } = req.body;

  if (!title || !level || !questions || !Array.isArray(questions)) {
    return res.status(400).json({ message: 'Vui lòng cung cấp đầy đủ thông tin bài kiểm tra.' });
  }

  const db = readDB();
  const newTest = {
    id: `test-${Date.now()}`,
    level: parseInt(level, 10),
    title: title.trim(),
    passingScore: parseInt(passingScore, 10) || 80,
    questions: questions.map((q, idx) => ({
      id: `q-${Date.now()}-${idx}`,
      questionText: q.questionText.trim(),
      options: q.options.map(opt => opt.trim()),
      correctOptionIndex: parseInt(q.correctOptionIndex, 10) || 0
    }))
  };

  db.tests.push(newTest);
  writeDB(db);

  res.status(201).json({ message: 'Tạo bài kiểm tra thành công.', test: newTest });
});

// Sửa bài test (Admin)
app.put('/api/admin/tests/:id', authenticateToken, adminOnly, (req, res) => {
  const { id } = req.params;
  const { title, level, passingScore, questions } = req.body;

  const db = readDB();
  const testIndex = db.tests.findIndex(t => t.id === id);

  if (testIndex === -1) {
    return res.status(404).json({ message: 'Không tìm thấy bài kiểm tra.' });
  }

  const test = db.tests[testIndex];

  if (title) test.title = title.trim();
  if (level) test.level = parseInt(level, 10);
  if (passingScore !== undefined) test.passingScore = parseInt(passingScore, 10);
  if (questions && Array.isArray(questions)) {
    test.questions = questions.map((q, idx) => ({
      id: q.id || `q-${Date.now()}-${idx}`,
      questionText: q.questionText.trim(),
      options: q.options.map(opt => opt.trim()),
      correctOptionIndex: parseInt(q.correctOptionIndex, 10) || 0
    }));
  }

  db.tests[testIndex] = test;
  writeDB(db);

  res.json({ message: 'Cập nhật bài kiểm tra thành công.', test });
});

// Xóa bài test (Admin)
app.delete('/api/admin/tests/:id', authenticateToken, adminOnly, (req, res) => {
  const { id } = req.params;
  const db = readDB();
  const testIndex = db.tests.findIndex(t => t.id === id);

  if (testIndex === -1) {
    return res.status(404).json({ message: 'Không tìm thấy bài kiểm tra.' });
  }

  db.tests.splice(testIndex, 1);
  db.testSubmissions = db.testSubmissions.filter(s => s.testId !== id);

  writeDB(db);
  res.json({ message: 'Đã xóa bài kiểm tra thành công.' });
});

// Học viên nộp bài test để chấm điểm (Phải có quyền cấp độ bài test)
app.post('/api/tests/:id/submit', authenticateToken, checkLevelAccess, (req, res) => {
  const { id } = req.params;
  const { answers } = req.body; // Object dạng: { "q-1": 0, "q-2": 1 }

  if (!answers) {
    return res.status(400).json({ message: 'Vui lòng gửi câu trả lời của bạn.' });
  }

  const db = readDB();
  const test = db.tests.find(t => t.id === id);

  if (!test) {
    return res.status(404).json({ message: 'Không tìm thấy bài kiểm tra.' });
  }

  let correctCount = 0;
  const totalQuestions = test.questions.length;

  if (totalQuestions === 0) {
    return res.status(400).json({ message: 'Bài kiểm tra không có câu hỏi nào.' });
  }

  // Chấm điểm dựa trên đáp án đúng lưu ở backend
  test.questions.forEach(q => {
    const userAnswer = answers[q.id];
    if (userAnswer !== undefined && parseInt(userAnswer, 10) === q.correctOptionIndex) {
      correctCount++;
    }
  });

  const score = Math.round((correctCount / totalQuestions) * 100);
  const passed = score >= test.passingScore;

  const submission = {
    id: `sub-${Date.now()}`,
    userId: req.user.id,
    testId: test.id,
    score,
    passed,
    answers,
    submittedAt: new Date().toISOString()
  };

  db.testSubmissions.push(submission);
  writeDB(db);

  res.json({
    message: passed ? 'Chúc mừng! Bạn đã đạt điểm yêu cầu.' : 'Rất tiếc! Điểm của bạn chưa đạt yêu cầu.',
    score,
    passingScore: test.passingScore,
    passed
  });
});

// Admin xem tất cả lượt làm bài test (hoặc học viên xem lịch sử của mình)
app.get('/api/test-submissions', authenticateToken, (req, res) => {
  const db = readDB();
  
  if (req.user.role === 'admin') {
    // Admin xem hết
    res.json(db.testSubmissions.map(sub => {
      const student = db.users.find(u => u.id === sub.userId) || {};
      const test = db.tests.find(t => t.id === sub.testId) || {};
      return {
        ...sub,
        studentName: student.fullName,
        studentUsername: student.username,
        testTitle: test.title,
        testLevel: test.level
      };
    }));
  } else {
    // Học viên chỉ xem của chính họ
    const mySubmissions = db.testSubmissions.filter(s => s.userId === req.user.id);
    res.json(mySubmissions.map(sub => {
      const test = db.tests.find(t => t.id === sub.testId) || {};
      return {
        ...sub,
        testTitle: test.title,
        testLevel: test.level
      };
    }));
  }
});


// -------------------------------------------------------------
// 5. LESSON PROGRESS ENDPOINTS
// -------------------------------------------------------------

// Học viên đánh dấu bài học là Đã hoàn thành (Phải có quyền cấp độ bài học)
app.post('/api/lessons/:id/complete', authenticateToken, checkLevelAccess, (req, res) => {
  const { id } = req.params;
  const db = readDB();
  
  const lesson = db.lessons.find(l => l.id === id);
  if (!lesson) {
    return res.status(404).json({ message: 'Không tìm thấy bài học.' });
  }

  // Kiểm tra xem đã hoàn thành chưa
  const existingProgress = db.lessonProgress.find(p => p.userId === req.user.id && p.lessonId === id);
  if (!existingProgress) {
    db.lessonProgress.push({
      userId: req.user.id,
      lessonId: id,
      completed: true,
      completedAt: new Date().toISOString()
    });
    writeDB(db);
  }

  res.json({ message: 'Đã đánh dấu bài học hoàn thành.' });
});

// Lấy danh sách bài học đã hoàn thành của học viên hiện tại
app.get('/api/lessons-progress', authenticateToken, (req, res) => {
  const db = readDB();
  const myProgress = db.lessonProgress.filter(p => p.userId === req.user.id);
  res.json(myProgress);
});

// Admin xem chi tiết tiến độ của một học viên
app.get('/api/admin/students/:id/progress', authenticateToken, adminOnly, (req, res) => {
  const { id } = req.params;
  const db = readDB();
  const student = db.users.find(u => u.id === id && u.role === 'student');

  if (!student) {
    return res.status(404).json({ message: 'Không tìm thấy học viên.' });
  }

  const progress = db.lessonProgress.filter(p => p.userId === id);
  const submissions = db.testSubmissions.filter(s => s.userId === id).map(sub => {
    const test = db.tests.find(t => t.id === sub.testId) || {};
    return {
      ...sub,
      testTitle: test.title,
      testLevel: test.level
    };
  });

  res.json({
    student: {
      id: student.id,
      username: student.username,
      fullName: student.fullName,
      level: student.level,
      status: student.status
    },
    completedLessons: progress.map(p => p.lessonId),
    testSubmissions: submissions
  });
});


// -------------------------------------------------------------
// 6. LEVEL UP REQUESTS ENDPOINTS
// -------------------------------------------------------------

// Học viên gửi yêu cầu xin lên cấp
app.post('/api/level-up/request', authenticateToken, (req, res) => {
  if (req.user.role !== 'student') {
    return res.status(400).json({ message: 'Chỉ học viên mới có thể gửi yêu cầu này.' });
  }

  const currentLevel = req.user.level;
  if (currentLevel >= 5) {
    return res.status(400).json({ message: 'Bạn đã đạt cấp độ tối đa (Cấp 5).' });
  }

  const db = readDB();

  // Kiểm tra xem đã có yêu cầu PENDING nào chưa
  const existingPending = db.levelUpRequests.find(
    r => r.userId === req.user.id && r.status === 'pending'
  );
  if (existingPending) {
    return res.status(400).json({ message: 'Bạn đang có một yêu cầu chờ duyệt.' });
  }

  // Điều kiện để xin lên cấp:
  // Học viên phải vượt qua tất cả các bài test trong cấp độ hiện tại
  const testsInCurrentLevel = db.tests.filter(t => t.level === currentLevel);
  if (testsInCurrentLevel.length > 0) {
    const passedTests = testsInCurrentLevel.every(test => {
      // Tìm xem có submission nào cho test này của user và PASSED hay không
      return db.testSubmissions.some(
        sub => sub.userId === req.user.id && sub.testId === test.id && sub.passed
      );
    });

    if (!passedTests) {
      return res.status(400).json({
        message: `Bạn cần vượt qua bài kiểm tra của Cấp ${currentLevel} để xin lên cấp kế tiếp.`
      });
    }
  }

  const newRequest = {
    id: `req-${Date.now()}`,
    userId: req.user.id,
    currentLevel,
    requestedLevel: currentLevel + 1,
    status: 'pending',
    createdAt: new Date().toISOString()
  };

  db.levelUpRequests.push(newRequest);
  writeDB(db);

  res.status(201).json({
    message: `Đã gửi yêu cầu xin lên Cấp ${currentLevel + 1} thành công. Chờ Super Admin phê duyệt.`,
    request: newRequest
  });
});

// Lấy danh sách yêu cầu xin lên cấp (Admin xem hết, Học viên xem của chính họ)
app.get('/api/level-up/requests', authenticateToken, (req, res) => {
  const db = readDB();
  if (req.user.role === 'admin') {
    const requests = db.levelUpRequests.map(r => {
      const student = db.users.find(u => u.id === r.userId) || {};
      return {
        ...r,
        studentName: student.fullName,
        studentUsername: student.username
      };
    });
    res.json(requests);
  } else {
    const myRequests = db.levelUpRequests.filter(r => r.userId === req.user.id);
    res.json(myRequests);
  }
});

// Admin duyệt yêu cầu lên cấp
app.post('/api/admin/level-up/requests/:id/approve', authenticateToken, adminOnly, (req, res) => {
  const { id } = req.params;
  const db = readDB();

  const reqIndex = db.levelUpRequests.findIndex(r => r.id === id);
  if (reqIndex === -1) {
    return res.status(404).json({ message: 'Không tìm thấy yêu cầu nâng cấp.' });
  }

  const request = db.levelUpRequests[reqIndex];
  if (request.status !== 'pending') {
    return res.status(400).json({ message: 'Yêu cầu này đã được xử lý từ trước.' });
  }

  // Tìm học viên liên quan
  const studentIndex = db.users.findIndex(u => u.id === request.userId && u.role === 'student');
  if (studentIndex === -1) {
    request.status = 'rejected';
    db.levelUpRequests[reqIndex] = request;
    writeDB(db);
    return res.status(404).json({ message: 'Không tìm thấy học viên liên quan đến yêu cầu này.' });
  }

  const student = db.users[studentIndex];
  
  // Tăng cấp độ cho học viên
  student.level = request.requestedLevel;
  request.status = 'approved';
  request.reviewedAt = new Date().toISOString();

  db.users[studentIndex] = student;
  db.levelUpRequests[reqIndex] = request;
  writeDB(db);

  res.json({
    message: `Đã phê duyệt thành công. Học viên ${student.fullName} đã được thăng lên Cấp ${student.level}.`
  });
});

// Admin từ chối yêu cầu lên cấp
app.post('/api/admin/level-up/requests/:id/reject', authenticateToken, adminOnly, (req, res) => {
  const { id } = req.params;
  const db = readDB();

  const reqIndex = db.levelUpRequests.findIndex(r => r.id === id);
  if (reqIndex === -1) {
    return res.status(404).json({ message: 'Không tìm thấy yêu cầu nâng cấp.' });
  }

  const request = db.levelUpRequests[reqIndex];
  if (request.status !== 'pending') {
    return res.status(400).json({ message: 'Yêu cầu này đã được xử lý từ trước.' });
  }

  request.status = 'rejected';
  request.reviewedAt = new Date().toISOString();

  db.levelUpRequests[reqIndex] = request;
  writeDB(db);

  res.json({
    message: 'Đã từ chối yêu cầu xin nâng cấp của học viên.'
  });
});

// -------------------------------------------------------------
// 7. START SERVER
// -------------------------------------------------------------
app.listen(PORT, () => {
  console.log(`Server LMS đang chạy tại port: ${PORT}`);
});
