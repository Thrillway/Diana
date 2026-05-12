// ── App entrypoint ─────────────────────────────────────────────────────────────

const App = {
  currentUser: null,

  async init() {
    API.loadToken();
    if (API._token) {
      try {
        const me = await API.me();
        App.currentUser = me;
        App.route();
        return;
      } catch {
        API.clearToken();
      }
    }
    renderLoginPage(async (data) => {
      App.currentUser = { id: data.id, role: data.role, name: data.name };
      App.route();
    });
  },

  route() {
    const u = App.currentUser;
    if (!u) { renderLoginPage((d) => { App.currentUser = { id: d.id, role: d.role, name: d.name }; App.route(); }); return; }
    if (u.role === 'admin') {
      renderAdminPage(u);
    } else {
      renderStudentCabinet(u, { id: u.id, name: u.name }, null);
    }
  },

  logout() {
    API.clearToken();
    App.currentUser = null;
    renderLoginPage((data) => {
      App.currentUser = { id: data.id, role: data.role, name: data.name };
      App.route();
    });
  },
};

document.addEventListener('DOMContentLoaded', () => App.init());
