const express = require('express');
const router = express.Router();
const expenseController = require('../controllers/expenseController');
const authMiddleware = require('../middleware/auth');

router.use(authMiddleware);

// Endpoint matches exact user request specification
router.get('/expenses', expenseController.getExpenses);
router.post('/expense', expenseController.addExpense);

// Analytical endpoints MUST precede parametric route :id
router.get('/expense/total', expenseController.getTotalExpense);
router.get('/expense/monthly', expenseController.getMonthlyExpenses);
router.get('/expense/category', expenseController.getCategoryExpenses);

// Parametric CRUD routes
router.put('/expense/:id', expenseController.updateExpense);
router.delete('/expense/:id', expenseController.deleteExpense);

module.exports = router;
