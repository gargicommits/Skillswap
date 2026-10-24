document.addEventListener('DOMContentLoaded', async () => {
  if (!requireAuth()) return;
  const convosEl = document.getElementById('convos');
  const log = document.getElementById('chatLog');
  const head = document.getElementById('chatHead');
  // The signed-in user's id is already cached at login; don't block opening the
  // inbox on a separate profile refresh request.
  const me = getUser();
  if (!me) {
    convosEl.innerHTML = emptyState('Messages could not load', 'Please refresh the page in a moment.');
    head.textContent = 'Messages unavailable';
    return;
  }
  const params = new URLSearchParams(location.search);
  let currentId = params.get('with');
  let poll;
  let pollBusy = false;
  let conversationVersion = 0;
  let threadVersion = 0;

  async function loadConvos() {
    const requestVersion = ++conversationVersion;
    try {
      const data = await getWithRetry('/api/messages');
      const conversations = (data.conversations || []).filter((conversation) => conversation?.user?._id);
      if (requestVersion !== conversationVersion) return window.__convos || [];
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
            <strong>${escapeMessageHtml(c.user.name)}</strong>
              <div style="color:var(--muted);font-size:.85rem">${escapeMessageHtml(preview.slice(0, 42))}</div>
            </div>
            ${c.unread ? `<span class="match-pill">${c.unread}</span>` : ''}
          </button>`;
        })
        .join('');
      convosEl.querySelectorAll('.convo').forEach((btn) => {
        btn.addEventListener('click', () => {
          currentId = btn.dataset.id;
          history.replaceState({}, '', `/messages.html?with=${encodeURIComponent(currentId)}`);
          loadThread();
          loadConvos();
        });
      });
      return conversations;
    } catch (err) {
      if (requestVersion !== conversationVersion) return window.__convos || [];
      convosEl.innerHTML = emptyState('Unable to load conversations', err.message);
      return [];
    }
  }

  async function loadThread() {
    if (!currentId) return;
    const requestedId = currentId;
    const requestVersion = ++threadVersion;
    log.innerHTML = '<div class="loading">Loading messages...</div>';
    try {
      const data = await getWithRetry(`/api/messages/${encodeURIComponent(requestedId)}`);
      if (requestVersion !== threadVersion || requestedId !== currentId) return;
      const messages = data.messages || [];
      let other = messages[0]
        ? String(messages[0].sender?._id || messages[0].sender) === String(me._id)
          ? messages[0].receiver
          : messages[0].sender
        : null;

      if (!other) {
        const found = (window.__convos || []).find((c) => String(c.user._id) === String(currentId));
        if (found) {
          other = found.user;
        } else {
          try {
            const uRes = await getWithRetry(`/api/users/${encodeURIComponent(requestedId)}`);
            other = uRes.user;
          } catch (_) {}
        }
      }
      if (requestVersion !== threadVersion || requestedId !== currentId) return;

      head.textContent = other ? other.name : 'Conversation';
      if (!messages.length) {
        log.innerHTML = '<div class="empty" style="padding:24px"><p>No messages yet.</p><small style="color:var(--muted)">Say hello and start planning your skill swap session!</small></div>';
        return;
      }
      log.innerHTML = messages
        .map((m) => {
          const mine = String(m.sender?._id || m.sender) === String(me._id);
          return `<div class="bubble ${mine ? 'mine' : ''}">${escapeMessageHtml(m.text)}<div style="font-size:.72rem;opacity:.75">${new Date(
            m.timestamp
          ).toLocaleTimeString()}</div></div>`;
        })
        .join('');
      log.scrollTop = log.scrollHeight;
    } catch (err) {
      if (requestVersion !== threadVersion || requestedId !== currentId) return;
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
    if (document.hidden || pollBusy) return;
    pollBusy = true;
    Promise.resolve()
      .then(loadConvos)
      .then(() => (currentId ? loadThread() : null))
      .finally(() => { pollBusy = false; });
  }, 5000);
  window.addEventListener('beforeunload', () => clearInterval(poll));
});

function escapeMessageHtml(value) {
  return String(value ?? '').replace(/[&<>"']/g, (character) => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;'
  })[character]);
}
