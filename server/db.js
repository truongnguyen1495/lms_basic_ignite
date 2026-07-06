const fs = require('fs');
const path = require('path');
const bcrypt = require('bcryptjs');

const dbPath = path.join(__dirname, 'database.json');

// Đọc dữ liệu từ file JSON
function readDB() {
  try {
    const data = fs.readFileSync(dbPath, 'utf8');
    return JSON.parse(data);
  } catch (error) {
    console.error('Lỗi đọc database.json:', error);
    return {
      users: [],
      lessons: [],
      tests: [],
      testSubmissions: [],
      lessonProgress: [],
      levelUpRequests: []
    };
  }
}

// Ghi dữ liệu vào file JSON
function writeDB(data) {
  try {
    fs.writeFileSync(dbPath, JSON.stringify(data, null, 2), 'utf8');
  } catch (error) {
    console.error('Lỗi ghi database.json:', error);
  }
}

// Khởi tạo Database (mã hóa mật khẩu chưa được mã hóa)
function initDB() {
  const db = readDB();
  let modified = false;

  db.users = db.users.map(user => {
    // Nếu mật khẩu chưa được mã hóa bằng bcrypt (thường bắt đầu bằng $2a$ hoặc $2b$)
    if (user.password && !user.password.startsWith('$2a$') && !user.password.startsWith('$2b$')) {
      const salt = bcrypt.genSaltSync(10);
      user.password = bcrypt.hashSync(user.password, salt);
      modified = true;
      console.log(`Đã mã hóa mật khẩu cho user: ${user.username}`);
    }
    return user;
  });

  if (modified) {
    writeDB(db);
  }
}

module.exports = {
  readDB,
  writeDB,
  initDB
};
