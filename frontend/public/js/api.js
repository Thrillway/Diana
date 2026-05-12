// ── API wrapper ────────────────────────────────────────────────────────────────

const API = {
  _token: null,

  setToken(t) { this._token = t; localStorage.setItem('token', t); },
  loadToken()  { this._token = localStorage.getItem('token'); },
  clearToken() { this._token = null; localStorage.removeItem('token'); },

  async request(method, url, body) {
    const opts = {
      method,
      headers: { 'Content-Type': 'application/json' },
    };
    if (this._token) opts.headers['Authorization'] = 'Bearer ' + this._token;
    if (body)        opts.body = JSON.stringify(body);

    const res = await fetch(url, opts);
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.error || res.statusText);
    return data;
  },

  get(url)          { return this.request('GET',    url); },
  post(url, body)   { return this.request('POST',   url, body); },
  put(url, body)    { return this.request('PUT',    url, body); },
  patch(url, body)  { return this.request('PATCH',  url, body); },
  del(url)          { return this.request('DELETE', url); },

  login(username, password) { return this.post('/api/login', { username, password }); },
  me()                      { return this.get('/api/me'); },

  // Admin
  getStudents()             { return this.get('/api/admin/students'); },
  createStudent(d)          { return this.post('/api/admin/students', d); },
  deleteStudent(id)         { return this.del(`/api/admin/students/${id}`); },
  changePassword(id, pass)  { return this.patch(`/api/admin/students/${id}/password`, { password: pass }); },
  changeName(id, name)      { return this.patch(`/api/admin/students/${id}/name`, { name }); },

  // Student data
  getData(id)               { return this.get(`/api/students/${id}/data`); },
  saveData(id, payload)     { return this.put(`/api/students/${id}/data`, payload); },

  // Tests
  getTests(id)              { return this.get(`/api/students/${id}/tests`); },
  addTest(id, d)            { return this.post(`/api/students/${id}/tests`, d); },
  deleteTest(sid, tid)      { return this.del(`/api/students/${sid}/tests/${tid}`); },
};
