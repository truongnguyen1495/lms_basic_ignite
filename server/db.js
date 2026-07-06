const supabase = require('./supabase');

// --- HELPER MAPPING FUNCTIONS (Snake Case DB -> Camel Case JS) ---
function mapUser(u) {
  if (!u) return null;
  return {
    id: u.id,
    username: u.username,
    password: u.password,
    role: u.role,
    fullName: u.full_name,
    level: u.level,
    status: u.status
  };
}

function mapLesson(l) {
  if (!l) return null;
  return {
    id: l.id,
    level: l.level,
    title: l.title,
    content: l.content,
    videoUrl: l.video_url,
    orderIndex: l.order_index
  };
}

function mapTest(t) {
  if (!t) return null;
  const test = {
    id: t.id,
    level: t.level,
    title: t.title,
    passingScore: t.passing_score
  };
  if (t.questions) {
    test.questions = t.questions.map(q => ({
      id: q.id,
      questionText: q.question_text,
      options: q.options,
      correctOptionIndex: q.correct_option_index
    }));
  }
  return test;
}

function mapRequest(r) {
  if (!r) return null;
  return {
    id: r.id,
    userId: r.user_id,
    currentLevel: r.current_level,
    requestedLevel: r.requested_level,
    status: r.status,
    createdAt: r.created_at,
    reviewedAt: r.reviewed_at,
    studentName: r.users?.full_name,
    studentUsername: r.users?.username
  };
}

function mapSubmission(s) {
  if (!s) return null;
  return {
    id: s.id,
    userId: s.user_id,
    testId: s.test_id,
    score: s.score,
    passed: s.passed,
    answers: s.answers,
    submittedAt: s.submitted_at,
    studentName: s.users?.full_name,
    studentUsername: s.users?.username,
    testTitle: s.tests?.title,
    testLevel: s.tests?.level
  };
}

// --- DATABASE OPERATIONS ---

// 1. USERS OPERATIONS
async function getUserById(id) {
  const { data, error } = await supabase
    .from('users')
    .select('*')
    .eq('id', id)
    .maybeSingle();
  if (error) throw error;
  return mapUser(data);
}

async function getUserByUsername(username) {
  const { data, error } = await supabase
    .from('users')
    .select('*')
    .eq('username', username.toLowerCase())
    .maybeSingle();
  if (error) throw error;
  return mapUser(data);
}

async function getStudents() {
  const { data, error } = await supabase
    .from('users')
    .select('*')
    .eq('role', 'student');
  if (error) throw error;
  return data.map(mapUser);
}

async function createUser(u) {
  const payload = {
    id: u.id,
    username: u.username.toLowerCase(),
    password: u.password,
    role: u.role,
    full_name: u.fullName,
    level: u.level,
    status: u.status || 'active'
  };
  const { data, error } = await supabase.from('users').insert(payload).select().single();
  if (error) throw error;
  return mapUser(data);
}

async function updateUser(id, updates) {
  const payload = {};
  if (updates.fullName !== undefined) payload.full_name = updates.fullName;
  if (updates.password !== undefined) payload.password = updates.password;
  if (updates.level !== undefined) payload.level = updates.level;
  if (updates.status !== undefined) payload.status = updates.status;

  const { data, error } = await supabase.from('users').update(payload).eq('id', id).select().single();
  if (error) throw error;
  return mapUser(data);
}

async function deleteUser(id) {
  const { error } = await supabase.from('users').delete().eq('id', id);
  if (error) throw error;
  return true;
}

// 2. LESSONS OPERATIONS
async function getLessons() {
  const { data, error } = await supabase
    .from('lessons')
    .select('*')
    .order('order_index', { ascending: true });
  if (error) throw error;
  return data.map(mapLesson);
}

async function getLessonById(id) {
  const { data, error } = await supabase
    .from('lessons')
    .select('*')
    .eq('id', id)
    .maybeSingle();
  if (error) throw error;
  return mapLesson(data);
}

async function createLesson(l) {
  const payload = {
    id: l.id,
    level: l.level,
    title: l.title,
    content: l.content,
    video_url: l.videoUrl,
    order_index: l.orderIndex
  };
  const { data, error } = await supabase.from('lessons').insert(payload).select().single();
  if (error) throw error;
  return mapLesson(data);
}

async function updateLesson(id, updates) {
  const payload = {};
  if (updates.level !== undefined) payload.level = updates.level;
  if (updates.title !== undefined) payload.title = updates.title;
  if (updates.content !== undefined) payload.content = updates.content;
  if (updates.videoUrl !== undefined) payload.video_url = updates.videoUrl;
  if (updates.orderIndex !== undefined) payload.order_index = updates.orderIndex;

  const { data, error } = await supabase.from('lessons').update(payload).eq('id', id).select().single();
  if (error) throw error;
  return mapLesson(data);
}

async function deleteLesson(id) {
  const { error } = await supabase.from('lessons').delete().eq('id', id);
  if (error) throw error;
  return true;
}

// 3. TESTS OPERATIONS
async function getTests() {
  const { data, error } = await supabase
    .from('tests')
    .select('*, questions(*)');
  if (error) throw error;
  return data.map(mapTest);
}

async function getTestById(id) {
  const { data, error } = await supabase
    .from('tests')
    .select('*, questions(*)')
    .eq('id', id)
    .maybeSingle();
  if (error) throw error;
  return mapTest(data);
}

