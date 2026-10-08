document.addEventListener('DOMContentLoaded', async () => {
  if (!requireAuth()) return;
  const me = await refreshMe();
  mountNav();
  document.querySelector('#balance h2').textContent = `💎 ${me.credits} Skill Credits`;
  const box = document.getElementById('tx');
  try {
    const { transactions } = await api.get('/api/transactions');
    if (!transactions.length) {
      box.innerHTML = emptyState('No transactions yet.', 'Complete a swap to see credits move.');
      return;
    }
    box.innerHTML = transactions
      .map((t) => {
        const cls = t.amount >= 0 ? 'pos' : 'neg';
        const sign = t.amount >= 0 ? '+' : '';
        return `<div class="tx"><div><strong>${t.description}</strong><div style="color:var(--muted);font-size:.85rem">${new Date(
          t.createdAt
        ).toLocaleString()}</div></div><div class="${cls}">${sign}${t.amount}</div></div>`;
      })
      .join('');
  } catch (err) {
    box.innerHTML = emptyState('Unable to load wallet', err.message);
  }
});
