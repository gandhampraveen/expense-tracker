const Category = require('../models/Category');

exports.getCategories = async (req, res) => {
  try {
    const userId = req.user.id;
    const categories = await Category.find({ userId }).sort({ isDefault: -1, name: 1 });
    res.json(categories);
  } catch (err) {
    res.status(500).json({ message: 'Server error fetching categories', error: err.message });
  }
};

exports.addCategory = async (req, res) => {
  try {
    const userId = req.user.id;
    const { name, icon, color } = req.body;

    if (!name) {
      return res.status(400).json({ message: 'Category name is required' });
    }

    const existing = await Category.findOne({ userId, name: { $regex: `^${name}$`, $options: 'i' } });
    if (existing) {
      return res.status(400).json({ message: 'Category already exists' });
    }

    const category = new Category({
      name,
      icon: icon || '🏷️',
      color: color || '#6366f1',
      userId,
      isDefault: false
    });

    await category.save();
    res.status(201).json({ message: 'Category added successfully', category });
  } catch (err) {
    res.status(500).json({ message: 'Server error adding category', error: err.message });
  }
};
