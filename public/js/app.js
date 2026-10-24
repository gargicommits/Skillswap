const TOKEN_KEY = 'skillswap_token';
const USER_KEY = 'skillswap_user';

const api = {
  async request(path, options = {}) {
    const { timeoutMs, ...fetchOptions } = options;
    const headers = { ...(fetchOptions.headers || {}) };
    const token = getToken();
    if (!(fetchOptions.body instanceof FormData)) {
      headers['Content-Type'] = 'application/json';
    }
    if (token) headers.Authorization = `Bearer ${token}`;

    let res;
    let data;
    const controller = timeoutMs ? new AbortController() : null;
    const timeout = controller ? setTimeout(() => controller.abort(), timeoutMs) : null;
    try {
      res = await fetch(path, {
        ...fetchOptions,
        headers,
        signal: controller?.signal || fetchOptions.signal
      });
      data = await res.json().catch((error) => {
        if (error.name === 'AbortError') throw error;
        return { success: false, message: 'Unexpected server response' };
      });
    } catch (error) {
      if (error.name === 'AbortError') {
        throw new Error('SkillSwap is taking longer than expected. Please try again.');
      }
      throw new Error('Unable to reach SkillSwap. Check your connection.');
    } finally {
      if (timeout) clearTimeout(timeout);
    }

    if (res.status === 401 && !path.includes('/api/auth/login')) {
      clearAuth();
      if (!location.pathname.endsWith('login.html')) {
        location.href = '/login.html';
      }
      const error = new Error(data.message || 'Session expired. Please login again.');
      error.status = 401;
      throw error;
    }
    if (!res.ok || data.success === false) {
      const error = new Error(data.message || 'Something went wrong');
      error.status = res.status;
      throw error;
    }
    return data;
  },
  get(path, options = {}) {
    return this.request(path, options);
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
  return `<span class="brand-mark"><img src="/images/skillswap-mark.png" alt="" width="44" height="44"></span><span class="brand-name">SkillSwap</span>`;
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
        ['index.html#syllabus', 'Syllabus'],
        ['about.html', 'About']
      ]
    : [
        ['dashboard.html', 'Dashboard'],
        ['discover.html', 'Discover'],
        ['index.html#syllabus', 'Syllabus'],
        ['swaps.html', 'My Swaps'],
        ['requests.html', 'Requests'],
        ['messages.html', 'Messages']
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
    <div class="nav-actions"><button type="button" class="theme-toggle" id="themeToggle" aria-label="Switch to dark mode" title="Switch to dark mode"><span class="theme-icon" aria-hidden="true">☾</span></button>${actions}</div>
    <button class="hamburger" id="menuBtn" aria-label="Menu">☰</button>
    <div class="mobile-menu" id="mobileMenu">${links}<div class="mobile-actions"><button type="button" class="theme-toggle" id="themeToggleMobile" aria-label="Switch to dark mode"><span class="theme-icon" aria-hidden="true">☾</span> Appearance</button>${actions}</div></div>
  `;
}

function mountNav() {
  const nav = document.getElementById('appNav');
  if (!nav) return;
  nav.className = 'app-nav';
  nav.innerHTML = navHtml();
  const themeKey = 'skillswap_theme';
  const applyTheme = (theme) => {
    document.documentElement.dataset.theme = theme;
    localStorage.setItem(themeKey, theme);
    nav.querySelectorAll('.brand-mark img').forEach((img) => {
      img.src = theme === 'dark' ? '/images/skillswap-mark-dark.png' : '/images/skillswap-mark.png';
    });
    document.querySelectorAll('link[rel="icon"]').forEach((icon) => {
      icon.href = theme === 'dark' ? '/images/favicon-dark.png' : '/images/favicon.png';
    });
    nav.querySelectorAll('.theme-toggle').forEach((button) => {
      const dark = theme === 'dark';
      button.setAttribute('aria-label', `Switch to ${dark ? 'light' : 'dark'} mode`);
      button.title = `Switch to ${dark ? 'light' : 'dark'} mode`;
      const icon = button.querySelector('.theme-icon');
      if (icon) icon.textContent = dark ? '☀' : '☾';
    });
  };
  applyTheme(localStorage.getItem(themeKey) || (matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'));
  nav.querySelectorAll('.theme-toggle').forEach((button) => button.addEventListener('click', () => {
    applyTheme(document.documentElement.dataset.theme === 'dark' ? 'light' : 'dark');
  }));
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
            ${user.isErpVerified !== false ? `<span class="badge verify-badge" style="font-size:0.7rem;padding:2px 7px">🎓 ERP Verified</span>` : ''}
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

async function getWithRetry(path, retries = 1, timeoutMs = null) {
  let lastError;
  for (let attempt = 0; attempt <= retries; attempt += 1) {
    try {
      return await api.get(path, timeoutMs ? { timeoutMs } : {});
    } catch (error) {
      lastError = error;
      const retryable = !error.status || error.status === 408 || error.status === 429 || error.status >= 500;
      if (!retryable || attempt === retries) throw error;
      await new Promise((resolve) => setTimeout(resolve, 300 * (attempt + 1)));
    }
  }
  throw lastError;
}

document.addEventListener('DOMContentLoaded', () => {
  mountNav();
});
