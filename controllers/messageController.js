const { body, validationResult } = require('express-validator');
const Message = require('../models/Message');
const SwapRequest = require('../models/SwapRequest');
const User = require('../models/User');

const sendValidators = [
  body('receiver').notEmpty().withMessage('Receiver is required'),
  body('text').trim().notEmpty().withMessage('Message cannot be empty').isLength({ max: 2000 })
];

async function canChat(userA, userB) {
  return SwapRequest.findOne({
    status: { $in: ['accepted', 'completed'] },
    $or: [
      { sender: userA, receiver: userB },
      { sender: userB, receiver: userA }
    ]
  });
}

async function sendMessage(req, res, next) {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ success: false, message: errors.array()[0].msg });
    }

    const { receiver, text } = req.body;
    if (String(receiver) === String(req.user._id)) {
      return res.status(400).json({ success: false, message: 'You cannot message yourself' });
    }

    const allowed = await canChat(req.user._id, receiver);
    if (!allowed) {
      return res.status(403).json({
        success: false,
        message: 'You can message after a swap request is accepted'
      });
    }

    const message = await Message.create({
      sender: req.user._id,
      receiver,
      text,
      timestamp: new Date()
    });

    const populated = await Message.findById(message._id)
      .populate('sender', 'name username profileImage')
      .populate('receiver', 'name username profileImage');

    res.status(201).json({ success: true, message: populated });
  } catch (error) {
    next(error);
  }
}

async function thread(req, res, next) {
  try {
    const otherId = req.params.userId;
    const allowed = await canChat(req.user._id, otherId);
    if (!allowed) {
      return res.status(403).json({
        success: false,
        message: 'You can message after a swap request is accepted'
      });
    }

    const messages = await Message.find({
      $or: [
        { sender: req.user._id, receiver: otherId },
        { sender: otherId, receiver: req.user._id }
      ]
    })
      .sort({ timestamp: 1 })
      .populate('sender', 'name username profileImage')
      .populate('receiver', 'name username profileImage');

    await Message.updateMany(
      { sender: otherId, receiver: req.user._id, read: false },
      { $set: { read: true } }
    );

    res.json({ success: true, messages });
  } catch (error) {
    next(error);
  }
}

async function conversations(req, res, next) {
  try {
    const swaps = await SwapRequest.find({
      status: { $in: ['accepted', 'completed'] },
      $or: [{ sender: req.user._id }, { receiver: req.user._id }]
    })
      .populate('sender', 'name username profileImage')
      .populate('receiver', 'name username profileImage');

    const people = [];
    const seen = new Set();
    for (const swap of swaps) {
      const other = String(swap.sender._id) === String(req.user._id) ? swap.receiver : swap.sender;
      const key = String(other._id);
      if (seen.has(key)) continue;
      seen.add(key);
      people.push(other);
    }

    const threads = await Promise.all(
      people.map(async (person) => {
        const last = await Message.findOne({
          $or: [
            { sender: req.user._id, receiver: person._id },
            { sender: person._id, receiver: req.user._id }
          ]
        }).sort({ timestamp: -1 });

        const unread = await Message.countDocuments({
          sender: person._id,
          receiver: req.user._id,
          read: false
        });

        return { user: person, lastMessage: last, unread };
      })
    );

    threads.sort((a, b) => {
      const ta = a.lastMessage ? new Date(a.lastMessage.timestamp).getTime() : 0;
      const tb = b.lastMessage ? new Date(b.lastMessage.timestamp).getTime() : 0;
      return tb - ta;
    });

    res.json({ success: true, conversations: threads });
  } catch (error) {
    next(error);
  }
}

module.exports = { sendMessage, thread, conversations, sendValidators, User };
