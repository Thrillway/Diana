// ── Admin page ─────────────────────────────────────────────────────────────────

async function renderAdminPage(user) {
  const app = document.getElementById('app');
  app.innerHTML = '<div style="text-align:center;padding:40px;color:#fff">Загрузка...</div>';

  let students = await API.getStudents().catch(() => []);

  function render() {
    app.innerHTML = '';

    // Header
    const header = el('div', { className: 'admin-header' },
      el('h1', {}, '👩‍🏫 Панель администратора'),
      el('div', { style: { display: 'flex', gap: '10px', alignItems: 'center' } },
        el('span', { style: { color: '#666', fontSize: '14px' } }, `Привет, ${user.name}`),
        el('button', { className: 'btn-danger btn-sm', onClick: () => App.logout() }, 'Выход'),
      )
    );
    app.appendChild(header);

    // Students grid
    const gridTitle = el('h3', { style: { color: '#fff', marginBottom: '15px', fontSize: '18px' } }, '📋 Ученики');
    app.appendChild(gridTitle);

    const grid = el('div', { className: 'students-grid' });

    students.forEach(s => {
      const card = el('div', { className: 'student-card' },
        el('h3', {}, '👤 ' + s.name),
        el('div', { className: 'login-text' }, 'Логин: ' + s.username),
        el('div', { className: 'student-card-actions' },
          el('button', { className: 'btn-primary btn-sm', onClick: () => openStudentCabinet(s) }, '📂 Открыть кабинет'),
          el('button', { className: 'btn-secondary btn-sm', onClick: () => promptChangePassword(s) }, '🔑 Пароль'),
          el('button', { className: 'btn-danger btn-sm', onClick: () => confirmDeleteStudent(s) }, '🗑 Удалить'),
        )
      );
      grid.appendChild(card);
    });

    app.appendChild(grid);

    // Add student form
    const addCard = el('div', { className: 'card', style: { maxWidth: '500px' } });
    addCard.innerHTML = `<h3>➕ Добавить ученика</h3>`;
    const fName     = el('input', { type: 'text',     placeholder: 'Имя ученика' });
    const fLogin    = el('input', { type: 'text',     placeholder: 'Логин (латиница, без пробелов)' });
    const fPassword = el('input', { type: 'password', placeholder: 'Пароль' });
    const fBtn      = el('button', { className: 'btn-primary', style: { marginTop: '8px' } }, 'Создать');

    fBtn.addEventListener('click', async () => {
      const name     = fName.value.trim();
      const username = fLogin.value.trim();
      const password = fPassword.value;
      if (!name || !username || !password) { showToast('Заполните все поля', true); return; }
      try {
        const s = await API.createStudent({ name, username, password });
        students.push(s);
        fName.value = ''; fLogin.value = ''; fPassword.value = '';
        showToast('Ученик создан');
        render();
      } catch(e) { showToast(e.message, true); }
    });

    [el('div', { className: 'form-row' }, fName),
     el('div', { className: 'form-row' }, fLogin),
     el('div', { className: 'form-row' }, fPassword),
     fBtn,
    ].forEach(e => addCard.appendChild(e));

    app.appendChild(addCard);
  }

  async function promptChangePassword(s) {
    const p = prompt(`Новый пароль для ${s.name}:`);
    if (!p) return;
    try { await API.changePassword(s.id, p); showToast('Пароль изменён'); }
    catch(e) { showToast(e.message, true); }
  }

  async function confirmDeleteStudent(s) {
    if (!confirm(`Удалить ученика "${s.name}"? Все данные будут удалены.`)) return;
    try {
      await API.deleteStudent(s.id);
      students = students.filter(x => x.id !== s.id);
      showToast('Ученик удалён');
      render();
    } catch(e) { showToast(e.message, true); }
  }

  async function openStudentCabinet(s) {
    await renderStudentCabinet({ id: s.id, name: s.name, role: 'admin' }, s, () => {
      render(); // back to admin
    });
  }

  render();
}
