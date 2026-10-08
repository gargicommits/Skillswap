const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const dataDir = path.join(__dirname, '..', 'data');
const dbFile = path.join(dataDir, 'db.json');

if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

let db = {
  users: [],
  skills: [],
  swaps: [],
  messages: [],
  transactions: []
};

function loadDb() {
  try {
    if (fs.existsSync(dbFile)) {
      const raw = fs.readFileSync(dbFile, 'utf8');
      db = JSON.parse(raw);
    }
  } catch (err) {
    console.error('Failed to read db.json:', err.message);
  }
}

function saveDb() {
  try {
    fs.writeFileSync(dbFile, JSON.stringify(db, null, 2), 'utf8');
  } catch (err) {
    console.error('Failed to write db.json:', err.message);
  }
}

loadDb();

function newId() {
  return crypto.randomBytes(12).toString('hex');
}

function matchField(docVal, filterVal) {
  if (filterVal === undefined) return true;
  if (filterVal instanceof RegExp) {
    return filterVal.test(String(docVal || ''));
  }
  if (filterVal && typeof filterVal === 'object') {
    if (filterVal.$ne !== undefined) {
      return String(docVal) !== String(filterVal.$ne);
    }
    if (filterVal.$in !== undefined) {
      const arr = Array.isArray(docVal) ? docVal.map(String) : [String(docVal)];
      const target = filterVal.$in.map(String);
      return arr.some((v) => target.includes(v));
    }
    if (filterVal.$gte !== undefined) {
      return Number(docVal) >= Number(filterVal.$gte);
    }
    if (filterVal.$lte !== undefined) {
      return Number(docVal) <= Number(filterVal.$lte);
    }
  }
  if (Array.isArray(docVal)) {
    return docVal.map(String).includes(String(filterVal));
  }
  return String(docVal) === String(filterVal);
}

function matchDoc(doc, query = {}) {
  for (const [key, val] of Object.entries(query)) {
    if (key === '$or') {
      if (!val.some((sub) => matchDoc(doc, sub))) return false;
      continue;
    }
    if (key === '$and') {
      if (!val.every((sub) => matchDoc(doc, sub))) return false;
      continue;
    }
    if (!matchField(doc[key], val)) {
      return false;
    }
  }
  return true;
}

function cloneDoc(doc) {
  return JSON.parse(JSON.stringify(doc));
}

class DocInstance {
  constructor(data, collectionName) {
    Object.assign(this, cloneDoc(data));
    this._collectionName = collectionName;
  }

  toObject() {
    const copy = { ...this };
    delete copy._collectionName;
    return copy;
  }

  async save() {
    const list = db[this._collectionName];
    const idx = list.findIndex((d) => String(d._id) === String(this._id));
    const data = this.toObject();
    data.updatedAt = new Date();
    if (idx >= 0) {
      list[idx] = data;
    } else {
      list.push(data);
    }
    saveDb();
    return this;
  }
}

class Query {
  constructor(collectionName, filter = {}, single = false) {
    this.collectionName = collectionName;
    this.filter = filter;
    this.single = single;
    this._populates = [];
    this._sort = null;
    this._selectFields = null;
    this._limit = null;
  }

  populate(field, select) {
    this._populates.push({ field, select });
    return this;
  }

  sort(criteria) {
    this._sort = criteria;
    return this;
  }

  select(fields) {
    this._selectFields = fields;
    return this;
  }

  limit(n) {
    this._limit = n;
    return this;
  }

  slice(start, end) {
    return this;
  }

