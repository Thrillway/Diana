require('dotenv').config({ path: require('path').join(__dirname, '.env') });
const express = require('express');
const cors    = require('cors');
const path    = require('path');
const { stmts, bcrypt } = require('./db');
const { signToken, verifyToken, requireAdmin } = require('./auth');

const app  = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

// Serve frontend
app.use(express.static(path.join(__dirname, '..', 'frontend', 'public')));

// ─── AUTH ──────────────────────────────────────────────────────────────────────

// POST /api/login
app.post('/api/login', (req, res) => {
  const { username, password } = req.body;
  if (!username || !password) {
    return res.status(400).json({ error: 'Введите логин и пароль' });
  }
  const user = stmts.findUserByUsername.get(username);
  if (!user || !bcrypt.compareSync(password, user.password)) {
    return res.status(401).json({ error: 'Неверный логин или пароль' });
  }
  const token = signToken({ id: user.id, role: user.role, name: user.name });
  res.json({ token, role: user.role, name: user.name, id: user.id });
});

// GET /api/me
app.get('/api/me', verifyToken, (req, res) => {
  res.json({ id: req.user.id, role: req.user.role, name: req.user.name });
});

// ─── ADMIN: manage students ────────────────────────────────────────────────────

// GET /api/admin/students
app.get('/api/admin/students', requireAdmin, (req, res) => {
  res.json(stmts.allStudents.all());
});

// POST /api/admin/students  — create student
app.post('/api/admin/students', requireAdmin, (req, res) => {
  const { username, password, name } = req.body;
  if (!username || !password || !name) {
    return res.status(400).json({ error: 'Заполните все поля' });
  }
  const hash = bcrypt.hashSync(password, 10);
  try {
    const info = stmts.createUser.run(username, hash, name);
    res.json({ id: info.lastInsertRowid, username, name });
  } catch (e) {
    if (e.message.includes('UNIQUE')) {
      return res.status(409).json({ error: 'Логин уже занят' });
    }
    throw e;
  }
});

// DELETE /api/admin/students/:id
app.delete('/api/admin/students/:id', requireAdmin, (req, res) => {
  stmts.deleteUser.run(req.params.id);
  res.json({ ok: true });
});

// PATCH /api/admin/students/:id/password
app.patch('/api/admin/students/:id/password', requireAdmin, (req, res) => {
  const { password } = req.body;
  if (!password) return res.status(400).json({ error: 'Пароль не задан' });
  stmts.updateUserPass.run(bcrypt.hashSync(password, 10), req.params.id);
  res.json({ ok: true });
});

// PATCH /api/admin/students/:id/name
app.patch('/api/admin/students/:id/name', requireAdmin, (req, res) => {
  const { name } = req.body;
  if (!name) return res.status(400).json({ error: 'Имя не задано' });
  stmts.updateUserName.run(name, req.params.id);
  res.json({ ok: true });
});

// ─── STUDENT DATA ──────────────────────────────────────────────────────────────

function getStudentId(req, res) {
  // Admin can access any student; student can only access own
  const paramId = parseInt(req.params.id);
  if (req.user.role === 'admin') return paramId;
  if (req.user.id === paramId) return paramId;
  return null;
}

// GET /api/students/:id/data
app.get('/api/students/:id/data', verifyToken, (req, res) => {
  const sid = getStudentId(req, res);
  if (!sid) return res.status(403).json({ error: 'Доступ запрещён' });

  let row = stmts.getStudentData.get(sid);
  if (!row) {
    // create default record
    stmts.upsertStudentData.run(sid, 'B1+', 'май 2026', JSON.stringify(defaultData()));
    row = stmts.getStudentData.get(sid);
  }
  res.json({
    level:      row.level,
    start_date: row.start_date,
    data:       JSON.parse(row.data_json),
  });
});

// PUT /api/students/:id/data  — admin only for all fields; student can send only `tests` but we split it out
app.put('/api/students/:id/data', verifyToken, (req, res) => {
  const sid = getStudentId(req, res);
  if (!sid) return res.status(403).json({ error: 'Доступ запрещён' });

  if (req.user.role !== 'admin') {
    return res.status(403).json({ error: 'Доступ запрещён' });
  }

  const { level, start_date, data } = req.body;
  stmts.upsertStudentData.run(sid, level || 'B1+', start_date || 'май 2026', JSON.stringify(data || {}));
  res.json({ ok: true });
});

// ─── TEST RESULTS (students can add their own) ─────────────────────────────────

// GET /api/students/:id/tests
app.get('/api/students/:id/tests', verifyToken, (req, res) => {
  const sid = getStudentId(req, res);
  if (!sid) return res.status(403).json({ error: 'Доступ запрещён' });
  res.json(stmts.getTests.all(sid));
});

// POST /api/students/:id/tests
app.post('/api/students/:id/tests', verifyToken, (req, res) => {
  const sid = getStudentId(req, res);
  if (!sid) return res.status(403).json({ error: 'Доступ запрещён' });
  // Students can only add to their OWN cabinet
  if (req.user.role !== 'admin' && req.user.id !== parseInt(req.params.id)) {
    return res.status(403).json({ error: 'Доступ запрещён' });
  }
  const { month, results } = req.body;
  if (!month || !results) return res.status(400).json({ error: 'Заполните все поля' });
  const info = stmts.addTest.run(sid, month, results);
  res.json({ id: info.lastInsertRowid, month, results });
});

// DELETE /api/students/:id/tests/:testId
app.delete('/api/students/:id/tests/:testId', verifyToken, (req, res) => {
  const sid = getStudentId(req, res);
  if (!sid) return res.status(403).json({ error: 'Доступ запрещён' });
  if (req.user.role !== 'admin') return res.status(403).json({ error: 'Доступ запрещён' });
  stmts.deleteTest.run(req.params.testId, sid);
  res.json({ ok: true });
});

// ─── SPA fallback ─────────────────────────────────────────────────────────────

app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '..', 'frontend', 'public', 'index.html'));
});

// ─── Default data template ────────────────────────────────────────────────────

function defaultData() {
  return {
    grammar: {},
    vocabulary: {},
    strategies: {},
    classSchedule: [1, 4, 11, 16],
    overview: {
      nextClass: 'Пятница, 16 мая',
      nextClassTime: '13:00 МСК',
      remainingClasses: 1,
      totalClasses: 4,
    },
    schedule: {
      time: 'Понедельник и пятница в 13:00 МСК',
      info: '✅ Пройденные занятия: 3 (1, 4, 11 мая)\n⬜ Предстоящие: 16 мая',
    },
    payment: {
      subscriptionType: '4 занятия',
      subscriptionDesc: 'Парные занятия',
      remaining: 1,
      total: 4,
      price: '1 200 ₽',
      nextPayment: '15 мая 2026',
      history: [
        { date: '28 апреля 2026', amount: '4 800 ₽', subscription: '4 занятия' },
      ],
    },
    calendarMonth: { year: 2026, month: 5 },
  };
}

app.listen(PORT, () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
});
