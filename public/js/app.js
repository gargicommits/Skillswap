const TOKEN_KEY = 'skillswap_token';
const USER_KEY = 'skillswap_user';

const api = {
  async request(path, options = {}) {
    const headers = { ...(options.headers || {}) };
    const token = getToken();
    if (!(options.body instanceof FormData)) {
      headers['Content-Type'] = 'application/json';
    }
    if (token) headers.Authorization = `Bearer ${token}`;

    let res;
    try {
      res = await fetch(path, { ...options, headers });
    } catch (_) {
      throw new Error('Unable to reach SkillSwap. Check your connection.');
    }

    const data = await res.json().catch(() => ({ success: false, message: 'Unexpected server response' }));
    if (res.status === 401 && !path.includes('/api/auth/login')) {
      clearAuth();
      if (!location.pathname.endsWith('login.html')) {
        location.href = '/login.html';
      }
      throw new Error(data.message || 'Session expired. Please login again.');
    }
    if (!res.ok || data.success === false) {
      throw new Error(data.message || 'Something went wrong');
    }
    return data;
  },
  get(path) {
    return this.request(path);
  },
  post(path, body) {
    return this.request(path, { method: 'POST', body: body instanceof FormData ? body : JSON.stringify(body) });
  },
  put(path, body) {
    return this.request(path, { method: 'PUT', body: JSON.stringify(body || {}) });
  },
  del(path) {
    return this.request(path, { method: 'DELETE' });
  }
};

function getToken() {
  return localStorage.getItem(TOKEN_KEY);
}

function getUser() {
  try {
    return JSON.parse(localStorage.getItem(USER_KEY) || 'null');
  } catch (_) {
    return null;
  }
}

function setAuth(token, user) {
  localStorage.setItem(TOKEN_KEY, token);
  localStorage.setItem(USER_KEY, JSON.stringify(user));
}

function clearAuth() {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(USER_KEY);
}

function requireAuth() {
  if (!getToken()) {
    location.href = '/login.html';
    return false;
  }
  return true;
}

function showAlert(el, message, type = 'error') {
  if (!el) return;
  el.className = `alert show ${type === 'ok' ? 'alert-ok' : 'alert-error'}`;
  el.textContent = message;
}

function brandSvg() {
  return `<span class="brand-mark">↻</span><span>SkillSwap</span>`;
}

function navHtml() {
  const user = getUser();
  const path = location.pathname.split('/').pop() || 'index.html';
  const guest = !user;
  const left = guest
    ? [
        ['index.html', 'Home'],
        ['discover.html', 'Discover'],
        ['index.html#how', 'How It Works'],
        ['about.html', 'About']
      ]
    : [
        ['dashboard.html', 'Dashboard'],
        ['discover.html', 'Discover'],
        ['swaps.html', 'My Swaps'],
        ['requests.html', 'Requests'],
        ['messages.html', 'Messages'],
        ['wallet.html', 'Wallet']
      ];

  const links = left
    .map(([href, label]) => `<a class="${path === href ? 'active' : ''}" href="/${href}">${label}</a>`)
    .join('');

  const actions = guest
    ? `<a href="/login.html">Login</a><a class="btn btn-primary btn-sm" href="/register.html">Sign Up</a>`
    : `<span class="credits-chip btn-sm">💎 ${user.credits ?? 0}</span>
       <a href="/profile.html">Profile</a>
       <button type="button" id="logoutBtn">Logout</button>`;

  return `
    <a class="brand" href="${guest ? '/index.html' : '/dashboard.html'}">${brandSvg()}</a>
    <div class="nav-links">${links}</div>
    <div class="nav-actions">${actions}</div>
    <button class="hamburger" id="menuBtn" aria-label="Menu">☰</button>
    <div class="mobile-menu" id="mobileMenu">${links}${actions}</div>
  `;
}

function mountNav() {
  const nav = document.getElementById('appNav');
  if (!nav) return;
  nav.className = 'app-nav';
  nav.innerHTML = navHtml();
  const logout = nav.querySelectorAll('#logoutBtn');
  logout.forEach((btn) =>
    btn.addEventListener('click', () => {
      clearAuth();
      location.href = '/index.html';
    })
  );
  const menuBtn = document.getElementById('menuBtn');
  const mobile = document.getElementById('mobileMenu');
  menuBtn?.addEventListener('click', () => {
    mobile.style.display = mobile.style.display === 'flex' ? 'none' : 'flex';
  });
}

function avatarSrc(user) {
  return user?.profileImage || `https://api.dicebear.com/7.x/adventurer/svg?seed=${encodeURIComponent(user?.name || 'User')}`;
}

function skillBadges(skills, cls = '') {
  return (skills || []).map((s) => `<span class="badge ${cls}">${s.icon || ''} ${s.name}</span>`).join('') || '<span class="badge">None yet</span>';
}

function userCard(user, { showRequest = true } = {}) {
  return `
    <article class="card user-card">
      <div class="user-top">
        <img class="avatar" src="${avatarSrc(user)}" alt="${user.name}">
        <div>
          <div style="display:flex;align-items:center;gap:6px;flex-wrap:wrap">
            <strong>${user.name}</strong>
            ${user.isErpVerified !== false ? `<span class="badge" style="background:#e0f2fe;color:#0369a1;font-size:0.7rem;padding:2px 7px">🎓 ERP Verified</span>` : ''}
          </div>
          <div style="color:var(--muted);font-size:0.88rem">@${user.username}${user.erpId ? ` · ${user.erpId}` : ''}</div>
          <div class="stars">⭐ ${Number(user.rating || 0).toFixed(1)}</div>
        </div>
        <div class="match-pill">${user.matchPercent || 0}% Match</div>
      </div>
      <div><small>Teaches</small><div class="badges">${skillBadges(user.skillsToTeach)}</div></div>
      <div><small>Wants to learn</small><div class="badges">${skillBadges(user.skillsToLearn, 'learn')}</div></div>
      <div class="card-actions">
        <a class="btn btn-secondary btn-sm" href="/profile.html?id=${user._id}">View Profile</a>
        ${showRequest ? `<a class="btn btn-primary btn-sm" href="/profile.html?id=${user._id}#swap">Request Swap</a>` : ''}
      </div>
    </article>
  `;
}

function emptyState(title, text) {
  return `<div class="empty card"><h3>${title}</h3><p>${text}</p></div>`;
}

async function refreshMe() {
  if (!getToken()) return null;
  const data = await api.get('/api/auth/me');
  localStorage.setItem(USER_KEY, JSON.stringify(data.user));
  return data.user;
}

document.addEventListener('DOMContentLoaded', () => {
  mountNav();
});
