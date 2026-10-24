const express = require('express');
const { protect } = require('../middleware/authMiddleware');
const { listSkills, createSkill, deleteSkill, createValidators } = require('../controllers/skillController');

const router = express.Router();

router.get('/', listSkills);
router.post('/', protect, createValidators, createSkill);
router.delete('/:id', protect, deleteSkill);

module.exports = router;
