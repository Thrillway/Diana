# Student Cabinet

Full-stack web app for managing student English-learning cabinets.

## Stack

- **Backend**: Node.js + Express + better-sqlite3 (no external DB server needed)
- **Frontend**: Vanilla JS SPA served by the same Express server
- **Auth**: JWT tokens (12h expiry)

## Quick Start

```bash
cd backend
npm install
npm start
```

Open http://localhost:3000

## Default admin credentials

```
Login:    admin
Password: admin123
```

> Change the admin password via the SQLite DB or add a "change password" route. The `.env` file holds `JWT_SECRET` — replace it with a long random string before deploying.

## Access model

| Role    | Can do |
|---------|--------|
| Admin   | Create/delete students, change passwords, open any student's cabinet, edit ALL blocks (overview, schedule, payment, grammar/vocabulary/strategies checklists, calendar), delete test results |
| Student | View own cabinet, add test results (month + text) |

## Project structure

```
backend/
  server.js   ← Express API
  db.js       ← SQLite schema + queries
  auth.js     ← JWT helpers
  .env        ← JWT_SECRET, PORT
frontend/
  public/
    index.html
    css/style.css
    js/
      api.js       ← fetch wrapper
      data.js      ← static topic lists
      components.js← shared UI helpers
      admin.js     ← admin panel
      student.js   ← student cabinet
      app.js       ← router / init
```
