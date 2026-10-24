document.addEventListener('DOMContentLoaded', () => {
  if (!requireAuth()) return;

  const balance = document.querySelector('#balance h2');
  const balanceCopy = document.querySelector('#balance .balance-copy');
  const box = document.getElementById('tx');

  // app.js mounts the shared navigation on this event; don't replace it a
  // second time while the wallet is starting up.
  loadWallet({ balance, balanceCopy, box });
});

async function loadWallet({ balance, balanceCopy, box }) {
  const cachedUser = getUser();
  if (cachedUser && balance) {
    balance.textContent = `💎 ${Number(cachedUser.credits) || 0} Skill Credits`;
  }

  try {
    const data = await getWithRetry('/api/wallet', 1, 6000);
    const user = data.user || { ...cachedUser, credits: data.credits };
    if (user && data.credits != null) user.credits = data.credits;
    if (user) localStorage.setItem(USER_KEY, JSON.stringify(user));
    if (balance) balance.textContent = `💎 ${Number(data.credits ?? user?.credits) || 0} Skill Credits`;

    let transactions = data.transactions;
    let transactionsUnavailable = Boolean(data.transactionsUnavailable);
    // Keep compatibility with a server process that has not yet reloaded the
    // combined wallet response while still treating balance as the priority.
    if (!Array.isArray(transactions) && !transactionsUnavailable) {
      try {
        transactions = (await getWithRetry('/api/transactions', 1, 6000)).transactions || [];
      } catch (_) {
        transactionsUnavailable = true;
      }
    }
    transactions = transactions || [];
    if (!transactions.length) {
      box.innerHTML = emptyState('No transactions yet.', 'Complete a swap to see credits move.');
    } else {
      box.replaceChildren(...transactions.map(createTransactionRow));
    }
    if (transactionsUnavailable) {
      box.innerHTML = emptyState('Activity is temporarily unavailable', 'Your balance is up to date. Try again later to view your credit history.');
    }
  } catch (error) {
    if (balanceCopy) {
      const message = document.createElement('p');
      message.className = 'wallet-load-error';
      message.textContent = cachedUser
        ? 'Showing your last saved balance. We could not refresh it just now.'
        : 'Your balance could not be refreshed. Please try again shortly.';
      balanceCopy.append(message);
    }
    box.innerHTML = emptyState('Wallet activity could not load', 'Your wallet is still available. Please refresh in a moment.');
  }
}

function createTransactionRow(transaction) {
  const row = document.createElement('div');
  row.className = 'tx';
  const details = document.createElement('div');
  const description = document.createElement('strong');
  description.textContent = transaction.description || 'Credit activity';
  const date = document.createElement('div');
  date.style.cssText = 'color:var(--muted);font-size:.85rem';
  const parsedDate = new Date(transaction.createdAt);
  date.textContent = Number.isNaN(parsedDate.getTime()) ? '' : parsedDate.toLocaleString();
  details.append(description, date);

  const amount = Number(transaction.amount) || 0;
  const value = document.createElement('div');
  value.className = amount >= 0 ? 'pos' : 'neg';
  value.textContent = `${amount >= 0 ? '+' : ''}${amount}`;
  row.append(details, value);
  return row;
}
