const mongoose = require('mongoose');
const { EmbeddedUser } = require('../utils/embeddedDb');

const userSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    username: { type: String, required: true, unique: true, trim: true, lowercase: true },
    email: { type: String, required: true, unique: true, trim: true, lowercase: true },
    password: { type: String, required: true, select: false },
    profileImage: { type: String, default: '' },
    bio: { type: String, default: '', maxlength: 500 },
    location: { type: String, default: '', trim: true },
    skillsToTeach: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Skill' }],
    skillsToLearn: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Skill' }],
    credits: { type: Number, default: 100, min: 0 },
    rating: { type: Number, default: 5, min: 0, max: 5 },
    completedSwaps: { type: Number, default: 0, min: 0 },
    erpId: { type: String, default: '', trim: true },
    isErpVerified: { type: Boolean, default: true }
  },
  { timestamps: true }
);

userSchema.index({ name: 'text', username: 'text', bio: 'text', location: 'text' });

const MongooseUser = mongoose.models.User || mongoose.model('User', userSchema);

const User = new Proxy(MongooseUser, {
  get(target, prop) {
    const { state, EmbeddedUser } = require('../utils/embeddedDb');
    if (state.isUsingEmbedded && EmbeddedUser[prop] !== undefined) {
      return EmbeddedUser[prop];
    }
    return target[prop];
  }
});

module.exports = User;
