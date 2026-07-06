const fs = require('fs');
const path = require('path');
const bcrypt = require('bcryptjs');
const supabase = require('./supabase');

const dbPath = path.join(__dirname, 'database.json');

async function runMigration() {
  console.log('Bắt đầu di cư dữ liệu sang Supabase...');

  if (!fs.existsSync(dbPath)) {
    console.error('Không tìm thấy file database.json để di cư dữ liệu.');
    return;
  }

  let dbData;
  try {
    const raw = fs.readFileSync(dbPath, 'utf8');
    dbData = JSON.parse(raw);
  } catch (err) {
    console.error('Lỗi phân tích file database.json:', err);
    return;
  }

  // 1. DI CƯ BẢNG USERS
  if (dbData.users && dbData.users.length > 0) {
    console.log(`Đang đồng bộ ${dbData.users.length} tài khoản người dùng...`);
    for (const u of dbData.users) {
      // Đảm bảo mật khẩu đã được mã hóa bằng bcrypt
      let passwordHash = u.password;
      if (passwordHash && !passwordHash.startsWith('$2a$') && !passwordHash.startsWith('$2b$')) {
        const salt = bcrypt.genSaltSync(10);
        passwordHash = bcrypt.hashSync(passwordHash, salt);
      }

      const userData = {
        id: u.id,
        username: u.username.toLowerCase(),
        password: passwordHash,
        role: u.role,
        full_name: u.fullName || u.full_name,
        level: u.level || 1,
        status: u.status || 'active'
      };

      const { error } = await supabase.from('users').upsert(userData);
      if (error) {
        console.error(`Lỗi upsert user ${u.username}:`, error.message);
      } else {
        console.log(`- Thành công: User ${u.username}`);
      }
    }
  }

  // 2. DI CƯ BẢNG LESSONS
  if (dbData.lessons && dbData.lessons.length > 0) {
    console.log(`Đang đồng bộ ${dbData.lessons.length} bài học...`);
    for (const l of dbData.lessons) {
      const lessonData = {
        id: l.id,
        level: l.level,
        title: l.title,
        content: l.content,
        video_url: l.videoUrl || l.video_url,
        order_index: l.orderIndex || l.order_index || 1
      };

      const { error } = await supabase.from('lessons').upsert(lessonData);
      if (error) {
        console.error(`Lỗi upsert bài học ${l.title}:`, error.message);
      } else {
        console.log(`- Thành công: Bài học ${l.title}`);
      }
    }
  }

  // 3. DI CƯ BẢNG TESTS & QUESTIONS
  if (dbData.tests && dbData.tests.length > 0) {
    console.log(`Đang đồng bộ ${dbData.tests.length} bài kiểm tra...`);
    for (const t of dbData.tests) {
      const testData = {
        id: t.id,
        level: t.level,
        title: t.title,
        passing_score: t.passingScore || t.passing_score || 80
      };

      // Đẩy thông tin bài test
      const { error: testErr } = await supabase.from('tests').upsert(testData);
      if (testErr) {
        console.error(`Lỗi upsert bài test ${t.title}:`, testErr.message);
        continue;
      }

      console.log(`- Thành công: Bài test ${t.title}`);

      // Đẩy các câu hỏi liên quan của bài test này
      if (t.questions && t.questions.length > 0) {
        console.log(`  Đang đẩy ${t.questions.length} câu hỏi của bài test ${t.title}...`);
        for (const q of t.questions) {
          const questionData = {
            id: q.id,
            test_id: t.id,
            question_text: q.questionText || q.question_text,
            options: q.options,
            correct_option_index: q.correctOptionIndex !== undefined ? q.correctOptionIndex : q.correct_option_index
          };

          const { error: qErr } = await supabase.from('questions').upsert(questionData);
          if (qErr) {
            console.error(`  Lỗi upsert câu hỏi ${q.id}:`, qErr.message);
          }
        }
      }
    }
  }

  console.log('Quá trình di cư hoàn tất!');
}

runMigration();
