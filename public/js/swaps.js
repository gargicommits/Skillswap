document.addEventListener('DOMContentLoaded', async () => {
  if (!requireAuth()) return;
  const me = await refreshMe();
  const list = document.getElementById('list');
  const alertBox = document.getElementById('alert');
  let currentFilter = 'all';

  document.querySelectorAll('.tab').forEach((tab) => {
    tab.addEventListener('click', () => {
      document.querySelectorAll('.tab').forEach((t) => t.classList.remove('active'));
      tab.classList.add('active');
      currentFilter = tab.dataset.filter;
      load();
    });
  });

  async function load() {
    list.innerHTML = '<div class="loading">Loading swaps...</div>';
    try {
      const { swaps } = await api.get('/api/swaps/active');
      const filtered = (swaps || []).filter((s) => {
        if (currentFilter === 'all') return true;
        return s.status === currentFilter;
      });

      if (!filtered.length) {
        list.innerHTML = emptyState(
          currentFilter === 'all'
            ? "You haven't started any swaps yet."
            : `No ${currentFilter === 'accepted' ? 'in-progress' : 'completed'} swaps found.`,
          'Accept a request or send one from Discover.'
        );
        return;
      }
      list.innerHTML = `<div class="grid-auto">${filtered
        .map((swap) => {
          const partner = String(swap.sender._id) === String(me._id) ? swap.receiver : swap.sender;
          const learning = String(swap.sender._id) === String(me._id) ? swap.skillWanted : swap.skillOffered;
          const teaching = String(swap.sender._id) === String(me._id) ? swap.skillOffered : swap.skillWanted;
          return `
            <article class="card">
              <div class="user-top">
                <img class="avatar" src="${avatarSrc(partner)}" alt="">
                <div>
                  <strong>${partner.name}</strong>
                  <div style="color:var(--muted)">Started ${new Date(swap.createdAt).toLocaleDateString()}</div>
                </div>
                <span class="match-pill" style="${swap.status === 'completed' ? 'background:#e0f2fe;color:#0369a1' : ''}">${swap.status}</span>
              </div>
              <p>Learning <strong>${learning?.name || 'Skill'}</strong></p>
              <p>Teaching <strong>${teaching?.name || 'Skill'}</strong></p>
              <div class="card-actions">
                <a class="btn btn-secondary btn-sm" href="/messages.html?with=${partner._id}">Message</a>
                ${
                  swap.status === 'accepted'
                    ? `<button class="btn btn-primary btn-sm" data-complete="${swap._id}">Mark as Completed</button>`
                    : ''
                }
              </div>
            </article>`;
        })
        .join('')}</div>`;

      list.querySelectorAll('[data-complete]').forEach((btn) => {
        btn.addEventListener('click', async () => {
          btn.disabled = true;
          btn.textContent = 'Completing...';
          try {
            await api.put(`/api/swaps/${btn.dataset.complete}/complete`);
            await refreshMe();
            mountNav();
            showAlert(alertBox, 'Swap completed. Credits updated.', 'ok');
            load();
          } catch (err) {
            showAlert(alertBox, err.message);
            btn.disabled = false;
            btn.textContent = 'Mark as Completed';
          }
        });
      });
    } catch (err) {
      list.innerHTML = emptyState('Unable to load swaps', err.message);
    }
  }

  load();
});
