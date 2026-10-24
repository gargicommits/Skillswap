const mongoose = require('mongoose');
const { EmbeddedSkill } = require('../utils/embeddedDb');

const skillSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, unique: true, trim: true },
    category: {
      type: String,
      required: true,
      enum: ['Semester 1', 'Semester 2']
    },
    description: { type: String, default: '' },
    icon: { type: String, default: '✨' }
  },
  { timestamps: true }
);

const MongooseSkill = mongoose.models.Skill || mongoose.model('Skill', skillSchema);

const Skill = new Proxy(MongooseSkill, {
  get(target, prop) {
    const { state, EmbeddedSkill } = require('../utils/embeddedDb');
    if (state.isUsingEmbedded && EmbeddedSkill[prop] !== undefined) {
      return EmbeddedSkill[prop];
    }
    return target[prop];
  }
});

module.exports = Skill;
