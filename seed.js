require('dotenv').config();
const bcrypt = require('bcryptjs');
const mongoose = require('mongoose');
const User = require('./models/User');
const Skill = require('./models/Skill');
const SwapRequest = require('./models/SwapRequest');
const Message = require('./models/Message');
const Transaction = require('./models/Transaction');
const { avatarUrl } = require('./utils/helpers');

const skillsData = [
  { name: 'JavaScript', category: 'Technology', description: 'Build interactive web apps with modern JS.', icon: '🟨' },
  { name: 'Python', category: 'Technology', description: 'Data, automation, and backend development.', icon: '🐍' },
  { name: 'Java', category: 'Technology', description: 'Object-oriented programming and enterprise apps.', icon: '☕' },
  { name: 'React', category: 'Technology', description: 'Component-driven user interfaces.', icon: '⚛️' },
  { name: 'Node.js', category: 'Technology', description: 'Server-side JavaScript and APIs.', icon: '🟢' },
  { name: 'Web Development', category: 'Technology', description: 'HTML, CSS, and full-stack websites.', icon: '💻' },
  { name: 'Graphic Design', category: 'Design', description: 'Visual identity, layouts, and branding.', icon: '🎨' },
  { name: 'UI/UX', category: 'Design', description: 'Product design, wireframes, and research.', icon: '🧩' },
  { name: 'Photoshop', category: 'Design', description: 'Photo editing and digital compositing.', icon: '🖼️' },
  { name: 'Video Editing', category: 'Design', description: 'Storytelling with Premiere, CapCut, or DaVinci.', icon: '🎬' },
  { name: 'Marketing', category: 'Business', description: 'Campaigns, growth, and brand strategy.', icon: '📣' },
  { name: 'Entrepreneurship', category: 'Business', description: 'Starting and scaling a business.', icon: '🚀' },
  { name: 'Excel', category: 'Business', description: 'Spreadsheets, formulas, and dashboards.', icon: '📊' },
  { name: 'Public Speaking', category: 'Business', description: 'Presentations, confidence, and storytelling.', icon: '🎤' },
  { name: 'Photography', category: 'Creative', description: 'Portraits, lighting, and composition.', icon: '📷' },
  { name: 'Music', category: 'Creative', description: 'Instruments, production, or music theory.', icon: '🎵' },
  { name: 'Drawing', category: 'Creative', description: 'Sketching, illustration, and visual art.', icon: '✏️' },
  { name: 'Writing', category: 'Creative', description: 'Copywriting, storytelling, and editing.', icon: '✍️' },
  { name: 'Digital Marketing', category: 'Business', description: 'SEO, ads, and content marketing.', icon: '📈' }
];

const demoPassword = 'Password123';

const usersData = [
  {
    name: 'Anchal Singh',
    username: 'anchal',
    email: 'anchal@skillswap.dev',
    erpId: 'ERP202601',
    bio: 'Full-stack developer passionate about web architectures and peer teaching.',
    location: 'Pune',
    teach: ['Web Development', 'JavaScript', 'React', 'Node.js'],
    learn: ['UI/UX', 'Public Speaking'],
    rating: 4.9
  },
  {
    name: 'Gargi Bothara',
    username: 'gargi',
    email: 'gargi@skillswap.dev',
    erpId: 'ERP202602',
    bio: 'UI/UX and product designer crafting intuitive digital experiences.',
    location: 'Mumbai',
    teach: ['UI/UX', 'Graphic Design', 'Photoshop'],
    learn: ['React', 'Web Development'],
    rating: 4.9
  },
  {
    name: 'Shreya Ashtekar',
    username: 'shreya',
    email: 'shreya@skillswap.dev',
    erpId: 'ERP202603',
    bio: 'Data enthusiast and Python developer focused on clean scripts and analytics.',
    location: 'Bengaluru',
    teach: ['Python', 'Excel', 'Java'],
    learn: ['JavaScript', 'React'],
    rating: 4.8
  },
  {
    name: 'Shravani Deshmukh',
    username: 'shravani',
    email: 'shravani@skillswap.dev',
    erpId: 'ERP202604',
    bio: 'Digital marketer and creative strategist specializing in growth and public speaking.',
    location: 'Delhi',
    teach: ['Public Speaking', 'Digital Marketing', 'Marketing'],
    learn: ['Python', 'Video Editing'],
    rating: 4.7
  }
];

