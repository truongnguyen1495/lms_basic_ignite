const express = require('express');
const cors = require('cors');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const db = require('./db');
const { authenticateToken, adminOnly, checkLevelAccess, JWT_SECRET } = require('./middleware/auth');

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());

// -------------------------------------------------------------
// 1. AUTHENTICATION ENDPOINTS
// -------------------------------------------------------------

// Đăng nhập
app.post('/api/auth/login', async (req, res) => {
  const { username, password } = req.body;
  if (!username || !password) {
    return res.status(400).json({ message: 'Vui lòng điền đầy đủ tên đăng nhập và mật khẩu.' });
  }

  try {
    const user = await db.getUserByUsername(username);

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
  } catch (err) {
    console.error('Lỗi API login:', err);
    res.status(500).json({ message: 'Lỗi máy chủ khi đăng nhập.' });
  }
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
app.get('/api/admin/students', authenticateToken, adminOnly, async (req, res) => {
  try {
    const students = await db.getStudents();
    res.json(students);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Lỗi tải danh sách học viên.' });
  }
});

// Thêm học viên mới
app.post('/api/admin/students', authenticateToken, adminOnly, async (req, res) => {
  const { username, password, fullName, level } = req.body;

  if (!username || !password || !fullName || !level) {
    return res.status(400).json({ message: 'Vui lòng cung cấp đầy đủ thông tin.' });
  }

  try {
    const existingUser = await db.getUserByUsername(username);
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

    const created = await db.createUser(newStudent);

    res.status(201).json({
      message: 'Tạo học viên thành công.',
      student: {
        id: created.id,
        username: created.username,
        fullName: created.fullName,
        level: created.level,
        status: created.status
      }
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Lỗi tạo học viên.' });
  }
});

// Sửa học viên
app.put('/api/admin/students/:id', authenticateToken, adminOnly, async (req, res) => {
  const { id } = req.params;
  const { fullName, password, level, status } = req.body;

  try {
    const user = await db.getUserById(id);
    if (!user || user.role !== 'student') {
      return res.status(404).json({ message: 'Không tìm thấy học viên.' });
    }

    const updates = {};
    if (fullName) updates.fullName = fullName;
    if (level) updates.level = parseInt(level, 10);
    if (status) updates.status = status;

    if (password && password.trim() !== '') {
      const salt = bcrypt.genSaltSync(10);
      updates.password = bcrypt.hashSync(password, salt);
    }

    const updated = await db.updateUser(id, updates);

    res.json({
      message: 'Cập nhật thông tin học viên thành công.',
      student: {
        id: updated.id,
        username: updated.username,
        fullName: updated.fullName,
        level: updated.level,
        status: updated.status
      }
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Lỗi cập nhật học viên.' });
  }
});

// Xóa học viên
app.delete('/api/admin/students/:id', authenticateToken, adminOnly, async (req, res) => {
  const { id } = req.params;
  try {
    const user = await db.getUserById(id);
    if (!user || user.role !== 'student') {
      return res.status(404).json({ message: 'Không tìm thấy học viên.' });
    }

    await db.deleteUser(id);
    res.json({ message: 'Đã xóa học viên thành công.' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Lỗi xóa học viên.' });
  }
});


// -------------------------------------------------------------
// 3. LESSONS ENDPOINTS
// -------------------------------------------------------------

// Lấy toàn bộ bài học (cho cả học viên và admin)
app.get('/api/lessons', authenticateToken, async (req, res) => {
  try {
    const lessonsList = await db.getLessons();
    const isStudent = req.user.role === 'student';

    const processedLessons = lessonsList.map(lesson => {
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
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Lỗi tải danh sách bài học.' });
  }
});

// Lấy chi tiết bài học (Có phân quyền theo cấp độ)
app.get('/api/lessons/:id', authenticateToken, checkLevelAccess, async (req, res) => {
  const { id } = req.params;
  try {
    const lesson = await db.getLessonById(id);
    
    if (!lesson) {
      return res.status(404).json({ message: 'Không tìm thấy bài học.' });
    }

    res.json(lesson);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Lỗi tải bài học.' });
  }
});

// Thêm bài học mới (Admin)
app.post('/api/admin/lessons', authenticateToken, adminOnly, async (req, res) => {
  const { title, content, level, videoUrl, orderIndex } = req.body;

  if (!title || !level) {
    return res.status(400).json({ message: 'Tiêu đề và Cấp độ là bắt buộc.' });
  }

  try {
    const newLesson = {
      id: `lesson-${Date.now()}`,
      level: parseInt(level, 10),
      title: title.trim(),
      content: (content || '').trim(),
      videoUrl: (videoUrl || '').trim(),
      orderIndex: parseInt(orderIndex, 10) || 1
    };

    const created = await db.createLesson(newLesson);
    res.status(201).json({ message: 'Tạo bài học thành công.', lesson: created });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Lỗi tạo bài học.' });
  }
});

// Sửa bài học (Admin)
app.put('/api/admin/lessons/:id', authenticateToken, adminOnly, async (req, res) => {
  const { id } = req.params;
  const { title, content, level, videoUrl, orderIndex } = req.body;

  try {
    const lesson = await db.getLessonById(id);
    if (!lesson) {
      return res.status(404).json({ message: 'Không tìm thấy bài học.' });
    }

    const updates = {};
    if (title) updates.title = title.trim();
    if (content !== undefined) updates.content = content.trim();
    if (level) updates.level = parseInt(level, 10);
    if (videoUrl !== undefined) updates.videoUrl = videoUrl.trim();
    if (orderIndex !== undefined) updates.orderIndex = parseInt(orderIndex, 10);

    const updated = await db.updateLesson(id, updates);
    res.json({ message: 'Cập nhật bài học thành công.', lesson: updated });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Lỗi cập nhật bài học.' });
  }
});

// Xóa bài học (Admin)
app.delete('/api/admin/lessons/:id', authenticateToken, adminOnly, async (req, res) => {
  const { id } = req.params;
  try {
    await db.deleteLesson(id);
    res.json({ message: 'Đã xóa bài học thành công.' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Lỗi xóa bài học.' });
  }
});


// -------------------------------------------------------------
// 4. TESTS & SUBMISSIONS ENDPOINTS
// -------------------------------------------------------------

// Lấy toàn bộ bài test (cho cả học viên và admin)
app.get('/api/tests', authenticateToken, async (req, res) => {
  try {
    const testsList = await db.getTests();
    const isStudent = req.user.role === 'student';

    const processedTests = testsList.map(test => {
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
      
      // Nếu là học viên đã được mở khóa cấp này, gửi câu hỏi nhưng loại bỏ correctOptionIndex
      if (isStudent) {
        const sanitizedQuestions = test.questions ? test.questions.map(q => {
          const { correctOptionIndex, ...publicData } = q;
          return publicData;
        }) : [];
        return {
          id: test.id,
          level: test.level,
          title: test.title,
          passingScore: test.passingScore,
          questions: sanitizedQuestions,
          isLocked: false
        };
      }

      // Admin gửi đầy đủ dữ liệu
      return {
        ...test,
        isLocked: false
      };
    });

    res.json(processedTests);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Lỗi tải danh sách bài test.' });
  }
});

// Lấy chi tiết bài test (Có kiểm tra quyền cấp độ)
app.get('/api/tests/:id', authenticateToken, checkLevelAccess, async (req, res) => {
  const { id } = req.params;
  try {
    const test = await db.getTestById(id);

    if (!test) {
      return res.status(404).json({ message: 'Không tìm thấy bài kiểm tra.' });
    }

    // Nếu là học viên, loại bỏ chỉ số đáp án đúng (correctOptionIndex)
    if (req.user.role === 'student') {
      const sanitizedQuestions = test.questions ? test.questions.map(q => {
        const { correctOptionIndex, ...publicData } = q;
        return publicData;
      }) : [];
      return res.json({
        id: test.id,
        level: test.level,
        title: test.title,
        passingScore: test.passingScore,
        questions: sanitizedQuestions
      });
    }

    res.json(test);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Lỗi tải bài test.' });
  }
});

// Thêm bài test mới (Admin)
app.post('/api/admin/tests', authenticateToken, adminOnly, async (req, res) => {
  const { title, level, passingScore, questions } = req.body;

  if (!title || !level || !questions || !Array.isArray(questions)) {
    return res.status(400).json({ message: 'Vui lòng cung cấp đầy đủ thông tin bài kiểm tra.' });
  }

  try {
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

    const created = await db.createTest(newTest);
    res.status(201).json({ message: 'Tạo bài kiểm tra thành công.', test: created });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Lỗi tạo bài test.' });
  }
});

// Sửa bài test (Admin)
app.put('/api/admin/tests/:id', authenticateToken, adminOnly, async (req, res) => {
  const { id } = req.params;
  const { title, level, passingScore, questions } = req.body;

  try {
    const test = await db.getTestById(id);
    if (!test) {
      return res.status(404).json({ message: 'Không tìm thấy bài kiểm tra.' });
    }

    const updates = {};
    if (title) updates.title = title.trim();
    if (level) updates.level = parseInt(level, 10);
    if (passingScore !== undefined) updates.passingScore = parseInt(passingScore, 10);
    if (questions && Array.isArray(questions)) {
      updates.questions = questions.map((q, idx) => ({
        id: q.id || `q-${Date.now()}-${idx}`,
        questionText: q.questionText.trim(),
        options: q.options.map(opt => opt.trim()),
        correctOptionIndex: parseInt(q.correctOptionIndex, 10) || 0
      }));
    }

    const updated = await db.updateTest(id, updates);
    res.json({ message: 'Cập nhật bài kiểm tra thành công.', test: updated });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Lỗi cập nhật bài test.' });
  }
});

// Xóa bài test (Admin)
app.delete('/api/admin/tests/:id', authenticateToken, adminOnly, async (req, res) => {
  const { id } = req.params;
  try {
    await db.deleteTest(id);
    res.json({ message: 'Đã xóa bài kiểm tra thành công.' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Lỗi xóa bài test.' });
  }
});

// Học viên nộp bài test để chấm điểm (Phải có quyền cấp độ bài test)
app.post('/api/tests/:id/submit', authenticateToken, checkLevelAccess, async (req, res) => {
  const { id } = req.params;
  const { answers } = req.body; // Object dạng: { "q-1": 0, "q-2": 1 }

  if (!answers) {
    return res.status(400).json({ message: 'Vui lòng gửi câu trả lời của bạn.' });
  }

  try {
    const test = await db.getTestById(id);

    if (!test) {
      return res.status(404).json({ message: 'Không tìm thấy bài kiểm tra.' });
    }

    let correctCount = 0;
    const totalQuestions = test.questions ? test.questions.length : 0;

    if (totalQuestions === 0) {
      return res.status(400).json({ message: 'Bài kiểm tra không có câu hỏi nào.' });
    }

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

    await db.submitTestResult(submission);

    res.json({
      message: passed ? 'Chúc mừng! Bạn đã đạt điểm yêu cầu.' : 'Rất tiếc! Điểm của bạn chưa đạt yêu cầu.',
      score,
      passingScore: test.passingScore,
      passed
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Lỗi nộp bài test.' });
  }
});

// Xem lịch sử nộp bài test (Admin xem hết, Học viên xem của chính họ)
app.get('/api/test-submissions', authenticateToken, async (req, res) => {
  try {
    if (req.user.role === 'admin') {
      const submissions = await db.getTestSubmissions();
      res.json(submissions);
    } else {
      const submissions = await db.getTestSubmissions(req.user.id);
      res.json(submissions);
    }
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Lỗi tải lịch sử thi trắc nghiệm.' });
  }
});


// -------------------------------------------------------------
// 5. LESSON PROGRESS ENDPOINTS
// -------------------------------------------------------------

// Học viên đánh dấu bài học là Đã hoàn thành (Phải có quyền cấp độ bài học)
app.post('/api/lessons/:id/complete', authenticateToken, checkLevelAccess, async (req, res) => {
  const { id } = req.params;
  try {
    const lesson = await db.getLessonById(id);
    if (!lesson) {
      return res.status(404).json({ message: 'Không tìm thấy bài học.' });
    }

    await db.completeLessonProgress(req.user.id, id);
    res.json({ message: 'Đã đánh dấu bài học hoàn thành.' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Lỗi lưu tiến trình bài học.' });
  }
});

// Lấy danh sách bài học đã hoàn thành của học viên hiện tại
app.get('/api/lessons-progress', authenticateToken, async (req, res) => {
  try {
    const progress = await db.getLessonsProgress(req.user.id);
    res.json(progress);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Lỗi tải tiến trình học.' });
  }
});

// Admin xem chi tiết tiến độ của một học viên
app.get('/api/admin/students/:id/progress', authenticateToken, adminOnly, async (req, res) => {
  const { id } = req.params;
  try {
    const progressDetail = await db.getStudentProgressDetail(id);
    res.json(progressDetail);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Lỗi tải tiến độ chi tiết của học viên.' });
  }
});


// -------------------------------------------------------------
// 6. LEVEL UP REQUESTS ENDPOINTS
// -------------------------------------------------------------

// Học viên gửi yêu cầu xin lên cấp
app.post('/api/level-up/request', authenticateToken, async (req, res) => {
  if (req.user.role !== 'student') {
    return res.status(400).json({ message: 'Chỉ học viên mới có thể gửi yêu cầu này.' });
  }

  const currentLevel = req.user.level;
  if (currentLevel >= 5) {
    return res.status(400).json({ message: 'Bạn đã đạt cấp độ tối đa (Cấp 5).' });
  }

  try {
    // Kiểm tra xem đã có yêu cầu PENDING nào chưa
    const requests = await db.getLevelUpRequests(req.user.id);
    const existingPending = requests.find(r => r.status === 'pending');
    if (existingPending) {
      return res.status(400).json({ message: 'Bạn đang có một yêu cầu chờ duyệt.' });
    }

    // Điều kiện xin lên cấp: Vượt qua tất cả các bài test trong cấp độ hiện tại
    const testsList = await db.getTests();
    const testsInCurrentLevel = testsList.filter(t => t.level === currentLevel);

    if (testsInCurrentLevel.length > 0) {
      const submissions = await db.getTestSubmissions(req.user.id);
      const passedTests = testsInCurrentLevel.every(test => {
        return submissions.some(sub => sub.testId === test.id && sub.passed);
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

    const created = await db.createLevelUpRequest(newRequest);

    res.status(201).json({
      message: `Đã gửi yêu cầu xin lên Cấp ${currentLevel + 1} thành công. Chờ Super Admin phê duyệt.`,
      request: created
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Lỗi gửi yêu cầu nâng cấp.' });
  }
});

// Lấy danh sách yêu cầu xin lên cấp
app.get('/api/level-up/requests', authenticateToken, async (req, res) => {
  try {
    if (req.user.role === 'admin') {
      const requests = await db.getLevelUpRequests();
      res.json(requests);
    } else {
      const requests = await db.getLevelUpRequests(req.user.id);
      res.json(requests);
    }
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Lỗi tải danh sách yêu cầu nâng cấp.' });
  }
});

// Admin duyệt yêu cầu lên cấp
app.post('/api/admin/level-up/requests/:id/approve', authenticateToken, adminOnly, async (req, res) => {
  const { id } = req.params;

  try {
    const requests = await db.getLevelUpRequests();
    const request = requests.find(r => r.id === id);

    if (!request) {
      return res.status(404).json({ message: 'Không tìm thấy yêu cầu nâng cấp.' });
    }

    if (request.status !== 'pending') {
      return res.status(400).json({ message: 'Yêu cầu này đã được xử lý từ trước.' });
    }

    const student = await db.getUserById(request.userId);
    if (!student) {
      await db.updateLevelUpRequestStatus(id, 'rejected');
      return res.status(404).json({ message: 'Không tìm thấy học viên liên quan.' });
    }

    // Cập nhật nâng cấp học viên
    await db.updateUser(request.userId, { level: request.requestedLevel });
    // Cập nhật trạng thái yêu cầu
    await db.updateLevelUpRequestStatus(id, 'approved');

    res.json({
      message: `Đã phê duyệt thành công. Học viên ${student.fullName} đã được thăng lên Cấp ${request.requestedLevel}.`
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Lỗi phê duyệt nâng cấp.' });
  }
});

// Admin từ chối yêu cầu lên cấp
app.post('/api/admin/level-up/requests/:id/reject', authenticateToken, adminOnly, async (req, res) => {
  const { id } = req.params;

  try {
    const requests = await db.getLevelUpRequests();
    const request = requests.find(r => r.id === id);

    if (!request) {
      return res.status(404).json({ message: 'Không tìm thấy yêu cầu.' });
    }

    if (request.status !== 'pending') {
      return res.status(400).json({ message: 'Yêu cầu này đã được xử lý từ trước.' });
    }

    await db.updateLevelUpRequestStatus(id, 'rejected');
    res.json({ message: 'Đã từ chối yêu cầu xin nâng cấp của học viên.' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Lỗi từ chối nâng cấp.' });
  }
});

// -------------------------------------------------------------
// 7. START SERVER
// -------------------------------------------------------------
app.listen(PORT, () => {
  console.log(`Server LMS đang chạy tại port: ${PORT}`);
});
