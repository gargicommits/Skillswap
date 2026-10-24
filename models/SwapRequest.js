const mongoose = require('mongoose');
const { EmbeddedSwapRequest } = require('../utils/embeddedDb');

const swapRequestSchema = new mongoose.Schema(
  {
    sender: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    receiver: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    skillOffered: { type: mongoose.Schema.Types.ObjectId, ref: 'Skill', required: true },
    skillWanted: { type: mongoose.Schema.Types.ObjectId, ref: 'Skill', required: true },
    message: { type: String, default: '', maxlength: 1000 },
    status: {
      type: String,
      enum: ['pending', 'accepted', 'rejected', 'completed'],
      default: 'pending'
    },
    completedAt: { type: Date, default: null }
  },
  { timestamps: true }
);

swapRequestSchema.index({ sender: 1, receiver: 1, status: 1 });

const MongooseSwapRequest = mongoose.models.SwapRequest || mongoose.model('SwapRequest', swapRequestSchema);

const SwapRequest = new Proxy(MongooseSwapRequest, {
  get(target, prop) {
    const { state, EmbeddedSwapRequest } = require('../utils/embeddedDb');
    if (state.isUsingEmbedded && EmbeddedSwapRequest[prop] !== undefined) {
      return EmbeddedSwapRequest[prop];
    }
    return target[prop];
  }
});

module.exports = SwapRequest;
