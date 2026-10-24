async function withDashboardRetry(request, attempts = 2) {
  let lastError;
  for (let attempt = 0; attempt <= attempts; attempt += 1) {
    try {
      return await request();
    } catch (error) {
      lastError = error;
      if (attempt < attempts) await new Promise((resolve) => setTimeout(resolve, 350 * (attempt + 1)));
    }
  }
  throw lastError;
}

function dashboardError(title, error, section) {
  const message = error?.message || 'Please check your connection and try again.';
  return `<div class="card dashboard-error"><strong>${title}</strong><p>${message}</p><button class="btn btn-secondary btn-sm" type="button" data-dashboard-retry="${section}">Try again</button></div>`;
}

function renderStats(stats) {
  document.getElementById('stats').innerHTML = `
    <article class="card stat"><span>Skills teaching</span><b>${stats.teaching ?? 0}</b></article>
    <article class="card stat"><span>Skills learning</span><b>${stats.learning ?? 0}</b></article>
    <article class="card stat"><span>Active swaps</span><b>${stats.activeSwaps ?? 0}</b></article>
    <article class="card stat"><span>Completed swaps</span><b>${stats.completedSwaps ?? 0}</b></article>
  `;
}

async function loadDashboardStats() {
  const container = document.getElementById('stats');
  container.innerHTML = '<div class="loading">Refreshing your activity…</div>';
  try {
    const { stats } = await withDashboardRetry(() => api.get('/api/users/stats'));
    renderStats(stats);
  } catch (error) {
    container.innerHTML = dashboardError('Activity is taking a little longer to load.', error, 'stats');
  }
}

async function loadDashboardMatches() {
  const box = document.getElementById('matches');
  box.innerHTML = '<div class="loading">Finding your learning matches…</div>';
  try {
    const { users } = await withDashboardRetry(() => api.get('/api/users/matches'));
    box.innerHTML = users.length
      ? users.map((user) => userCard(user)).join('')
      : emptyState('No skill matches found.', 'Add skills you can teach and want to learn on your profile.');
  } catch (error) {
    box.innerHTML = dashboardError('Your matches could not load just yet.', error, 'matches');
  }
}

document.addEventListener('DOMContentLoaded', async () => {
  if (!requireAuth()) return;
  const cachedUser = getUser();
  const welcome = document.getElementById('welcome');
  const balance = document.querySelector('#creditHero h2');
  const showUser = (user) => {
    if (user?.name) welcome.textContent = `Welcome back, ${user.name.trim().split(/\s+/)[0]}!`;
    if (user?.credits != null) balance.textContent = `💎 ${user.credits} Skill Credits`;
  };
  showUser(cachedUser);

  const profileRequest = withDashboardRetry(() => refreshMe()).then((user) => {
    if (!user) throw new Error('Please sign in again to view your dashboard.');
    showUser(user);
    return user;
  }).catch(() => cachedUser);

  await Promise.all([profileRequest, loadDashboardStats(), loadDashboardMatches()]);

  document.addEventListener('click', (event) => {
    const button = event.target.closest('[data-dashboard-retry]');
    if (!button) return;
    if (button.dataset.dashboardRetry === 'stats') loadDashboardStats();
    if (button.dataset.dashboardRetry === 'matches') loadDashboardMatches();
  });
});
