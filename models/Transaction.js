const mongoose = require('mongoose');
const { EmbeddedTransaction } = require('../utils/embeddedDb');

const transactionSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    amount: { type: Number, required: true },
    type: {
      type: String,
      required: true,
      enum: ['welcome_bonus', 'teaching_reward', 'learning_cost', 'swap_reward']
    },
    description: { type: String, required: true },
    relatedUser: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null }
  },
  { timestamps: true }
);

const MongooseTransaction = mongoose.models.Transaction || mongoose.model('Transaction', transactionSchema);

const Transaction = new Proxy(MongooseTransaction, {
  get(target, prop) {
    const { state, EmbeddedTransaction } = require('../utils/embeddedDb');
    if (state.isUsingEmbedded && EmbeddedTransaction[prop] !== undefined) {
      return EmbeddedTransaction[prop];
    }
    return target[prop];
  }
});

module.exports = Transaction;
