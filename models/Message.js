const mongoose = require('mongoose');
const { EmbeddedMessage } = require('../utils/embeddedDb');

const messageSchema = new mongoose.Schema({
  sender: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  receiver: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  text: { type: String, required: true, maxlength: 2000, trim: true },
  read: { type: Boolean, default: false },
  timestamp: { type: Date, default: Date.now }
});

messageSchema.index({ sender: 1, receiver: 1, timestamp: 1 });

const MongooseMessage = mongoose.models.Message || mongoose.model('Message', messageSchema);

const Message = new Proxy(MongooseMessage, {
  get(target, prop) {
    const { state, EmbeddedMessage } = require('../utils/embeddedDb');
    if (state.isUsingEmbedded && EmbeddedMessage[prop] !== undefined) {
      return EmbeddedMessage[prop];
    }
    return target[prop];
  }
});

module.exports = Message;
