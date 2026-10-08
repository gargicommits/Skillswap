document.addEventListener('DOMContentLoaded', async () => {
  const results = document.getElementById('results');
  const skillSelect = document.getElementById('skill');

  try {
    const { skills } = await api.get('/api/skills');
    skills.forEach((s) => {
      const opt = document.createElement('option');
      opt.value = s._id;
      opt.textContent = s.name;
      skillSelect.appendChild(opt);
    });
  } catch (_) {
    /* catalog optional */
  }

  async function load() {
    results.innerHTML = '<div class="loading">Loading people...</div>';
    const params = new URLSearchParams();
    const search = document.getElementById('search').value.trim();
    const category = document.getElementById('category').value;
    const skill = document.getElementById('skill').value;
    const rating = document.getElementById('rating').value;
    const location = document.getElementById('location').value.trim();
    if (search) params.set('search', search);
    if (category) params.set('category', category);
    if (skill) params.set('skill', skill);
    if (rating) params.set('rating', rating);
    if (location) params.set('location', location);
    try {
      const { users } = await api.get(`/api/users?${params.toString()}`);
      if (!users.length) {
        results.innerHTML = emptyState('No skill matches found.', 'Try another skill, city, or rating.');
        return;
      }
      results.innerHTML = users.map((u) => userCard(u, { showRequest: Boolean(getUser()) })).join('');
    } catch (err) {
      results.innerHTML = emptyState('Unable to load people', err.message);
    }
  }

  ['search', 'category', 'skill', 'rating', 'location'].forEach((id) => {
    document.getElementById(id).addEventListener('input', () => {
      clearTimeout(window.__discoverT);
      window.__discoverT = setTimeout(load, 250);
    });
    document.getElementById(id).addEventListener('change', load);
  });

  load();
});
