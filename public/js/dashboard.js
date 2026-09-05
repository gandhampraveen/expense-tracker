/* ==========================================================================
   VISUAL ANALYTICS & DASHBOARD METRICS MODULE (Chart.js Integration)
   ========================================================================== */

let categoryDoughnutChart = null;
let monthlyBarChart = null;

const formatCurrency = (amount, currencySymbol) => {
  const sym = currencySymbol || (currentUser ? currentUser.currency : '$') || '$';
  return `${sym}${Number(amount || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
};

const updateDashboardCards = async (expensesList = [], totalStats = null) => {
  if (!currentUser) return;
  const currency = currentUser.currency || '$';

  // 1. Calculate Total Expenses & Count
  let totalExpense = totalStats ? totalStats.totalExpense : 0;
  let totalCount = totalStats ? totalStats.count : expensesList.length;
  
  if (!totalStats) {
    totalExpense = expensesList.reduce((sum, item) => sum + item.amount, 0);
  }

  document.getElementById('stat-total-expense').textContent = formatCurrency(totalExpense, currency);
  document.getElementById('stat-total-count').textContent = `${totalCount} transaction${totalCount === 1 ? '' : 's'} logged`;

  // 2. Compute Current Month Spending
  const now = new Date();
  const currentMonth = now.getMonth();
  const currentYear = now.getFullYear();

  const currentMonthExpenses = expensesList.filter(item => {
    const d = new Date(item.date);
    return d.getMonth() === currentMonth && d.getFullYear() === currentYear;
  });

  const monthlySpent = currentMonthExpenses.reduce((sum, item) => sum + item.amount, 0);
  
  const monthNames = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
  document.getElementById('stat-monthly-expense').textContent = formatCurrency(monthlySpent, currency);
  document.getElementById('stat-month-name').textContent = `${monthNames[currentMonth]} ${currentYear}`;

  // 3. Compute Top Category
  const categoryTotals = {};
  expensesList.forEach(item => {
    categoryTotals[item.category] = (categoryTotals[item.category] || 0) + item.amount;
  });

  let topCatName = 'N/A';
  let topCatAmount = 0;
  Object.keys(categoryTotals).forEach(cat => {
    if (categoryTotals[cat] > topCatAmount) {
      topCatAmount = categoryTotals[cat];
      topCatName = cat;
    }
  });

  document.getElementById('stat-top-category').textContent = topCatName;
  document.getElementById('stat-top-category-amount').textContent = `${formatCurrency(topCatAmount, currency)} total`;

  // 4. Compute Monthly Budget Status
  const budgetLimit = currentUser.monthlyBudget || 2500;
  const budgetRemaining = budgetLimit - monthlySpent;
  const percentageUsed = Math.min(Math.round((monthlySpent / budgetLimit) * 100), 100);

  const budgetRemainingEl = document.getElementById('stat-budget-remaining');
  const budgetProgressFill = document.getElementById('budget-progress-fill');
  const budgetStatusBadge = document.getElementById('budget-status-text');
  const budgetLimitEl = document.getElementById('stat-budget-limit');

  budgetLimitEl.textContent = `Budget Goal: ${formatCurrency(budgetLimit, currency)}`;
  budgetProgressFill.style.width = `${percentageUsed}%`;

  if (budgetRemaining < 0) {
    budgetRemainingEl.textContent = `-${formatCurrency(Math.abs(budgetRemaining), currency)} over`;
    budgetRemainingEl.style.color = 'var(--accent-rose)';
    budgetStatusBadge.textContent = 'Exceeded';
    budgetStatusBadge.className = 'budget-status-badge exceeded';
    budgetProgressFill.style.background = 'linear-gradient(90deg, var(--accent-amber), var(--accent-rose))';
  } else {
    budgetRemainingEl.textContent = `${formatCurrency(budgetRemaining, currency)} remaining`;
    budgetRemainingEl.style.color = 'var(--text-primary)';

    if (percentageUsed > 80) {
      budgetStatusBadge.textContent = 'Near Limit';
      budgetStatusBadge.className = 'budget-status-badge warning';
      budgetProgressFill.style.background = 'linear-gradient(90deg, var(--accent-indigo), var(--accent-amber))';
    } else {
      budgetStatusBadge.textContent = 'On Track';
      budgetStatusBadge.className = 'budget-status-badge';
      budgetProgressFill.style.background = 'linear-gradient(90deg, var(--accent-emerald), var(--accent-indigo))';
    }
  }
};

// Render Doughnut Chart for Category Breakdown
const renderCategoryChart = (categoryData = []) => {
  const ctx = document.getElementById('categoryChart').getContext('2d');

  if (categoryDoughnutChart) {
    categoryDoughnutChart.destroy();
  }

  if (!categoryData || categoryData.length === 0) {
    // Empty state fallback chart
    categoryDoughnutChart = new Chart(ctx, {
      type: 'doughnut',
      data: {
        labels: ['No Data'],
        datasets: [{
          data: [1],
          backgroundColor: ['rgba(255, 255, 255, 0.05)'],
          borderWidth: 0
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { display: false },
          tooltip: { enabled: false }
        }
      }
    });
    return;
  }

  const labels = categoryData.map(item => item.category);
  const dataValues = categoryData.map(item => item.total);

  const colors = [
    '#6366f1', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6',
    '#06b6d4', '#ec4899', '#f97316', '#3b82f6', '#64748b'
  ];

  categoryDoughnutChart = new Chart(ctx, {
    type: 'doughnut',
    data: {
      labels: labels,
      datasets: [{
        data: dataValues,
        backgroundColor: colors.slice(0, labels.length),
        borderColor: '#121a2b',
        borderWidth: 3,
        hoverOffset: 6
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      cutout: '70%',
      plugins: {
        legend: {
          position: 'bottom',
          labels: {
            color: '#94a3b8',
            font: { family: 'Plus Jakarta Sans', size: 11, weight: '600' },
            padding: 14,
            usePointStyle: true,
            pointStyle: 'circle'
          }
        },
        tooltip: {
          backgroundColor: 'rgba(18, 26, 43, 0.95)',
          titleColor: '#f8fafc',
          bodyColor: '#cbd5e1',
          borderColor: 'rgba(255, 255, 255, 0.1)',
          borderWidth: 1,
          padding: 10,
          callbacks: {
            label: function(context) {
              const val = context.raw || 0;
              const currency = currentUser ? currentUser.currency : '$';
              return ` ${context.label}: ${formatCurrency(val, currency)}`;
            }
          }
        }
      }
    }
  });
};

// Render Bar Chart for Monthly Trends
const renderMonthlyChart = (monthlySummary = []) => {
  const ctx = document.getElementById('monthlyChart').getContext('2d');

  if (monthlyBarChart) {
    monthlyBarChart.destroy();
  }

  // Sort chronologically ascending for trend line
  const sorted = [...monthlySummary].reverse();

  const labels = sorted.map(item => item.monthName);
  const totals = sorted.map(item => item.total);

  const gradient = ctx.createLinearGradient(0, 0, 0, 300);
  gradient.addColorStop(0, 'rgba(99, 102, 241, 0.8)');
  gradient.addColorStop(1, 'rgba(139, 92, 246, 0.2)');

  monthlyBarChart = new Chart(ctx, {
    type: 'bar',
    data: {
      labels: labels.length > 0 ? labels : ['No Data'],
      datasets: [{
        label: 'Monthly Expense',
        data: totals.length > 0 ? totals : [0],
        backgroundColor: gradient,
        borderColor: '#6366f1',
        borderWidth: 1,
        borderRadius: 8,
        borderSkipped: false
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      scales: {
        x: {
          grid: { display: false },
          ticks: { color: '#94a3b8', font: { family: 'Plus Jakarta Sans', size: 11 } }
        },
        y: {
          grid: { color: 'rgba(255, 255, 255, 0.05)' },
          ticks: {
            color: '#94a3b8',
            font: { family: 'Plus Jakarta Sans', size: 11 },
            callback: function(value) {
              const currency = currentUser ? currentUser.currency : '$';
              return currency + value;
            }
          }
        }
      },
      plugins: {
        legend: { display: false },
        tooltip: {
          backgroundColor: 'rgba(18, 26, 43, 0.95)',
          titleColor: '#f8fafc',
          bodyColor: '#cbd5e1',
          borderColor: 'rgba(255, 255, 255, 0.1)',
          borderWidth: 1,
          padding: 10,
          callbacks: {
            label: function(context) {
              const val = context.raw || 0;
              const currency = currentUser ? currentUser.currency : '$';
              return ` Spending: ${formatCurrency(val, currency)}`;
            }
          }
        }
      }
    }
  });
};
