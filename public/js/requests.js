document.addEventListener('DOMContentLoaded', async () => {
  if (!requireAuth()) return;
  const list = document.getElementById('list');
  const alertBox = document.getElementById('alert');
  let tab = 'received';

  document.querySelectorAll('.tab').forEach((btn) => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.tab').forEach((t) => t.classList.remove('active'));
      btn.classList.add('active');
      tab = btn.dataset.tab;
      load();
    });
  });

  function card(swap, incoming) {
    const person = incoming ? swap.sender : swap.receiver;
    const date = new Date(swap.createdAt).toLocaleDateString();
    return `
      <article class="card">
        <div class="user-top">
          <img class="avatar" src="${avatarSrc(person)}" alt="">
          <div>
            <strong>${person.name}</strong>
            <div style="color:var(--muted)">@${person.username} · ${date}</div>
          </div>
          <span class="match-pill">${swap.status}</span>
        </div>
        <p>Offers <strong>${swap.skillOffered?.name}</strong> · wants <strong>${swap.skillWanted?.name}</strong></p>
        <p>${swap.message || 'No message'}</p>
        ${
          incoming && swap.status === 'pending'
            ? `<div class="card-actions">
                <button class="btn btn-success btn-sm" data-act="accept" data-id="${swap._id}">Accept</button>
                <button class="btn btn-danger btn-sm" data-act="reject" data-id="${swap._id}">Reject</button>
              </div>`
            : ''
        }
      </article>
    `;
  }

  async function load() {
    list.innerHTML = '<div class="loading">Loading requests...</div>';
    try {
      const { swaps } = await api.get(`/api/swaps/${tab}`);
      if (!swaps.length) {
        list.innerHTML = emptyState(
          tab === 'received' ? "You don't have any incoming requests." : 'You have not sent any requests yet.',
          'Discover someone whose skills complement yours.'
        );
        return;
      }
      list.innerHTML = `<div class="grid-auto">${swaps.map((s) => card(s, tab === 'received')).join('')}</div>`;
      list.querySelectorAll('[data-act]').forEach((btn) => {
        btn.addEventListener('click', async () => {
          btn.disabled = true;
          try {
            await api.put(`/api/swaps/${btn.dataset.id}/${btn.dataset.act}`);
            showAlert(alertBox, `Request ${btn.dataset.act}ed`, 'ok');
            load();
          } catch (err) {
            showAlert(alertBox, err.message);
            btn.disabled = false;
          }
        });
      });
    } catch (err) {
      list.innerHTML = emptyState('Unable to load requests', err.message);
    }
  }

  load();
});