async function createTest(t) {
  const payload = {
    id: t.id,
    level: t.level,
    title: t.title,
    passing_score: t.passingScore
  };
  const { error } = await supabase.from('tests').insert(payload);
  if (error) throw error;

  // Insert questions
  if (t.questions && t.questions.length > 0) {
    const questionsPayload = t.questions.map(q => ({
      id: q.id,
      test_id: t.id,
      question_text: q.questionText,
      options: q.options,
      correct_option_index: q.correctOptionIndex
    }));
    const { error: qErr } = await supabase.from('questions').insert(questionsPayload);
    if (qErr) throw qErr;
  }

  return getTestById(t.id);
}

async function updateTest(id, updates) {
  const payload = {};
  if (updates.level !== undefined) payload.level = updates.level;
  if (updates.title !== undefined) payload.title = updates.title;
  if (updates.passingScore !== undefined) payload.passing_score = updates.passingScore;

  const { error } = await supabase.from('tests').update(payload).eq('id', id);
  if (error) throw error;

  if (updates.questions) {
    // Để đơn giản, ta xóa toàn bộ câu hỏi cũ của bài test và insert mới
    await supabase.from('questions').delete().eq('test_id', id);

    const questionsPayload = updates.questions.map(q => ({
      id: q.id || `q-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
      test_id: id,
      question_text: q.questionText,
      options: q.options,
      correct_option_index: q.correctOptionIndex
    }));
    const { error: qErr } = await supabase.from('questions').insert(questionsPayload);
    if (qErr) throw qErr;
  }

  return getTestById(id);
}

async function deleteTest(id) {
  const { error } = await supabase.from('tests').delete().eq('id', id);
  if (error) throw error;
  return true;
}

// 4. SUBMISSIONS OPERATIONS
async function submitTestResult(s) {
  const payload = {
    id: s.id,
    user_id: s.userId,
    test_id: s.testId,
    score: s.score,
    passed: s.passed,
    answers: s.answers,
    submitted_at: s.submittedAt
  };
  const { data, error } = await supabase.from('test_submissions').insert(payload).select().single();
  if (error) throw error;
  return data;
}

async function getTestSubmissions(userId = null) {
  let query = supabase.from('test_submissions').select('*, users(full_name, username), tests(title, level)');
  if (userId) {
    query = query.eq('user_id', userId);
  }
  const { data, error } = await query;
  if (error) throw error;
  return data.map(mapSubmission);
}

// 5. PROGRESS OPERATIONS
async function getLessonsProgress(userId) {
  const { data, error } = await supabase
    .from('lesson_progress')
    .select('*')
    .eq('user_id', userId);
  if (error) throw error;
  return data.map(p => ({
    userId: p.user_id,
    lessonId: p.lesson_id,
    completed: p.completed,
    completedAt: p.completed_at
  }));
}

async function completeLessonProgress(userId, lessonId) {
  const payload = {
    user_id: userId,
    lesson_id: lessonId,
    completed: true,
    completed_at: new Date().toISOString()
  };
  const { data, error } = await supabase
    .from('lesson_progress')
    .upsert(payload, { onConflict: 'user_id,lesson_id' })
    .select()
    .single();
  if (error) throw error;
  return data;
}

async function getStudentProgressDetail(userId) {
  const { data: student, error: sErr } = await supabase.from('users').select('*').eq('id', userId).eq('role', 'student').single();
  if (sErr) throw sErr;

  const progress = await getLessonsProgress(userId);
  const submissions = await getTestSubmissions(userId);

  return {
    student: mapUser(student),
    completedLessons: progress.map(p => p.lessonId),
    testSubmissions: submissions
  };
}

// 6. LEVEL UP REQUESTS OPERATIONS
async function createLevelUpRequest(r) {
  const payload = {
    id: r.id,
    user_id: r.userId,
    current_level: r.currentLevel,
    requested_level: r.requestedLevel,
    status: r.status,
    created_at: r.createdAt
  };
  const { data, error } = await supabase.from('level_up_requests').insert(payload).select().single();
  if (error) throw error;
  return mapRequest(data);
}

async function getLevelUpRequests(userId = null) {
  let query = supabase.from('level_up_requests').select('*, users(full_name, username)');
  if (userId) {
    query = query.eq('user_id', userId);
  }
  const { data, error } = await query;
  if (error) throw error;
  return data.map(mapRequest);
}

async function updateLevelUpRequestStatus(id, status) {
  const payload = {
    status,
    reviewed_at: new Date().toISOString()
  };
  const { data, error } = await supabase
    .from('level_up_requests')
    .update(payload)
    .eq('id', id)
    .select()
    .single();
  if (error) throw error;
  return mapRequest(data);
}

module.exports = {
  getUserById,
  getUserByUsername,
  getStudents,
  createUser,
  updateUser,
  deleteUser,
  getLessons,
  getLessonById,
  createLesson,
  updateLesson,
  deleteLesson,
  getTests,
  getTestById,
  createTest,
  updateTest,
  deleteTest,
  submitTestResult,
  getTestSubmissions,
  getLessonsProgress,
  completeLessonProgress,
  getStudentProgressDetail,
  createLevelUpRequest,
  getLevelUpRequests,
  updateLevelUpRequestStatus
};
