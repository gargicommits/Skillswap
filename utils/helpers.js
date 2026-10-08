function idOf(value) {
  if (!value) return '';
  if (typeof value === 'string') return value;
  if (value._id) return String(value._id);
  return String(value);
}

function skillSet(user, field) {
  return new Set((user[field] || []).map(idOf));
}

function computeMatch(me, other) {
  const myLearn = skillSet(me, 'skillsToLearn');
  const myTeach = skillSet(me, 'skillsToTeach');
  const theirTeach = skillSet(other, 'skillsToTeach');
  const theirLearn = skillSet(other, 'skillsToLearn');

  const theyTeachMe = [...myLearn].filter((id) => theirTeach.has(id));
  const iTeachThem = [...myTeach].filter((id) => theirLearn.has(id));
  const denom = Math.max(myLearn.size + myTeach.size, 1);
  let percent = Math.round(((theyTeachMe.length + iTeachThem.length) / denom) * 100);

  if (theyTeachMe.length && iTeachThem.length) {
    percent = Math.min(100, percent + 15);
  }

  return {
    percent,
    theyTeachMe,
    iTeachThem
  };
}

function sanitizeUser(user) {
  if (!user) return null;
  const obj = typeof user.toObject === 'function' ? user.toObject() : { ...user };
  delete obj.password;
  return obj;
}

function escapeRegex(text) {
  return String(text || '').replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function avatarUrl(name) {
  const seed = encodeURIComponent(name || 'SkillSwap');
  return `https://api.dicebear.com/7.x/adventurer/svg?seed=${seed}`;
}

module.exports = {
  idOf,
  computeMatch,
  sanitizeUser,
  escapeRegex,
  avatarUrl
};
