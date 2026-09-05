const User = require('../models/User');
const Category = require('../models/Category');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

const DEFAULT_CATEGORIES = [
  { name: 'Food & Dining', icon: '🍔', color: '#f59e0b' },
  { name: 'Transportation', icon: '🚗', color: '#3b82f6' },
  { name: 'Housing & Rent', icon: '🏠', color: '#10b981' },
  { name: 'Entertainment', icon: '🎮', color: '#8b5cf6' },
  { name: 'Utilities & Bills', icon: '💡', color: '#ef4444' },
  { name: 'Healthcare', icon: '🏥', color: '#ec4899' },
  { name: 'Shopping', icon: '🛍️', color: '#06b6d4' },
  { name: 'Travel', icon: '✈️', color: '#f97316' },
  { name: 'Subscriptions', icon: '📱', color: '#6366f1' },
  { name: 'Miscellaneous', icon: '📦', color: '#64748b' }
];

const seedDefaultCategories = async (userId) => {
  try {
    const existing = await Category.find({ userId });
    if (existing.length === 0) {
      const categoriesToInsert = DEFAULT_CATEGORIES.map(cat => ({
        ...cat,
        userId,
        isDefault: true
      }));
      await Category.insertMany(categoriesToInsert);
    }
  } catch (err) {
    console.error('Error seeding categories:', err);
  }
};

// @route POST /register
exports.registerUser = async (req, res) => {
  try {
    const { name, email, password, currency, monthlyBudget } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({ message: 'Please provide name, email, and password' });
    }

    const existingUser = await User.findOne({ email: email.toLowerCase() });
    if (existingUser) {
      return res.status(400).json({ message: 'User with this email already exists' });
    }

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    const user = new User({
      name,
      email: email.toLowerCase(),
      password: hashedPassword,
      currency: currency || '$',
      monthlyBudget: monthlyBudget ? Number(monthlyBudget) : 2500
    });

    await user.save();

    // Seed default categories
    await seedDefaultCategories(user._id);

    const secret = process.env.JWT_SECRET || 'expense_tracker_secret_key_2026';
    const token = jwt.sign({ id: user._id, email: user.email }, secret, { expiresIn: '7d' });

    res.status(201).json({
      message: 'User registered successfully',
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        currency: user.currency,
        monthlyBudget: user.monthlyBudget,
        avatar: user.avatar
      }
    });
  } catch (err) {
    console.error('Register error:', err);
    res.status(500).json({ message: 'Server error during registration', error: err.message });
  }
};

// @route POST /login
exports.loginUser = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ message: 'Please enter both email and password' });
    }

    const user = await User.findOne({ email: email.toLowerCase() });
    if (!user) {
      return res.status(400).json({ message: 'Invalid credentials' });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(400).json({ message: 'Invalid credentials' });
    }

    // Ensure categories exist
    await seedDefaultCategories(user._id);

    const secret = process.env.JWT_SECRET || 'expense_tracker_secret_key_2026';
    const token = jwt.sign({ id: user._id, email: user.email }, secret, { expiresIn: '7d' });

    res.json({
      message: 'Login successful',
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        currency: user.currency,
        monthlyBudget: user.monthlyBudget,
        avatar: user.avatar
      }
    });
  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({ message: 'Server error during login', error: err.message });
  }
};

// @route GET /profile
exports.getProfile = async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select('-password');
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    res.json(user);
  } catch (err) {
    res.status(500).json({ message: 'Server error fetching profile', error: err.message });
  }
};

// @route PUT /profile
exports.updateProfile = async (req, res) => {
  try {
    const { name, currency, monthlyBudget, password, avatar } = req.body;
    const user = await User.findById(req.user.id);

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    if (name) user.name = name;
    if (currency) user.currency = currency;
    if (monthlyBudget !== undefined) user.monthlyBudget = Number(monthlyBudget);
    if (avatar !== undefined) user.avatar = avatar;

    if (password && password.trim().length > 0) {
      const salt = await bcrypt.genSalt(10);
      user.password = await bcrypt.hash(password, salt);
    }

    await user.save();

    res.json({
      message: 'Profile updated successfully',
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        currency: user.currency,
        monthlyBudget: user.monthlyBudget,
        avatar: user.avatar
      }
    });
  } catch (err) {
    res.status(500).json({ message: 'Server error updating profile', error: err.message });
  }
};