  _execute() {
    loadDb();
    const list = db[this.collectionName] || [];
    let matching = list.filter((doc) => matchDoc(doc, this.filter));

    if (this._sort) {
      const keys = Object.keys(this._sort);
      matching.sort((a, b) => {
        for (const k of keys) {
          const dir = this._sort[k];
          const va = a[k] !== undefined ? a[k] : '';
          const vb = b[k] !== undefined ? b[k] : '';
          if (va < vb) return -1 * dir;
          if (va > vb) return 1 * dir;
        }
        return 0;
      });
    }

    if (this._limit) {
      matching = matching.slice(0, this._limit);
    }

    const transform = (rawDoc) => {
      const doc = cloneDoc(rawDoc);

      for (const p of this._populates) {
        const f = p.field;
        let targetColl = '';
        if (['sender', 'receiver', 'user', 'relatedUser'].includes(f)) targetColl = 'users';
        else if (['skillsToTeach', 'skillsToLearn', 'skillOffered', 'skillWanted'].includes(f)) targetColl = 'skills';

        if (targetColl && db[targetColl]) {
          if (Array.isArray(doc[f])) {
            doc[f] = doc[f].map((id) => {
              const found = db[targetColl].find((t) => String(t._id) === String(id._id || id));
              return found ? cloneDoc(found) : id;
            });
          } else if (doc[f]) {
            const found = db[targetColl].find((t) => String(t._id) === String(doc[f]._id || doc[f]));
            if (found) doc[f] = cloneDoc(found);
          }
        }
      }

      const instance = new DocInstance(doc, this.collectionName);
      if (this._selectFields && typeof this._selectFields === 'string') {
        if (this._selectFields.startsWith('-')) {
          const hide = this._selectFields.slice(1);
          delete instance[hide];
        }
      }
      return instance;
    };

    if (this.single) {
      const first = matching[0];
      return first ? transform(first) : null;
    }

    return matching.map(transform);
  }

  then(resolve, reject) {
    try {
      resolve(this._execute());
    } catch (err) {
      if (reject) reject(err);
      else throw err;
    }
  }
}

function createModel(collectionName, defaultFields = {}) {
  return {
    schema: { paths: {} },
    async create(doc) {
      loadDb();
      const list = db[collectionName];
      const item = {
        _id: newId(),
        createdAt: new Date(),
        updatedAt: new Date(),
        ...defaultFields,
        ...cloneDoc(doc)
      };
      list.push(item);
      saveDb();
      return new DocInstance(item, collectionName);
    },

    async insertMany(docs) {
      loadDb();
      const list = db[collectionName];
      const created = [];
      for (const d of docs) {
        const item = {
          _id: newId(),
          createdAt: new Date(),
          updatedAt: new Date(),
          ...defaultFields,
          ...cloneDoc(d)
        };
        list.push(item);
        created.push(new DocInstance(item, collectionName));
      }
      saveDb();
      return created;
    },

    find(filter = {}) {
      return new Query(collectionName, filter, false);
    },

    findOne(filter = {}) {
      return new Query(collectionName, filter, true);
    },

    findById(id) {
      return new Query(collectionName, { _id: String(id) }, true);
    },

    async findByIdAndDelete(id) {
      loadDb();
      const list = db[collectionName];
      const idx = list.findIndex((d) => String(d._id) === String(id));
      if (idx === -1) return null;
      const [removed] = list.splice(idx, 1);
      saveDb();
      return new DocInstance(removed, collectionName);
    },

    async countDocuments(filter = {}) {
      loadDb();
      const list = db[collectionName] || [];
      return list.filter((doc) => matchDoc(doc, filter)).length;
    },

    async deleteMany(filter = {}) {
      loadDb();
      if (!Object.keys(filter).length) {
        db[collectionName] = [];
      } else {
        db[collectionName] = db[collectionName].filter((doc) => !matchDoc(doc, filter));
      }
      saveDb();
      return { acknowledged: true };
    },

    async updateMany(filter = {}, update = {}) {
      loadDb();
      const list = db[collectionName] || [];
      let count = 0;
      for (const doc of list) {
        if (matchDoc(doc, filter)) {
          if (update.$set) {
            Object.assign(doc, cloneDoc(update.$set));
          }
          doc.updatedAt = new Date();
          count++;
        }
      }
      saveDb();
      return { modifiedCount: count };
    }
  };
}

const EmbeddedUser = createModel('users', {
  credits: 100,
  rating: 4.8,
  completedSwaps: 0,
  skillsToTeach: [],
  skillsToLearn: [],
  bio: '',
  location: '',
  profileImage: '',
  erpId: '',
  isErpVerified: true
});

const EmbeddedSkill = createModel('skills', {
  icon: '✨',
  description: ''
});

const EmbeddedSwapRequest = createModel('swaps', {
  status: 'pending',
  message: ''
});

const EmbeddedMessage = createModel('messages', {
  read: false
});

const EmbeddedTransaction = createModel('transactions', {});

const state = {
  isUsingEmbedded: false
};

module.exports = {
  state,
  setUsingEmbedded(val) {
    state.isUsingEmbedded = val;
  },
  EmbeddedUser,
  EmbeddedSkill,
  EmbeddedSwapRequest,
  EmbeddedMessage,
  EmbeddedTransaction,
  db
};
