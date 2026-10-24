document.addEventListener('DOMContentLoaded', async () => {
  if (!requireAuth()) return;
  const retryRequest = async (request, retries = 2) => {
    let lastError;
    for (let attempt = 0; attempt <= retries; attempt += 1) {
      try {
        return await request();
      } catch (error) {
        lastError = error;
        if (attempt < retries) await new Promise((resolve) => setTimeout(resolve, 350 * (attempt + 1)));
      }
    }
    throw lastError;
  };
  const params = new URLSearchParams(location.search);
  const id = params.get('id');
  const root = document.getElementById('profileRoot');
  const alertBox = document.getElementById('alert');
  let me;
  try {
    me = await retryRequest(() => refreshMe());
  } catch (_) {
    me = null;
  }
  me = me || getUser();
  if (!me) {
    root.innerHTML = emptyState('Please sign in again', 'Your session could not be restored. Log in and open the profile again.');
    return;
  }
  const isSelf = !id || id === me._id;

  let profile;
  try {
    profile = isSelf ? me : (await retryRequest(() => api.get(`/api/users/${encodeURIComponent(id)}`))).user;
  } catch (err) {
    root.innerHTML = emptyState('Profile unavailable', err.message);
    return;
  }

  function render() {
    const own = isSelf;
    root.innerHTML = `
      <section class="card profile-hero">
        <img class="avatar lg" src="${avatarSrc(profile)}" alt="${profile.name}">
        <div style="flex:1">
          <div style="display:flex;align-items:center;gap:8px;flex-wrap:wrap">
            <h1 class="page-title" style="margin:0">${profile.name}</h1>
            ${profile.isErpVerified !== false ? `<span class="badge" style="background:#e0f2fe;color:#0369a1;font-size:0.8rem;padding:4px 10px">🎓 ERP Verified Student</span>` : ''}
          </div>
          <p style="margin-top:4px">@${profile.username}${profile.erpId ? ` · ERP ID: <strong>${profile.erpId}</strong>` : ''} · ${profile.location || 'Location not set'}</p>
          <p>${profile.bio || 'No bio yet.'}</p>
          <p class="stars">⭐ ${Number(profile.rating || 0).toFixed(1)} · ${profile.completedSwaps || 0} completed swaps · 💎 ${profile.credits ?? ''}</p>
          <div class="card-actions" style="margin-top:12px">
            ${
              own
                ? `<button class="btn btn-primary btn-sm" id="editToggle">Edit Profile</button>`
                : `<button class="btn btn-primary btn-sm" id="openSwap">Request Skill Swap</button>
                   <a class="btn btn-secondary btn-sm" href="/messages.html?with=${profile._id}">Message</a>`
            }
          </div>
        </div>
      </section>
      ${own ? `<form id="editForm" class="card" style="display:none;margin-top:16px">
        <div class="form-group"><label>Name</label><input name="name" value="${profile.name}" required></div>
        <div class="form-group"><label>Username</label><input name="username" value="${profile.username}" required></div>
        <div class="form-group"><label>Location</label><input name="location" value="${profile.location || ''}"></div>
        <div class="form-group"><label>Bio</label><textarea name="bio" rows="4">${profile.bio || ''}</textarea></div>
        <div class="form-group"><label>Profile picture</label><input type="file" id="photo" accept="image/*"></div>
        <button class="btn btn-primary" type="submit" id="saveBtn">Save changes</button>
      </form>` : ''}
      <div class="skill-row"><h3>Skills I teach</h3>
        ${own ? `<div><select id="addTeach"></select> <button class="btn btn-ghost btn-sm" id="addTeachBtn">Add skill</button></div>` : ''}
      </div>
      <div class="badges" id="teachBadges"></div>
      <div class="skill-row"><h3>Skills I want to learn</h3>
        ${own ? `<div><select id="addLearn"></select> <button class="btn btn-ghost btn-sm" id="addLearnBtn">Add skill</button></div>` : ''}
      </div>
      <div class="badges" id="learnBadges"></div>
    `;
    paintSkills();
    bind();
  }

  function paintSkills() {
    const teach = document.getElementById('teachBadges');
    const learn = document.getElementById('learnBadges');
    teach.innerHTML = (profile.skillsToTeach || [])
      .map(
        (s) =>
          `<span class="badge">${s.icon || ''} ${s.name}${
            isSelf ? `<button class="chip-btn" data-list="teach" data-id="${s._id}">×</button>` : ''
          }</span>`
      )
      .join('') || '<span class="badge">None yet</span>';
    learn.innerHTML = (profile.skillsToLearn || [])
      .map(
        (s) =>
          `<span class="badge learn">${s.icon || ''} ${s.name}${
            isSelf ? `<button class="chip-btn" data-list="learn" data-id="${s._id}">×</button>` : ''
          }</span>`
      )
      .join('') || '<span class="badge">None yet</span>';
  }

  async function loadCatalog() {
    const { skills } = await api.get('/api/skills');
    ['addTeach', 'addLearn'].forEach((id) => {
      const sel = document.getElementById(id);
      if (!sel) return;
      sel.innerHTML = '<option value="">Select a skill</option>' + skills.map((s) => `<option value="${s._id}">${s.category} · ${s.name}</option>`).join('');
    });
    return skills;
  }

  function bind() {
    document.getElementById('editToggle')?.addEventListener('click', () => {
      const form = document.getElementById('editForm');
      form.style.display = form.style.display === 'none' ? 'block' : 'none';
    });
    document.getElementById('editForm')?.addEventListener('submit', async (e) => {
      e.preventDefault();
      const btn = document.getElementById('saveBtn');
      btn.disabled = true;
      btn.textContent = 'Saving profile...';
      try {
        const form = e.target;
        const data = await api.put('/api/users/me', {
          name: form.name.value.trim(),
          username: form.username.value.trim(),
          location: form.location.value.trim(),
          bio: form.bio.value.trim()
        });
        const file = document.getElementById('photo').files[0];
        if (file) {
          const fd = new FormData();
          fd.append('profileImage', file);
          const photo = await api.post('/api/users/me/avatar', fd);
          profile = photo.user;
        } else {
          profile = data.user;
        }
        setAuth(getToken(), profile);
        mountNav();
        showAlert(alertBox, 'Profile saved', 'ok');
        render();
        await loadCatalog();
      } catch (err) {
        showAlert(alertBox, err.message);
      } finally {
        btn.disabled = false;
        btn.textContent = 'Save changes';
      }
    });

    document.getElementById('addTeachBtn')?.addEventListener('click', () => addSkill('teach', 'addTeach'));
    document.getElementById('addLearnBtn')?.addEventListener('click', () => addSkill('learn', 'addLearn'));
    root.querySelectorAll('.chip-btn').forEach((btn) => {
      btn.addEventListener('click', async () => {
        try {
          const data = await api.del(`/api/users/me/skills/${btn.dataset.id}?list=${btn.dataset.list}`);
          profile = data.user;
          setAuth(getToken(), profile);
          render();
          await loadCatalog();
        } catch (err) {
          showAlert(alertBox, err.message);
        }
      });
    });

    document.getElementById('openSwap')?.addEventListener('click', openSwap);
    if (location.hash === '#swap' && !isSelf) openSwap();
  }

  async function addSkill(list, selectId) {
    const skillId = document.getElementById(selectId).value;
    if (!skillId) {
      showAlert(alertBox, 'Please select a skill');
      return;
    }
    try {
      const data = await api.post('/api/users/me/skills', { skillId, list });
      profile = data.user;
      setAuth(getToken(), profile);
      render();
      await loadCatalog();
    } catch (err) {
      showAlert(alertBox, err.message);
    }
  }

  async function openSwap() {
    const modal = document.getElementById('swapModal');
    const offered = document.getElementById('skillOffered');
    const wanted = document.getElementById('skillWanted');
    offered.innerHTML = (me.skillsToTeach || []).map((s) => `<option value="${s._id}">${s.name}</option>`).join('');
    wanted.innerHTML = (profile.skillsToTeach || []).map((s) => `<option value="${s._id}">${s.name}</option>`).join('');
    if (!offered.options.length || !wanted.options.length) {
      showAlert(alertBox, 'Please select a skill on both profiles before requesting a swap');
      return;
    }
    modal.classList.add('show');
  }

  document.getElementById('swapCancel').addEventListener('click', () => {
    document.getElementById('swapModal').classList.remove('show');
  });
  document.getElementById('swapForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const btn = document.getElementById('swapSubmit');
    btn.disabled = true;
    btn.textContent = 'Sending request...';
    try {
      await api.post('/api/swaps', {
        receiver: profile._id,
        skillOffered: document.getElementById('skillOffered').value,
        skillWanted: document.getElementById('skillWanted').value,
        message: document.getElementById('swapMessage').value.trim()
      });
      document.getElementById('swapModal').classList.remove('show');
      showAlert(alertBox, 'Swap request sent', 'ok');
      location.href = '/requests.html';
    } catch (err) {
      showAlert(alertBox, err.message || 'Unable to send request');
      btn.disabled = false;
      btn.textContent = 'Send request';
    }
  });

  render();
  if (isSelf) {
    try {
      await loadCatalog();
    } catch (err) {
      showAlert(alertBox, `Profile loaded, but skills could not be refreshed: ${err.message}`);
    }
  }
});
