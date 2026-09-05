const express = require('express');
const router = express.Router();
const categoryController = require('../controllers/categoryController');
const authMiddleware = require('../middleware/auth');

router.use(authMiddleware);

router.get('/categories', categoryController.getCategories);
router.post('/categories', categoryController.addCategory);

module.exports = router;
