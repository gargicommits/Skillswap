document.addEventListener('DOMContentLoaded', async () => {
  if (!requireAuth()) return;
  const me = await refreshMe();
  const convosEl = document.getElementById('convos');
  const log = document.getElementById('chatLog');
  const head = document.getElementById('chatHead');
  const params = new URLSearchParams(location.search);
  let currentId = params.get('with');
  let poll;

  async function loadConvos() {
    try {
      const { conversations } = await api.get('/api/messages');
      window.__convos = conversations || [];
      if (!conversations.length) {
        convosEl.innerHTML = emptyState('No conversations yet.', 'Accept a swap to unlock messaging.');
        return conversations;
      }
      convosEl.innerHTML = conversations
        .map((c) => {
          const preview = c.lastMessage?.text || 'Say hello';
          return `<button class="convo ${c.user._id === currentId ? 'active' : ''}" data-id="${c.user._id}">
            <img class="avatar" src="${avatarSrc(c.user)}" alt="">
            <div style="text-align:left">
              <strong>${c.user.name}</strong>
              <div style="color:var(--muted);font-size:.85rem">${preview.slice(0, 42)}</div>
            </div>
            ${c.unread ? `<span class="match-pill">${c.unread}</span>` : ''}
          </button>`;
        })
        .join('');
      convosEl.querySelectorAll('.convo').forEach((btn) => {
        btn.addEventListener('click', () => {
          currentId = btn.dataset.id;
          history.replaceState({}, '', `/messages.html?with=${currentId}`);
          loadThread();
          loadConvos();
        });
      });
      return conversations;
    } catch (err) {
      convosEl.innerHTML = emptyState('Unable to load conversations', err.message);
      return [];
    }
  }

  async function loadThread() {
    if (!currentId) return;
    log.innerHTML = '<div class="loading">Loading messages...</div>';
    try {
      const { messages } = await api.get(`/api/messages/${currentId}`);
      let other = messages[0]
        ? String(messages[0].sender._id) === String(me._id)
          ? messages[0].receiver
          : messages[0].sender
        : null;

      if (!other) {
        const found = (window.__convos || []).find((c) => String(c.user._id) === String(currentId));
        if (found) {
          other = found.user;
        } else {
          try {
            const uRes = await api.get(`/api/users/${currentId}`);
            other = uRes.user;
          } catch (_) {}
        }
      }

      head.textContent = other ? other.name : 'Conversation';
      if (!messages.length) {
        log.innerHTML = '<div class="empty" style="padding:24px"><p>No messages yet.</p><small style="color:var(--muted)">Say hello and start planning your skill swap session!</small></div>';
        return;
      }
      log.innerHTML = messages
        .map((m) => {
          const mine = String(m.sender._id) === String(me._id);
          return `<div class="bubble ${mine ? 'mine' : ''}">${m.text}<div style="font-size:.72rem;opacity:.75">${new Date(
            m.timestamp
          ).toLocaleTimeString()}</div></div>`;
        })
        .join('');
      log.scrollTop = log.scrollHeight;
    } catch (err) {
      log.innerHTML = emptyState('Unable to open chat', err.message);
    }
  }

  document.getElementById('chatForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    if (!currentId) return;
    const input = document.getElementById('chatText');
    const text = input.value.trim();
    if (!text) return;
    const btn = document.getElementById('sendBtn');
    btn.disabled = true;
    try {
      await api.post('/api/messages', { receiver: currentId, text });
      input.value = '';
      await loadThread();
      await loadConvos();
    } catch (err) {
      head.textContent = err.message;
    } finally {
      btn.disabled = false;
    }
  });

  const convos = await loadConvos();
  if (!currentId && convos[0]) currentId = convos[0].user._id;
  if (currentId) await loadThread();

  poll = setInterval(() => {
    if (currentId) loadThread();
    loadConvos();
  }, 4000);
  window.addEventListener('beforeunload', () => clearInterval(poll));
});
