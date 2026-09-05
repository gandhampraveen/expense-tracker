const Expense = require('../models/Expense');
const mongoose = require('mongoose');

// @route GET /expenses
// Options: search, category, startDate, endDate, sortBy, order
exports.getExpenses = async (req, res) => {
  try {
    const userId = req.user.id;
    const { search, category, startDate, endDate, sortBy = 'date', order = 'desc' } = req.query;

    const query = { userId: new mongoose.Types.ObjectId(userId) };

    if (category && category !== 'All') {
      query.category = category;
    }

    if (search) {
      query.$or = [
        { title: { $regex: search, $options: 'i' } },
        { notes: { $regex: search, $options: 'i' } },
        { paymentMethod: { $regex: search, $options: 'i' } }
      ];
    }

    if (startDate || endDate) {
      query.date = {};
      if (startDate) query.date.$gte = new Date(startDate);
      if (endDate) {
        const end = new Date(endDate);
        end.setHours(23, 59, 59, 999);
        query.date.$lte = end;
      }
    }

    const sortOptions = {};
    sortOptions[sortBy] = order === 'asc' ? 1 : -1;

    const expenses = await Expense.find(query).sort(sortOptions);
    
    // Calculate sum of returned expenses
    const totalAmount = expenses.reduce((acc, curr) => acc + curr.amount, 0);

    res.json({
      count: expenses.length,
      totalAmount,
      expenses
    });
  } catch (err) {
    console.error('getExpenses error:', err);
    res.status(500).json({ message: 'Server error fetching expenses', error: err.message });
  }
};

// @route POST /expense
exports.addExpense = async (req, res) => {
  try {
    const userId = req.user.id;
    const { title, amount, category, date, paymentMethod, notes } = req.body;

    if (!title || amount === undefined || !category) {
      return res.status(400).json({ message: 'Please provide title, amount, and category' });
    }

    const expense = new Expense({
      userId,
      title,
      amount: Number(amount),
      category,
      date: date ? new Date(date) : new Date(),
      paymentMethod: paymentMethod || 'Credit Card',
      notes: notes || ''
    });

    await expense.save();
    res.status(201).json({ message: 'Expense added successfully', expense });
  } catch (err) {
    console.error('addExpense error:', err);
    res.status(500).json({ message: 'Server error adding expense', error: err.message });
  }
};

// @route PUT /expense/:id
exports.updateExpense = async (req, res) => {
  try {
    const userId = req.user.id;
    const expenseId = req.params.id;
    const { title, amount, category, date, paymentMethod, notes } = req.body;

    const expense = await Expense.findOne({ _id: expenseId, userId });
    if (!expense) {
      return res.status(404).json({ message: 'Expense not found or unauthorized' });
    }

    if (title !== undefined) expense.title = title;
    if (amount !== undefined) expense.amount = Number(amount);
    if (category !== undefined) expense.category = category;
    if (date !== undefined) expense.date = new Date(date);
    if (paymentMethod !== undefined) expense.paymentMethod = paymentMethod;
    if (notes !== undefined) expense.notes = notes;

    await expense.save();
    res.json({ message: 'Expense updated successfully', expense });
  } catch (err) {
    console.error('updateExpense error:', err);
    res.status(500).json({ message: 'Server error updating expense', error: err.message });
  }
};

// @route DELETE /expense/:id
exports.deleteExpense = async (req, res) => {
  try {
    const userId = req.user.id;
    const expenseId = req.params.id;

    const expense = await Expense.findOneAndDelete({ _id: expenseId, userId });
    if (!expense) {
      return res.status(404).json({ message: 'Expense not found or unauthorized' });
    }

    res.json({ message: 'Expense deleted successfully', id: expenseId });
  } catch (err) {
    console.error('deleteExpense error:', err);
    res.status(500).json({ message: 'Server error deleting expense', error: err.message });
  }
};

// @route GET /expense/total
exports.getTotalExpense = async (req, res) => {
  try {
    const userId = new mongoose.Types.ObjectId(req.user.id);
    const { startDate, endDate } = req.query;

    const matchQuery = { userId };

    if (startDate || endDate) {
      matchQuery.date = {};
      if (startDate) matchQuery.date.$gte = new Date(startDate);
      if (endDate) {
        const end = new Date(endDate);
        end.setHours(23, 59, 59, 999);
        matchQuery.date.$lte = end;
      }
    }

    const result = await Expense.aggregate([
      { $match: matchQuery },
      { $group: { _id: null, totalExpense: { $sum: '$amount' }, count: { $sum: 1 } } }
    ]);

    const totalExpense = result.length > 0 ? result[0].totalExpense : 0;
    const count = result.length > 0 ? result[0].count : 0;

    res.json({ totalExpense, count });
  } catch (err) {
    console.error('getTotalExpense error:', err);
    res.status(500).json({ message: 'Server error calculating total expense', error: err.message });
  }
};

// @route GET /expense/monthly
exports.getMonthlyExpenses = async (req, res) => {
  try {
    const userId = new mongoose.Types.ObjectId(req.user.id);

    const monthlyData = await Expense.aggregate([
      { $match: { userId } },
      {
        $group: {
          _id: {
            year: { $year: '$date' },
            month: { $month: '$date' }
          },
          total: { $sum: '$amount' },
          count: { $sum: 1 }
        }
      },
      { $sort: { '_id.year': -1, '_id.month': -1 } }
    ]);

    const monthNames = [
      'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
      'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'
    ];

    const formatted = monthlyData.map(item => ({
      year: item._id.year,
      month: item._id.month,
      monthName: `${monthNames[item._id.month - 1]} ${item._id.year}`,
      total: item.total,
      count: item.count
    }));

    res.json(formatted);
  } catch (err) {
    console.error('getMonthlyExpenses error:', err);
    res.status(500).json({ message: 'Server error fetching monthly summary', error: err.message });
  }
};

// @route GET /expense/category
exports.getCategoryExpenses = async (req, res) => {
  try {
    const userId = new mongoose.Types.ObjectId(req.user.id);

    const categoryData = await Expense.aggregate([
      { $match: { userId } },
      {
        $group: {
          _id: '$category',
          total: { $sum: '$amount' },
          count: { $sum: 1 }
        }
      },
      { $sort: { total: -1 } }
    ]);

    const totalOverall = categoryData.reduce((acc, c) => acc + c.total, 0);

    const formatted = categoryData.map(item => ({
      category: item._id,
      total: item.total,
      count: item.count,
      percentage: totalOverall > 0 ? Number(((item.total / totalOverall) * 100).toFixed(1)) : 0
    }));

    res.json({
      totalOverall,
      categories: formatted
    });
  } catch (err) {
    console.error('getCategoryExpenses error:', err);
    res.status(500).json({ message: 'Server error fetching category summary', error: err.message });
  }
};
