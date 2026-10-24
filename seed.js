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
  // ── Semester 1 Subjects ──
  { name: 'Engineering Mathematics-I', category: 'Semester 1', description: 'Differential calculus, successive differentiation, Taylor & Maclaurin series, partial differentiation, complex numbers, and matrices.', icon: '📐' },
  { name: 'Engineering Physics', category: 'Semester 1', description: 'Interference, diffraction, polarization, laser, fiber optics, quantum mechanics, and semiconductor physics.', icon: '⚛️' },
  { name: 'Engineering Chemistry', category: 'Semester 1', description: 'Water chemistry, polymers, electrochemistry, corrosion, fuels & combustion, and spectroscopic techniques.', icon: '🧪' },
  { name: 'Basic Electrical Engineering', category: 'Semester 1', description: 'DC & AC circuits, network theorems, single-phase & three-phase systems, transformers, electrical machines, and electrical safety.', icon: '⚡' },
  { name: 'Basic Electronics Engineering', category: 'Semester 1', description: 'Semiconductor diodes, BJT & FET, operational amplifiers, digital electronics, logic gates, and number systems.', icon: '🔌' },
  { name: 'Engineering Graphics', category: 'Semester 1', description: 'Orthographic projections, projection of points, lines & planes, projection of solids, sections, and isometric views.', icon: '📏' },
  { name: 'Fundamentals of Programming Languages', category: 'Semester 1', description: 'C programming fundamentals — data types, operators, control structures, arrays, strings, functions, pointers, structures, and file handling.', icon: '💻' },
  { name: 'Professional Communication Skills', category: 'Semester 1', description: 'Technical writing, presentation skills, group discussion, listening skills, and professional correspondence.', icon: '🗣️' },

  // ── Semester 2 Subjects ──
  { name: 'Engineering Mathematics-II', category: 'Semester 2', description: 'Integral calculus, definite integrals, beta & gamma functions, differential equations, Laplace transforms, and Fourier series.', icon: '🔢' },
  { name: 'Engineering Mechanics', category: 'Semester 2', description: 'Coplanar force systems, equilibrium, friction, centroid & moment of inertia, kinematics, and kinetics of particles.', icon: '⚙️' },
  { name: 'Programming and Problem Solving', category: 'Semester 2', description: 'Advanced C/C++ programming — OOP concepts, dynamic memory allocation, data structures (linked lists, stacks, queues), searching & sorting algorithms.', icon: '🖥️' },
  { name: 'Manufacturing Practice Workshop', category: 'Semester 2', description: 'Fitting, carpentry, welding, sheet metal work, smithy, plumbing, and hands-on manufacturing processes.', icon: '🔧' },
  { name: 'Design Thinking & Idea Lab', category: 'Semester 2', description: 'Design thinking methodology — empathize, define, ideate, prototype, test — innovation, brainstorming, and project-based learning.', icon: '💡' },
  { name: 'Indian Knowledge System', category: 'Semester 2', description: 'Ancient Indian contributions to science, mathematics, astronomy, metallurgy, architecture, and holistic knowledge traditions.', icon: '📜' },
  { name: 'Co-Curricular Courses', category: 'Semester 2', description: 'NSS, sports, cultural activities, community service, and soft skill development for holistic student growth.', icon: '🎯' }
];

const demoPassword = 'Password123';

const usersData = [
  {
    name: 'Anchal Singh',
    username: 'anchal',
    email: 'anchal@skillswap.dev',
    erpId: 'ERP202601',
    bio: 'Strong in maths and programming, happy to help peers with Sem 1 & Sem 2 topics.',
    location: 'Pune',
    teach: ['Engineering Mathematics-I', 'Fundamentals of Programming Languages', 'Engineering Mathematics-II', 'Programming and Problem Solving'],
    learn: ['Engineering Physics', 'Engineering Graphics'],
    rating: 4.9
  },
  {
    name: 'Gargi Bothara',
    username: 'gargi',
    email: 'gargi@skillswap.dev',
    erpId: 'ERP202602',
    bio: 'Love design and creativity — can teach graphics and design thinking to anyone!',
    location: 'Mumbai',
    teach: ['Engineering Graphics', 'Design Thinking & Idea Lab', 'Professional Communication Skills'],
    learn: ['Engineering Mathematics-I', 'Basic Electrical Engineering'],
    rating: 4.9
  },
  {
    name: 'Shreya Ashtekar',
    username: 'shreya',
    email: 'shreya@skillswap.dev',
    erpId: 'ERP202603',
    bio: 'Physics and chemistry nerd — always excited to explain tricky concepts.',
    location: 'Bengaluru',
    teach: ['Engineering Physics', 'Engineering Chemistry', 'Engineering Mechanics'],
    learn: ['Fundamentals of Programming Languages', 'Programming and Problem Solving'],
    rating: 4.8
  },
  {
    name: 'Shravani Deshmukh',
    username: 'shravani',
    email: 'shravani@skillswap.dev',
    erpId: 'ERP202604',
    bio: 'Electrical and electronics geek who loves hands-on workshop practice.',
    location: 'Delhi',
    teach: ['Basic Electrical Engineering', 'Basic Electronics Engineering', 'Manufacturing Practice Workshop'],
    learn: ['Engineering Mathematics-II', 'Engineering Chemistry'],
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
    skillOffered: byName['Engineering Mathematics-I'],
    skillWanted: byName['Engineering Graphics'],
    message: 'Happy to walk you through calculus and matrices if you help me with projection drawings.',
    status: 'accepted'
  });

  await SwapRequest.create({
    sender: shreya._id,
    receiver: anchal._id,
    skillOffered: byName['Engineering Physics'],
    skillWanted: byName['Fundamentals of Programming Languages'],
    message: 'I can explain optics and quantum mechanics if you help me with C programming.',
    status: 'pending'
  });

  await SwapRequest.create({
    sender: shravani._id,
    receiver: gargi._id,
    skillOffered: byName['Basic Electrical Engineering'],
    skillWanted: byName['Design Thinking & Idea Lab'],
    message: 'Would love a design thinking session in exchange for circuit analysis help.',
    status: 'pending'
  });

  await Message.create({
    sender: anchal._id,
    receiver: gargi._id,
    text: 'Hey Gargi! Excited to swap Engineering Maths-I and Engineering Graphics this week.',
    timestamp: new Date(Date.now() - 1000 * 60 * 60)
  });
  await Message.create({
    sender: gargi._id,
    receiver: anchal._id,
    text: 'Hey Anchal! Sounds great — let us go over projections and isometric views on Thursday.',
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
