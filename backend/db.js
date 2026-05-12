const { DatabaseSync } = require('node:sqlite');
const bcrypt = require('bcryptjs');
const path = require('path');

const DB_PATH = path.join(__dirname, 'data.db');
const db = new DatabaseSync(DB_PATH);

db.exec('PRAGMA journal_mode = WAL');
db.exec('PRAGMA foreign_keys = ON');

// ─── Schema ────────────────────────────────────────────────────────────────────

db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id         INTEGER PRIMARY KEY AUTOINCREMENT,
    username   TEXT    NOT NULL UNIQUE,
    password   TEXT    NOT NULL,
    role       TEXT    NOT NULL DEFAULT 'student',  -- 'admin' | 'student'
    name       TEXT    NOT NULL DEFAULT '',
    created_at TEXT    NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS student_data (
    id         INTEGER PRIMARY KEY AUTOINCREMENT,
    student_id INTEGER NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
    level      TEXT    NOT NULL DEFAULT 'B1+',
    start_date TEXT    NOT NULL DEFAULT 'май 2026',
    data_json  TEXT    NOT NULL DEFAULT '{}'
  );

  CREATE TABLE IF NOT EXISTS test_results (
    id         INTEGER PRIMARY KEY AUTOINCREMENT,
    student_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    month      TEXT    NOT NULL,
    results    TEXT    NOT NULL,
    created_at TEXT    NOT NULL DEFAULT (datetime('now'))
  );
`);

// ─── Seed admin user if not exists ─────────────────────────────────────────────

const adminExists = db.prepare("SELECT id FROM users WHERE role = 'admin' LIMIT 1").get();
if (!adminExists) {
  const hash = bcrypt.hashSync('admin123', 10);
  db.prepare("INSERT INTO users (username, password, role, name) VALUES (?, ?, 'admin', 'Преподаватель')").run('admin', hash);
  console.log('✅ Admin user created: login=admin, password=admin123  ← CHANGE THIS IN PRODUCTION');
}

// ─── Helper statements ─────────────────────────────────────────────────────────

const stmts = {
  findUserByUsername: db.prepare('SELECT * FROM users WHERE username = ?'),
  findUserById:       db.prepare('SELECT id, username, role, name FROM users WHERE id = ?'),
  allStudents:        db.prepare("SELECT id, username, name FROM users WHERE role = 'student' ORDER BY name"),
  createUser:         db.prepare("INSERT INTO users (username, password, role, name) VALUES (?, ?, 'student', ?)"),
  deleteUser:         db.prepare("DELETE FROM users WHERE id = ? AND role = 'student'"),
  updateUserName:     db.prepare('UPDATE users SET name = ? WHERE id = ?'),
  updateUserPass:     db.prepare('UPDATE users SET password = ? WHERE id = ?'),

  getStudentData:     db.prepare('SELECT * FROM student_data WHERE student_id = ?'),
  upsertStudentData:  db.prepare(`
    INSERT INTO student_data (student_id, level, start_date, data_json)
    VALUES (?, ?, ?, ?)
    ON CONFLICT(student_id) DO UPDATE SET
      level      = excluded.level,
      start_date = excluded.start_date,
      data_json  = excluded.data_json
  `),

  getTests:           db.prepare('SELECT * FROM test_results WHERE student_id = ? ORDER BY id ASC'),
  addTest:            db.prepare('INSERT INTO test_results (student_id, month, results) VALUES (?, ?, ?)'),
  deleteTest:         db.prepare('DELETE FROM test_results WHERE id = ? AND student_id = ?'),
};

module.exports = { db, stmts, bcrypt };
