document.addEventListener('DOMContentLoaded', async () => {
  if (!requireAuth()) return;
  try {
    const me = await refreshMe();
    mountNav();
    document.getElementById('welcome').textContent = `Welcome back, ${me.name.split(' ')[0]}!`;
    document.getElementById('creditHero').querySelector('h2').textContent = `💎 ${me.credits} Skill Credits`;

    const { stats } = await api.get('/api/users/stats');
    document.getElementById('stats').innerHTML = `
      <article class="card stat"><span>Skills teaching</span><b>${stats.teaching}</b></article>
      <article class="card stat"><span>Skills learning</span><b>${stats.learning}</b></article>
      <article class="card stat"><span>Active swaps</span><b>${stats.activeSwaps}</b></article>
      <article class="card stat"><span>Completed swaps</span><b>${stats.completedSwaps}</b></article>
    `;

    const { users } = await api.get('/api/users/matches');
    const box = document.getElementById('matches');
    if (!users.length) {
      box.innerHTML = emptyState('No skill matches found.', 'Add skills you can teach and want to learn on your profile.');
      return;
    }
    box.innerHTML = users.map((u) => userCard(u)).join('');
  } catch (err) {
    document.getElementById('matches').innerHTML = emptyState('Could not load dashboard', err.message);
  }
});
