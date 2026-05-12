// ── Shared UI components ───────────────────────────────────────────────────────

function showToast(msg, isError = false) {
  let t = document.getElementById('__toast');
  if (!t) {
    t = document.createElement('div');
    t.id = '__toast';
    t.className = 'toast';
    document.body.appendChild(t);
  }
  t.textContent = msg;
  t.className = 'toast' + (isError ? ' error' : '');
  requestAnimationFrame(() => { t.classList.add('show'); });
  clearTimeout(t._timer);
  t._timer = setTimeout(() => t.classList.remove('show'), 3000);
}

function el(tag, props = {}, ...children) {
  const e = document.createElement(tag);
  Object.entries(props).forEach(([k, v]) => {
    if (k === 'className') e.className = v;
    else if (k === 'style') Object.assign(e.style, v);
    else if (k.startsWith('on')) e.addEventListener(k.slice(2).toLowerCase(), v);
    else e.setAttribute(k, v);
  });
  children.forEach(c => {
    if (c == null) return;
    e.appendChild(typeof c === 'string' ? document.createTextNode(c) : c);
  });
  return e;
}

function renderLoginPage(onLogin) {
  const app = document.getElementById('app');
  app.innerHTML = '';

  const errDiv = el('div', { className: 'login-error', id: 'loginErr' }, '');
  const usernameInput = el('input', { type: 'text', placeholder: 'Логин', id: 'loginUser', autocomplete: 'username' });
  const passwordInput = el('input', { type: 'password', placeholder: 'Пароль', id: 'loginPass', autocomplete: 'current-password' });
  const btn = el('button', { className: 'btn-primary' }, 'Войти');

  async function doLogin() {
    const username = usernameInput.value.trim();
    const password = passwordInput.value;
    if (!username || !password) { showErr('Введите логин и пароль'); return; }
    try {
      const data = await API.login(username, password);
      API.setToken(data.token);
      onLogin(data);
    } catch (e) {
      showErr(e.message);
    }
  }

  function showErr(msg) {
    errDiv.textContent = msg;
    errDiv.className = 'login-error show';
  }

  btn.addEventListener('click', doLogin);
  passwordInput.addEventListener('keydown', e => { if (e.key === 'Enter') doLogin(); });

  const box = el('div', { className: 'login-box' },
    el('h2', {}, '🔐 Вход в кабинет'),
    errDiv,
    usernameInput,
    passwordInput,
    btn,
  );

  app.appendChild(el('div', { className: 'login-wrap' }, box));
}

// ── Render checklist helper ────────────────────────────────────────────────────

function renderChecklist(container, topics, dataObj, keyPrefix, canEdit, onToggle) {
  container.innerHTML = '';
  Object.keys(topics).forEach(category => {
    const items = topics[category];
    const titleEl = el('div', { className: 'subcategory-title' }, category);
    container.appendChild(titleEl);
    const sub = el('div', { className: 'subcategory' });
    const pairs = typeof items === 'object' && !Array.isArray(items)
      ? Object.entries(items)
      : items.map(t => [t, null]);
    pairs.forEach(([topic, desc]) => {
      const key = `${keyPrefix}_${category}_${topic}`;
      const checked = !!dataObj[key];
      const cb = el('input', { type: 'checkbox', id: key });
      cb.checked = checked;
      if (!canEdit) cb.disabled = true;
      const labelText = desc ? `${topic} — ${desc}` : topic;
      const lbl = el('label', { for: key }, labelText);
      const item = el('div', { className: 'checklist-item' }, cb, lbl);
      cb.addEventListener('change', () => onToggle(key, cb.checked));
      sub.appendChild(item);
    });
    container.appendChild(sub);
  });
}

function renderFlatChecklist(container, topics, dataObj, keyPrefix, canEdit, onToggle) {
  container.innerHTML = '';
  Object.entries(topics).forEach(([key, desc]) => {
    const storeKey = `${keyPrefix}_${key}`;
    const checked = !!dataObj[storeKey];
    const cb = el('input', { type: 'checkbox', id: storeKey });
    cb.checked = checked;
    if (!canEdit) cb.disabled = true;
    const lbl = el('label', { for: storeKey },
      el('strong', {}, key + ' — '), desc
    );
    const item = el('div', { className: 'checklist-item' }, cb, lbl);
    cb.addEventListener('change', () => onToggle(storeKey, cb.checked));
    container.appendChild(item);
  });
}

function renderCalendar(container, schedule, year, month) {
  container.innerHTML = '';
  const monthNames = ['январь','февраль','март','апрель','май','июнь',
                      'июль','август','сентябрь','октябрь','ноябрь','декабрь'];
  const header = el('div', { className: 'calendar-header' }, `${monthNames[month-1]} ${year}`);
  container.appendChild(header);

  const dayNames = ['пн','вт','ср','чт','пт','сб','вс'];
  dayNames.forEach(d => container.appendChild(el('div', { className: 'day-name' }, d)));

  const firstDay = new Date(year, month - 1, 1);
  const daysInMonth = new Date(year, month, 0).getDate();
  const startDow = firstDay.getDay(); // 0=Sun
  const offset = startDow === 0 ? 6 : startDow - 1;
  for (let i = 0; i < offset; i++) container.appendChild(el('div', {}));

  const classSet = new Set(schedule || []);
  for (let d = 1; d <= daysInMonth; d++) {
    const dayEl = el('div', { className: 'calendar-day' + (classSet.has(d) ? ' has-class' : '') }, String(d));
    container.appendChild(dayEl);
  }
}
