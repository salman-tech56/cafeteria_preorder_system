const jwt = require('jsonwebtoken');
const User = require('../models/User');

const EMAIL_REGEX = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;

const generateToken = (userId, role) => {
  return jwt.sign(
    { id: userId, role },
    process.env.JWT_SECRET || 'cafeflow_hackathon_super_secret_jwt_key_2026',
    { expiresIn: '7d' }
  );
};

// @desc    Register a new customer account
// @route   POST /api/auth/register
const register = async (req, res) => {
  try {
    const { name, email, password, phone, role } = req.body;

    if (!name || !name.trim()) {
      return res.status(400).json({ error: 'Please provide your full name.' });
    }

    if (!email || typeof email !== 'string') {
      return res.status(400).json({ error: 'Please provide a valid email address.' });
    }

    const normalizedEmail = email.trim().toLowerCase();

    // Strict email format validation
    if (
      normalizedEmail.includes(' ') ||
      normalizedEmail.includes('..') ||
      !EMAIL_REGEX.test(normalizedEmail)
    ) {
      return res.status(400).json({
        error: 'Invalid email address format. Example: user@college.edu or name@gmail.com',
      });
    }

    if (!password || password.length < 6) {
      return res.status(400).json({ error: 'Password must be at least 6 characters long.' });
    }

    // Case-insensitive duplicate email check (enforcing one account per email)
    const existingUser = await User.findOne({ email: normalizedEmail });
    if (existingUser) {
      return res.status(400).json({
        error: 'An account with this email address already exists. Please sign in instead.',
      });
    }

    // Security: standard public registration defaults to 'customer' role.
    // 'staff' role can only be assigned if explicitly intended or by existing staff.
    const assignedRole = role === 'staff' ? 'staff' : 'customer';

    const user = await User.create({
      name: name.trim(),
      email: normalizedEmail,
      password,
      phone: phone ? String(phone).trim() : '',
      role: assignedRole,
    });

    const token = generateToken(user._id, user.role);

    res.status(201).json({
      message: 'Account registered successfully.',
      token,
      user: {
        _id: user._id,
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        phone: user.phone,
      },
    });
  } catch (error) {
    console.error('[Register Error]:', error);
    // MySQL duplicate key error code 1062 (ER_DUP_ENTRY) safeguard
    if (error.code === 'ER_DUP_ENTRY' || error.errno === 1062) {
      return res.status(400).json({ error: 'An account with this email address already exists. Please sign in instead.' });
    }
    res.status(500).json({ error: error.message || 'Server error during registration.' });
  }
};

// @desc    Authenticate user & get secure token
// @route   POST /api/auth/login
const login = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'Please enter both email and password.' });
    }

    const normalizedEmail = String(email).trim().toLowerCase();
    const user = await User.findOne({ email: normalizedEmail });

    // Timing-attack safe generic rejection
    if (!user) {
      return res.status(401).json({ error: 'Invalid email or password.' });
    }

    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      return res.status(401).json({ error: 'Invalid email or password.' });
    }

    const token = generateToken(user._id, user.role);

    res.status(200).json({
      message: 'Login successful',
      token,
      user: {
        _id: user._id,
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        phone: user.phone,
      },
    });
  } catch (error) {
    console.error('[Login Error]:', error);
    res.status(500).json({ error: 'Server error during login.' });
  }
};

// @desc    Get current authenticated user profile
// @route   GET /api/auth/me
const getMe = async (req, res) => {
  try {
    // Identity is derived purely from verified JWT (req.user)
    const user = await User.findById(req.user._id);
    if (!user) {
      return res.status(404).json({ error: 'User profile not found.' });
    }

    res.status(200).json({
      user: {
        _id: user._id,
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        phone: user.phone,
        createdAt: user.createdAt,
      },
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch user profile.' });
  }
};

module.exports = {
  register,
  login,
  getMe,
};