async function seedData() {
  await Promise.all([
    User.deleteMany({}),
    Skill.deleteMany({}),
    SwapRequest.deleteMany({}),
    Message.deleteMany({}),
    Transaction.deleteMany({})
  ]);

  const skills = await Skill.insertMany(skillsData);
  const byName = Object.fromEntries(skills.map((s) => [s.name, s._id]));
  const password = await bcrypt.hash(demoPassword, 10);

  const users = [];
  for (const u of usersData) {
    const user = await User.create({
      name: u.name,
      username: u.username,
      email: u.email,
      password,
      erpId: u.erpId,
      isErpVerified: true,
      bio: u.bio,
      location: u.location,
      profileImage: avatarUrl(u.name),
      skillsToTeach: u.teach.map((n) => byName[n]),
      skillsToLearn: u.learn.map((n) => byName[n]),
      credits: 100,
      rating: u.rating,
      completedSwaps: Math.floor(Math.random() * 4) + 1
    });
    await Transaction.create({
      user: user._id,
      amount: 100,
      type: 'welcome_bonus',
      description: 'Welcome bonus (ERP Verified Account)'
    });
    users.push(user);
  }

  const [anchal, gargi, shreya, shravani] = users;

  const accepted = await SwapRequest.create({
    sender: anchal._id,
    receiver: gargi._id,
    skillOffered: byName['Web Development'],
    skillWanted: byName['UI/UX'],
    message: 'Happy to swap React/web fundamentals for a UX design portfolio review.',
    status: 'accepted'
  });

  await SwapRequest.create({
    sender: shreya._id,
    receiver: anchal._id,
    skillOffered: byName.Python,
    skillWanted: byName.JavaScript,
    message: 'I can walk you through Python data structures if you help me with JavaScript.',
    status: 'pending'
  });

  await SwapRequest.create({
    sender: shravani._id,
    receiver: gargi._id,
    skillOffered: byName['Digital Marketing'],
    skillWanted: byName['Graphic Design'],
    message: 'Would love a branding session in exchange for growth marketing strategy.',
    status: 'pending'
  });

  await Message.create({
    sender: anchal._id,
    receiver: gargi._id,
    text: 'Hey Gargi! Excited to swap web development and UI/UX skills this week.',
    timestamp: new Date(Date.now() - 1000 * 60 * 60)
  });
  await Message.create({
    sender: gargi._id,
    receiver: anchal._id,
    text: 'Hey Anchal! Sounds great — let us review the user interface and components on Thursday.',
    timestamp: new Date(Date.now() - 1000 * 60 * 40)
  });

  console.log('Seed complete. Demo ERP logins (password: Password123):');
  users.forEach((u) => console.log(`  ${u.name} | ${u.email} | ERP ID: ${u.erpId}`));
  console.log(`Accepted swap created: ${accepted._id}`);
  return { users, skills, accepted };
}

async function runSeedCli() {
  const uri = process.env.MONGODB_URI;
  if (!uri) {
    console.error('MongoDB connection failed: MONGODB_URI is not set.');
    process.exit(1);
  }

  try {
    await mongoose.connect(uri);
  } catch (error) {
    console.error('MongoDB connection failed:', error.message);
    process.exit(1);
  }

  await seedData();
  await mongoose.disconnect();
  process.exit(0);
}

if (require.main === module) {
  runSeedCli().catch((err) => {
    console.error(err);
    process.exit(1);
  });
}

module.exports = { seedData, skillsData, usersData };
