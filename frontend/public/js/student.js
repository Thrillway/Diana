// ── Student cabinet ────────────────────────────────────────────────────────────
// viewer: { id, name, role }  — who is viewing (admin or the student themselves)
// target: { id, name }        — whose cabinet it is

async function renderStudentCabinet(viewer, target, onBack) {
  const app = document.getElementById('app');
  app.innerHTML = '<div style="text-align:center;padding:40px;color:#fff">Загрузка...</div>';

  const isAdmin = viewer.role === 'admin';
  let sd, tests;

  try {
    [sd, tests] = await Promise.all([API.getData(target.id), API.getTests(target.id)]);
  } catch(e) {
    showToast(e.message, true);
    app.innerHTML = '';
    return;
  }

  // sd.data holds the big JSON blob; ensure fields exist
  const data = Object.assign({
    grammar: {}, vocabulary: {}, strategies: {},
    classSchedule: [],
    overview: { nextClass: '', nextClassTime: '', remainingClasses: 0, totalClasses: 4 },
    schedule: { time: '', info: '' },
    payment: { subscriptionType: '', subscriptionDesc: '', remaining: 0, total: 4, price: '', nextPayment: '', history: [] },
    calendarMonth: { year: new Date().getFullYear(), month: new Date().getMonth() + 1 },
  }, sd.data);

  // auto-save helper (admin only)
  let saveTimer = null;
  function scheduleSave() {
    if (!isAdmin) return;
    clearTimeout(saveTimer);
    saveTimer = setTimeout(() => {
      API.saveData(target.id, { level: sd.level, start_date: sd.start_date, data })
        .catch(e => showToast(e.message, true));
    }, 700);
  }

  // ── Build UI ─────────────────────────────────────────────────────────────────

  app.innerHTML = '';

  const wrap = el('div', { className: 'container' });
  app.appendChild(wrap);

  // ── Header ──────────────────────────────────────────────────────────────────
  const headerRight = el('div', { className: 'header-right' });
  const levelBadge  = el('div', { className: 'level-badge' }, 'Уровень: ' + sd.level);
  headerRight.appendChild(el('div', { className: 'user-meta' },
    el('div', {}, `Студент: ${target.name}`),
    el('div', {}, `Начало: ${sd.start_date}`),
  ));
  headerRight.appendChild(levelBadge);

  if (isAdmin) {
    const editLevelBtn = el('button', { className: 'btn-secondary btn-sm' }, '✏️ Уровень');
    editLevelBtn.addEventListener('click', () => {
      const v = prompt('Уровень (например B1+):', sd.level);
      if (v) { sd.level = v; levelBadge.textContent = 'Уровень: ' + v; scheduleSave(); }
    });
    headerRight.appendChild(editLevelBtn);
  }

  if (onBack) {
    const backBtn = el('button', { className: 'back-btn', onClick: onBack }, '← Назад');
    headerRight.appendChild(backBtn);
  }

  if (!onBack) {
    // It's the student's own session — show logout
    headerRight.appendChild(el('button', { className: 'btn-danger btn-sm', onClick: () => App.logout() }, 'Выход'));
  }

  const header = el('div', { className: 'header' },
    el('div', {},
      el('h1', {}, '📚 Личный кабинет'),
      el('p', { style: { color: '#999', marginTop: '5px', fontSize: '14px' } }, 'Английский язык'),
    ),
    headerRight,
  );
  wrap.appendChild(header);

  // ── Tabs ─────────────────────────────────────────────────────────────────────
  const TABS = [
    { id: 'overview',    label: '📊 Обзор' },
    { id: 'schedule',    label: '📅 Расписание' },
    { id: 'payment',     label: '💰 Оплата' },
    { id: 'grammar',     label: '📖 Грамматика' },
    { id: 'vocabulary',  label: '📝 Лексика' },
    { id: 'strategies',  label: '🎯 Стратегии' },
    { id: 'tests',       label: '✅ Пробники' },
  ];

  const tabsBar = el('div', { className: 'tabs' });
  const tabContents = {};

  TABS.forEach((t, i) => {
    const btn = el('button', { className: 'tab-btn' + (i === 0 ? ' active' : '') }, t.label);
    btn.addEventListener('click', () => {
      tabsBar.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      Object.values(tabContents).forEach(c => c.style.display = 'none');
      tabContents[t.id].style.display = 'block';
      if (t.id === 'overview') updateProgressDisplay();
    });
    tabsBar.appendChild(btn);
    const content = el('div', { style: { display: i === 0 ? 'block' : 'none' } });
    tabContents[t.id] = content;
  });

  wrap.appendChild(tabsBar);
  TABS.forEach(t => wrap.appendChild(tabContents[t.id]));

  // ── OVERVIEW ──────────────────────────────────────────────────────────────────
  function buildOverview() {
    const c = tabContents['overview'];

    // Progress card
    const progressCard = el('div', { className: 'card' });
    progressCard.innerHTML = '<h3>📊 Общий прогресс</h3>';
    const progressSec = el('div', { className: 'progress-section' });
    const progLabel = el('div', { className: 'progress-label' });
    const progBar   = el('div', { className: 'progress-bar' });
    const progFill  = el('div', { className: 'progress-fill', style: { width: '0%' } });
    const progStats = el('div', { className: 'progress-stats' });
    progBar.appendChild(progFill);
    progressSec.append(progLabel, progBar, progStats);
    progressCard.appendChild(progressSec);
    c.appendChild(progressCard);

    function updateProgressDisplay() {
      const gr = Object.values(data.grammar).filter(Boolean).length;
      const vc = Object.values(data.vocabulary).filter(Boolean).length;
      const st = Object.values(data.strategies).filter(Boolean).length;
      const done = gr + vc + st;
      const total = Object.keys(data.grammar).length + Object.keys(data.vocabulary).length + Object.keys(data.strategies).length;
      const pct = total > 0 ? Math.round(done / total * 100) : 0;
      progLabel.innerHTML = `Прогресс обучения: <strong>${pct}%</strong>`;
      progFill.style.width = pct + '%';
      progFill.textContent = pct > 10 ? pct + '%' : '';
      progStats.textContent = `Пройдено тем: ${done} из ${total}`;
    }
    updateProgressDisplay();
    // expose for tab switch
    window._updateProgress = updateProgressDisplay;

    // Quick info card
    const infoCard = el('div', { className: 'card' });
    infoCard.innerHTML = '<h3>📌 Быстрая информация</h3>';
    const grid = el('div', { className: 'info-grid' });

    const nc  = el('div', { className: 'value' }, data.overview.nextClass);
    const nct = el('div', { className: 'sub accent' }, data.overview.nextClassTime);
    const rc  = el('div', { className: 'value' }, String(data.overview.remainingClasses));
    const rct = el('div', { className: 'sub' }, `из ${data.overview.totalClasses} занятий`);

    grid.appendChild(el('div', { className: 'info-box' },
      el('label', {}, 'Следующее занятие'), nc, nct));
    grid.appendChild(el('div', { className: 'info-box' },
      el('label', {}, 'Осталось занятий'), rc, rct));

    infoCard.appendChild(grid);

    if (isAdmin) {
      const editBtn = el('button', { className: 'btn-primary', style: { marginTop: '15px' } }, '✏️ Редактировать');
      const panel   = el('div', { className: 'edit-panel', style: { display: 'none' } });
      panel.innerHTML = '<h4>Редактировать обзор</h4>';

      const f1 = fieldRow('Следующее занятие', 'text',   data.overview.nextClass);
      const f2 = fieldRow('Время занятия',      'text',   data.overview.nextClassTime);
      const f3 = fieldRow('Осталось занятий',   'number', data.overview.remainingClasses);
      const f4 = fieldRow('Всего в абонементе', 'number', data.overview.totalClasses);
      [f1, f2, f3, f4].forEach(f => panel.appendChild(f.row));

      const saveBtn   = el('button', { className: 'btn-success' }, 'Сохранить');
      const cancelBtn = el('button', { className: 'btn-secondary' }, 'Отмена');
      saveBtn.addEventListener('click', () => {
        data.overview.nextClass        = f1.input.value;
        data.overview.nextClassTime    = f2.input.value;
        data.overview.remainingClasses = parseInt(f3.input.value) || 0;
        data.overview.totalClasses     = parseInt(f4.input.value) || 4;
        nc.textContent  = data.overview.nextClass;
        nct.textContent = data.overview.nextClassTime;
        rc.textContent  = String(data.overview.remainingClasses);
        rct.textContent = `из ${data.overview.totalClasses} занятий`;
        scheduleSave();
        panel.style.display = 'none';
        showToast('Сохранено');
      });
      cancelBtn.addEventListener('click', () => panel.style.display = 'none');
      panel.appendChild(el('div', { className: 'form-actions' }, saveBtn, cancelBtn));

      editBtn.addEventListener('click', () => {
        panel.style.display = panel.style.display === 'none' ? 'block' : 'none';
      });
      infoCard.appendChild(editBtn);
      infoCard.appendChild(panel);
    }
    c.appendChild(infoCard);
  }
  buildOverview();

  function updateProgressDisplay() {
    if (window._updateProgress) window._updateProgress();
  }

  // ── SCHEDULE ──────────────────────────────────────────────────────────────────
  function buildSchedule() {
    const c = tabContents['schedule'];
    const card = el('div', { className: 'card' });
    card.innerHTML = '<h3>📅 Расписание занятий</h3>';

    const calDiv = el('div', { className: 'calendar' });
    const cm = data.calendarMonth;
    renderCalendar(calDiv, data.classSchedule, cm.year, cm.month);
    card.appendChild(calDiv);

    const timeP = el('p', { style: { color: '#999', fontSize: '14px', marginTop: '15px' } },
      '⏰ ' + (data.schedule.time || 'Время не указано'));
    const infoP = el('p', { style: { color: '#999', fontSize: '14px', marginTop: '5px' } });
    infoP.innerHTML = (data.schedule.info || '').replace(/\n/g, '<br>');
    card.appendChild(timeP);
    card.appendChild(infoP);

    if (isAdmin) {
      const editBtn = el('button', { className: 'btn-primary', style: { marginTop: '15px', marginRight: '8px' } }, '✏️ Расписание');
      const calBtn  = el('button', { className: 'btn-primary', style: { marginTop: '15px' } }, '✏️ Дни занятий');
      const panel   = el('div', { className: 'edit-panel', style: { display: 'none' } });
      panel.innerHTML = '<h4>Редактировать расписание</h4>';

      const f1 = fieldRow('Время занятий', 'text', data.schedule.time);
      const f2 = textareaRow('Информация (Enter = новая строка)', data.schedule.info);
      [f1.row, f2.row].forEach(r => panel.appendChild(r));

      const saveBtn   = el('button', { className: 'btn-success' }, 'Сохранить');
      const cancelBtn = el('button', { className: 'btn-secondary' }, 'Отмена');
      saveBtn.addEventListener('click', () => {
        data.schedule.time = f1.input.value;
        data.schedule.info = f2.input.value;
        timeP.textContent  = '⏰ ' + data.schedule.time;
        infoP.innerHTML    = data.schedule.info.replace(/\n/g, '<br>');
        scheduleSave();
        panel.style.display = 'none';
        showToast('Сохранено');
      });
      cancelBtn.addEventListener('click', () => panel.style.display = 'none');
      panel.appendChild(el('div', { className: 'form-actions' }, saveBtn, cancelBtn));
      editBtn.addEventListener('click', () => { panel.style.display = panel.style.display === 'none' ? 'block' : 'none'; });

      const calPanel = el('div', { className: 'edit-panel', style: { display: 'none' } });
      calPanel.innerHTML = '<h4>Редактировать дни и месяц</h4>';
      const fDays  = fieldRow('Дни занятий (через запятую)', 'text', data.classSchedule.join(', '));
      const fYear  = fieldRow('Год',   'number', cm.year);
      const fMonth = fieldRow('Месяц (1-12)', 'number', cm.month);
      [fDays.row, fYear.row, fMonth.row].forEach(r => calPanel.appendChild(r));

      const saveCalBtn   = el('button', { className: 'btn-success' }, 'Сохранить');
      const cancelCalBtn = el('button', { className: 'btn-secondary' }, 'Отмена');
      saveCalBtn.addEventListener('click', () => {
        data.classSchedule = fDays.input.value.split(',').map(x => parseInt(x.trim())).filter(n => !isNaN(n));
        data.calendarMonth.year  = parseInt(fYear.input.value) || cm.year;
        data.calendarMonth.month = parseInt(fMonth.input.value) || cm.month;
        renderCalendar(calDiv, data.classSchedule, data.calendarMonth.year, data.calendarMonth.month);
        scheduleSave();
        calPanel.style.display = 'none';
        showToast('Сохранено');
      });
      cancelCalBtn.addEventListener('click', () => calPanel.style.display = 'none');
      calPanel.appendChild(el('div', { className: 'form-actions' }, saveCalBtn, cancelCalBtn));
      calBtn.addEventListener('click', () => { calPanel.style.display = calPanel.style.display === 'none' ? 'block' : 'none'; });

      card.appendChild(editBtn);
      card.appendChild(calBtn);
      card.appendChild(panel);
      card.appendChild(calPanel);
    }
    c.appendChild(card);
  }
  buildSchedule();

  // ── PAYMENT ───────────────────────────────────────────────────────────────────
  function buildPayment() {
    const c = tabContents['payment'];
    const card = el('div', { className: 'card' });
    card.innerHTML = '<h3>💰 Информация об оплате</h3>';
    const p = data.payment;

    const subType = el('div', { className: 'value' }, p.subscriptionType);
    const subDesc = el('div', { className: 'sub' }, p.subscriptionDesc);
    const rem     = el('div', { className: 'value', style: { color: '#e74c3c' } }, String(p.remaining));
    const remSub  = el('div', { className: 'sub' }, `из ${p.total}`);
    const price   = el('div', { className: 'value' }, p.price);
    const nextP   = el('div', { className: 'value' }, p.nextPayment);

    const grid = el('div', { className: 'info-grid' },
      el('div', { className: 'info-box' }, el('label', {}, 'Абонемент'), subType, subDesc),
      el('div', { className: 'info-box' }, el('label', {}, 'Осталось занятий'), rem, remSub),
      el('div', { className: 'info-box' }, el('label', {}, 'Стоимость занятия'), price),
      el('div', { className: 'info-box' }, el('label', {}, 'Следующая оплата'), nextP),
    );
    card.appendChild(grid);

    // History
    const histTitle = el('h4', {}, 'История платежей');
    card.appendChild(histTitle);

    let histTable = buildHistoryTable(p.history || []);
    card.appendChild(histTable);

    if (isAdmin) {
      const editBtn = el('button', { className: 'btn-primary', style: { marginTop: '15px' } }, '✏️ Редактировать');
      const panel   = el('div', { className: 'edit-panel', style: { display: 'none' } });
      panel.innerHTML = '<h4>Редактировать оплату</h4>';

      const f1 = fieldRow('Тип абонемента', 'text',   p.subscriptionType);
      const f2 = fieldRow('Описание',       'text',   p.subscriptionDesc);
      const f3 = fieldRow('Осталось занятий','number', p.remaining);
      const f4 = fieldRow('Всего в абонементе','number', p.total);
      const f5 = fieldRow('Стоимость',      'text',   p.price);
      const f6 = fieldRow('Дата оплаты',    'text',   p.nextPayment);
      [f1,f2,f3,f4,f5,f6].forEach(f => panel.appendChild(f.row));

      // History add
      panel.appendChild(el('h4', {}, 'Добавить платёж'));
      const hDate = fieldRow('Дата',    'text',   '');
      const hAmt  = fieldRow('Сумма',   'text',   '');
      const hSub  = fieldRow('Абонемент','text',  '');
      [hDate, hAmt, hSub].forEach(f => panel.appendChild(f.row));
      const addHistBtn = el('button', { className: 'btn-primary btn-sm', style: { marginBottom: '10px' } }, '+ Добавить');
      addHistBtn.addEventListener('click', () => {
        if (!hDate.input.value) return;
        if (!p.history) p.history = [];
        p.history.push({ date: hDate.input.value, amount: hAmt.input.value, subscription: hSub.input.value });
        hDate.input.value = ''; hAmt.input.value = ''; hSub.input.value = '';
        refreshHistory();
        scheduleSave();
      });
      panel.appendChild(addHistBtn);

      const saveBtn   = el('button', { className: 'btn-success' }, 'Сохранить');
      const cancelBtn = el('button', { className: 'btn-secondary' }, 'Отмена');
      saveBtn.addEventListener('click', () => {
        p.subscriptionType = f1.input.value;
        p.subscriptionDesc = f2.input.value;
        p.remaining        = parseInt(f3.input.value) || 0;
        p.total            = parseInt(f4.input.value) || 4;
        p.price            = f5.input.value;
        p.nextPayment      = f6.input.value;
        subType.textContent = p.subscriptionType;
        subDesc.textContent = p.subscriptionDesc;
        rem.textContent     = String(p.remaining);
        remSub.textContent  = `из ${p.total}`;
        price.textContent   = p.price;
        nextP.textContent   = p.nextPayment;
        scheduleSave();
        panel.style.display = 'none';
        showToast('Сохранено');
      });
      cancelBtn.addEventListener('click', () => panel.style.display = 'none');
      panel.appendChild(el('div', { className: 'form-actions' }, saveBtn, cancelBtn));
      editBtn.addEventListener('click', () => { panel.style.display = panel.style.display === 'none' ? 'block' : 'none'; });
      card.appendChild(editBtn);
      card.appendChild(panel);
    }
    c.appendChild(card);

    function refreshHistory() {
      const newTable = buildHistoryTable(p.history || []);
      histTable.replaceWith(newTable);
      histTable = newTable;
    }

    function buildHistoryTable(history) {
      const table = el('table', { className: 'table' });
      table.innerHTML = '<thead><tr><th>Дата</th><th>Сумма</th><th>Абонемент</th>' + (isAdmin ? '<th></th>' : '') + '</tr></thead>';
      const tbody = el('tbody');
      (history || []).forEach((h, i) => {
        const tr = el('tr', {},
          el('td', {}, h.date),
          el('td', {}, el('strong', {}, h.amount)),
          el('td', {}, h.subscription),
        );
        if (isAdmin) {
          const del = el('button', { className: 'btn-danger btn-sm' }, '✕');
          del.addEventListener('click', () => {
            p.history.splice(i, 1);
            scheduleSave();
            refreshHistory();
          });
          tr.appendChild(el('td', {}, del));
        }
        tbody.appendChild(tr);
      });
      table.appendChild(tbody);
      return table;
    }
  }
  buildPayment();

  // ── GRAMMAR ───────────────────────────────────────────────────────────────────
  function buildChecklist(tabId, topics, dataField, keyPrefix, isFlat) {
    const c = tabContents[tabId];
    const card = el('div', { className: 'card' });
    const titles = { grammar: '📖 Грамматический кодификатор', vocabulary: '📝 Лексический кодификатор', strategies: '🎯 Стратегии выполнения заданий' };
    card.innerHTML = `<h3>${titles[tabId]}</h3>`;
    const listDiv = el('div');
    card.appendChild(listDiv);

    function onToggle(key, val) {
      if (!isAdmin) return;
      data[dataField][key] = val;
      scheduleSave();
      updateProgressDisplay();
    }

    if (isFlat) {
      renderFlatChecklist(listDiv, topics, data[dataField], keyPrefix, isAdmin, onToggle);
    } else {
      renderChecklist(listDiv, topics, data[dataField], keyPrefix, isAdmin, onToggle);
    }
    c.appendChild(card);
  }

  buildChecklist('grammar',    GRAMMAR_TOPICS,    'grammar',    'grammar',    false);
  buildChecklist('vocabulary', VOCABULARY_TOPICS, 'vocabulary', 'vocab',      true);
  buildChecklist('strategies', STRATEGIES_TOPICS, 'strategies', 'strategies', false);

  // ── TESTS ─────────────────────────────────────────────────────────────────────
  function buildTests() {
    const c = tabContents['tests'];
    const card = el('div', { className: 'card' });
    card.innerHTML = '<h3>✅ Результаты пробников</h3>';

    const listDiv = el('div');
    renderTestsList(listDiv, tests);
    card.appendChild(listDiv);

    // Add form (available to both student and admin)
    const addBtn = el('button', { className: 'btn-primary', style: { marginTop: '10px' } }, '+ Добавить результат пробника');
    const panel  = el('div', { className: 'edit-panel', style: { display: 'none' } });
    panel.innerHTML = '<h4>Новый результат</h4>';

    const fMonth   = fieldRow('Месяц/период', 'text', '');
    const fResults = textareaRow('Результаты (задания, баллы, комментарии)', '');
    panel.appendChild(fMonth.row);
    panel.appendChild(fResults.row);

    const saveBtn   = el('button', { className: 'btn-success' }, 'Сохранить');
    const cancelBtn = el('button', { className: 'btn-secondary' }, 'Отмена');
    saveBtn.addEventListener('click', async () => {
      const month   = fMonth.input.value.trim();
      const results = fResults.input.value.trim();
      if (!month || !results) { showToast('Заполните все поля', true); return; }
      try {
        const newTest = await API.addTest(target.id, { month, results });
        tests.push(newTest);
        renderTestsList(listDiv, tests);
        fMonth.input.value = ''; fResults.input.value = '';
        panel.style.display = 'none';
        showToast('Результат сохранён');
      } catch(e) { showToast(e.message, true); }
    });
    cancelBtn.addEventListener('click', () => panel.style.display = 'none');
    panel.appendChild(el('div', { className: 'form-actions' }, saveBtn, cancelBtn));
    addBtn.addEventListener('click', () => { panel.style.display = panel.style.display === 'none' ? 'block' : 'none'; });

    card.appendChild(addBtn);
    card.appendChild(panel);
    c.appendChild(card);

    function renderTestsList(container, list) {
      container.innerHTML = '';
      if (!list.length) {
        container.appendChild(el('p', { style: { color: '#999', marginBottom: '15px' } }, 'Результатов пробников пока нет.'));
        return;
      }
      const table = el('table', { className: 'table' });
      table.innerHTML = '<thead><tr><th>Период</th><th>Результаты</th>' + (isAdmin ? '<th></th>' : '') + '</tr></thead>';
      const tbody = el('tbody');
      list.forEach((t) => {
        const tr = el('tr', {},
          el('td', {}, el('strong', {}, t.month)),
          el('td', { style: { whiteSpace: 'pre-wrap' } }, t.results),
        );
        if (isAdmin) {
          const del = el('button', { className: 'btn-danger btn-sm' }, '✕');
          del.addEventListener('click', async () => {
            try {
              await API.deleteTest(target.id, t.id);
              const idx = tests.indexOf(t);
              if (idx >= 0) tests.splice(idx, 1);
              renderTestsList(container, tests);
              showToast('Удалено');
            } catch(e) { showToast(e.message, true); }
          });
          tr.appendChild(el('td', {}, del));
        }
        tbody.appendChild(tr);
      });
      table.appendChild(tbody);
      container.appendChild(table);
    }
  }
  buildTests();

  // ── helpers ───────────────────────────────────────────────────────────────────
  function fieldRow(label, type, value) {
    const input = el('input', { type });
    input.value = value != null ? value : '';
    const row = el('div', { className: 'form-row' },
      el('label', {}, label), input);
    return { row, input };
  }

  function textareaRow(label, value) {
    const input = el('textarea', {});
    input.value = value || '';
    const row = el('div', { className: 'form-row' },
      el('label', {}, label), input);
    return { row, input };
  }
}
