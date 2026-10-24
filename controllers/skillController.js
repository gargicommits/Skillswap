const { body, validationResult } = require('express-validator');
const Skill = require('../models/Skill');

const createValidators = [
  body('name').trim().notEmpty().withMessage('Skill name is required'),
  body('category')
    .isIn(['Semester 1', 'Semester 2'])
    .withMessage('Please choose a valid category'),
  body('description').optional().trim(),
  body('icon').optional().trim()
];

async function listSkills(req, res, next) {
  try {
    const { category } = req.query;
    const filter = category ? { category } : {};
    const skills = await Skill.find(filter).sort({ category: 1, name: 1 });
    res.json({ success: true, skills });
  } catch (error) {
    next(error);
  }
}

async function createSkill(req, res, next) {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ success: false, message: errors.array()[0].msg });
    }
    const { name, category, description = '', icon = '✨' } = req.body;
    const exists = await Skill.findOne({ name: new RegExp(`^${name}$`, 'i') });
    if (exists) {
      return res.status(409).json({ success: false, message: 'That skill already exists' });
    }
    const skill = await Skill.create({ name, category, description, icon });
    res.status(201).json({ success: true, skill });
  } catch (error) {
    next(error);
  }
}

async function deleteSkill(req, res, next) {
  try {
    const skill = await Skill.findByIdAndDelete(req.params.id);
    if (!skill) {
      return res.status(404).json({ success: false, message: 'Skill not found' });
    }
    res.json({ success: true, message: 'Skill deleted' });
  } catch (error) {
    next(error);
  }
}

module.exports = { listSkills, createSkill, deleteSkill, createValidators };
