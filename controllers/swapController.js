const { body, validationResult } = require('express-validator');
const SwapRequest = require('../models/SwapRequest');
const User = require('../models/User');
const Transaction = require('../models/Transaction');
const Message = require('../models/Message');

const createValidators = [
  body('receiver').notEmpty().withMessage('Please choose someone to swap with'),
  body('skillOffered').notEmpty().withMessage('Please select a skill you can offer'),
  body('skillWanted').notEmpty().withMessage('Please select a skill you want to learn'),
  body('message').optional().isLength({ max: 1000 })
];

function populateSwap(query) {
  return query
    .populate('sender', '-password')
    .populate('receiver', '-password')
    .populate('skillOffered')
    .populate('skillWanted');
}

async function createSwap(req, res, next) {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ success: false, message: errors.array()[0].msg });
    }

    const { receiver, skillOffered, skillWanted, message = '' } = req.body;
    if (String(receiver) === String(req.user._id)) {
      return res.status(400).json({ success: false, message: 'You cannot send a request to yourself' });
    }

    const other = await User.findById(receiver);
    if (!other) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    const duplicate = await SwapRequest.findOne({
      sender: req.user._id,
      receiver,
      status: { $in: ['pending', 'accepted'] }
    });
    if (duplicate) {
      return res.status(400).json({
        success: false,
        message: 'You already have an open request with this person'
      });
    }

    const swap = await SwapRequest.create({
      sender: req.user._id,
      receiver,
      skillOffered,
      skillWanted,
      message,
      status: 'pending'
    });

    const populated = await populateSwap(SwapRequest.findById(swap._id));
    res.status(201).json({ success: true, message: 'Swap request sent', swap: populated });
  } catch (error) {
    next(error);
  }
}

async function received(req, res, next) {
  try {
    const swaps = await populateSwap(
      SwapRequest.find({ receiver: req.user._id }).sort({ createdAt: -1 })
    );
    res.json({ success: true, swaps });
  } catch (error) {
    next(error);
  }
}

async function sent(req, res, next) {
  try {
    const swaps = await populateSwap(
      SwapRequest.find({ sender: req.user._id }).sort({ createdAt: -1 })
    );
    res.json({ success: true, swaps });
  } catch (error) {
    next(error);
  }
}

async function active(req, res, next) {
  try {
    const swaps = await populateSwap(
      SwapRequest.find({
        status: { $in: ['accepted', 'completed'] },
        $or: [{ sender: req.user._id }, { receiver: req.user._id }]
      }).sort({ updatedAt: -1 })
    );
    res.json({ success: true, swaps });
  } catch (error) {
    next(error);
  }
}

async function accept(req, res, next) {
  try {
    const swap = await SwapRequest.findById(req.params.id);
    if (!swap) return res.status(404).json({ success: false, message: 'Request not found' });
    if (String(swap.receiver) !== String(req.user._id)) {
      return res.status(403).json({ success: false, message: 'Only the recipient can accept this request' });
    }
    if (swap.status !== 'pending') {
      return res.status(400).json({ success: false, message: 'This request is no longer pending' });
    }
    swap.status = 'accepted';
    await swap.save();
    const populated = await populateSwap(SwapRequest.findById(swap._id));
    res.json({ success: true, message: 'Request accepted', swap: populated });
  } catch (error) {
    next(error);
  }
}

async function reject(req, res, next) {
  try {
    const swap = await SwapRequest.findById(req.params.id);
    if (!swap) return res.status(404).json({ success: false, message: 'Request not found' });
    if (String(swap.receiver) !== String(req.user._id)) {
      return res.status(403).json({ success: false, message: 'Only the recipient can reject this request' });
    }
    if (swap.status !== 'pending') {
      return res.status(400).json({ success: false, message: 'This request is no longer pending' });
    }
    swap.status = 'rejected';
    await swap.save();
    const populated = await populateSwap(SwapRequest.findById(swap._id));
    res.json({ success: true, message: 'Request rejected', swap: populated });
  } catch (error) {
    next(error);
  }
}

async function complete(req, res, next) {
  try {
    const swap = await SwapRequest.findById(req.params.id);
    if (!swap) return res.status(404).json({ success: false, message: 'Swap not found' });

    const isParty =
      String(swap.sender) === String(req.user._id) || String(swap.receiver) === String(req.user._id);
    if (!isParty) {
      return res.status(403).json({ success: false, message: 'You are not part of this swap' });
    }
    if (swap.status !== 'accepted') {
      return res.status(400).json({ success: false, message: 'Only accepted swaps can be completed' });
    }

    const sender = await User.findById(swap.sender);
    const receiver = await User.findById(swap.receiver);
    if (sender.credits < 10 || receiver.credits < 10) {
      return res.status(400).json({
        success: false,
        message: 'Both people need at least 10 credits to complete a learning session'
      });
    }

    sender.credits -= 10;
    sender.credits += 10;
    sender.credits += 5;
    sender.completedSwaps += 1;
    sender.rating = Math.min(5, Number((sender.rating + 0.05).toFixed(2)));

    receiver.credits -= 10;
    receiver.credits += 10;
    receiver.credits += 5;
    receiver.completedSwaps += 1;
    receiver.rating = Math.min(5, Number((receiver.rating + 0.05).toFixed(2)));

    await sender.save();
    await receiver.save();

    await Transaction.insertMany([
      {
        user: sender._id,
        amount: -10,
        type: 'learning_cost',
        description: 'Learning session',
        relatedUser: receiver._id
      },
      {
        user: sender._id,
        amount: 10,
        type: 'teaching_reward',
        description: 'Teaching session',
        relatedUser: receiver._id
      },
      {
        user: sender._id,
        amount: 5,
        type: 'swap_reward',
        description: 'Successful swap completion',
        relatedUser: receiver._id
      },
      {
        user: receiver._id,
        amount: -10,
        type: 'learning_cost',
        description: 'Learning session',
        relatedUser: sender._id
      },
      {
        user: receiver._id,
        amount: 10,
        type: 'teaching_reward',
        description: 'Teaching session',
        relatedUser: sender._id
      },
      {
        user: receiver._id,
        amount: 5,
        type: 'swap_reward',
        description: 'Successful swap completion',
        relatedUser: sender._id
      }
    ]);

    swap.status = 'completed';
    swap.completedAt = new Date();
    await swap.save();

    const populated = await populateSwap(SwapRequest.findById(swap._id));
    res.json({ success: true, message: 'Swap marked complete', swap: populated });
  } catch (error) {
    next(error);
  }
}

async function canMessage(req, res, next) {
  try {
    const otherId = req.params.userId;
    const swap = await SwapRequest.findOne({
      status: { $in: ['accepted', 'completed'] },
      $or: [
        { sender: req.user._id, receiver: otherId },
        { sender: otherId, receiver: req.user._id }
      ]
    });
    res.json({ success: true, allowed: Boolean(swap) });
  } catch (error) {
    next(error);
  }
}

module.exports = {
  createValidators,
  createSwap,
  received,
  sent,
  active,
  accept,
  reject,
  complete,
  canMessage
};
