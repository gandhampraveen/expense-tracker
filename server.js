const express = require('express');
const cors = require('cors');
const path = require('path');
require('dotenv').config();

const connectDB = require('./config/db');
const authRoutes = require('./routes/authRoutes');
const expenseRoutes = require('./routes/expenseRoutes');
const categoryRoutes = require('./routes/categoryRoutes');

const app = express();

// Connect Database
connectDB();

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve static frontend files
app.use(express.static(path.join(__dirname, 'public')));

// Mount routes (supporting both root '/' and '/api/' prefixes)
app.use('/', authRoutes);
app.use('/', expenseRoutes);
app.use('/', categoryRoutes);

app.use('/api', authRoutes);
app.use('/api', expenseRoutes);
app.use('/api', categoryRoutes);

// Health Check Endpoint for Render / Railway / Cloud Monitoring
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'ok', timestamp: new Date().toISOString(), uptime: process.uptime() });
});
app.get('/api/health', (req, res) => {
  res.status(200).json({ status: 'ok', timestamp: new Date().toISOString(), uptime: process.uptime() });
});

// SPA Fallback: Send index.html for non-API routes
app.get('*', (req, res, next) => {
  if (req.path.startsWith('/register') || req.path.startsWith('/login') || req.path.startsWith('/expense') || req.path.startsWith('/profile') || req.path.startsWith('/categories') || req.path.startsWith('/api') || req.path.startsWith('/health')) {
    return next();
  }
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Global Error Handler
app.use((err, req, res, next) => {
  console.error('Unhandled Server Error:', err.stack);
  res.status(500).json({ message: 'Internal Server Error', error: err.message });
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, '0.0.0.0', () => {
  console.log(`====================================================`);
  console.log(`🚀 Expense Tracker System Server active on port ${PORT}`);
  console.log(`🌐 Local Web Dashboard: http://localhost:${PORT}`);
  console.log(`====================================================`);
});
