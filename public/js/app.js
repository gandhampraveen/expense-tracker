/* ==========================================================================
   MAIN APPLICATION CONTROLLER
   Handles UI interactions, modals, filtering, expense table rendering & CRUD
   ========================================================================== */

let currentExpenses = [];
let categoriesList = [];
let searchDebounceTimeout = null;

// Toast Notification Helper
const showToast = (message, type = 'info') => {
  const container = document.getElementById('toast-container');
  if (!container) return;

  const toast = document.createElement('div');
  toast.className = `toast toast-${type}`;
  
  let icon = 'fa-info-circle';
  if (type === 'success') icon = 'fa-circle-check';
  if (type === 'error') icon = 'fa-triangle-exclamation';

  toast.innerHTML = `
    <i class="fa-solid ${icon}"></i>
    <span>${message}</span>
  `;

  container.appendChild(toast);

  setTimeout(() => {
    toast.style.opacity = '0';
    toast.style.transform = 'translateX(50px)';
    setTimeout(() => toast.remove(), 300);
  }, 3500);
};

// Initialize Dashboard & App State
const initDashboard = async () => {
  try {
    await loadCategories();
    // Default date range: preset all or current month
    document.getElementById('expense-date-input').valueAsDate = new Date();
    await loadExpenses();
    await refreshAnalytics();
  } catch (err) {
    showToast('Error initializing dashboard data', 'error');
  }
};

// Load & Populate Categories
const loadCategories = async () => {
  try {
    categoriesList = await categoryAPI.getAll();
    populateCategoryDropdowns();
  } catch (err) {
    console.error('Error loading categories:', err);
  }
};

const populateCategoryDropdowns = () => {
  const filterSelect = document.getElementById('filter-category');
  const modalSelect = document.getElementById('expense-category-input');

  const selectedFilter = filterSelect.value;
  const selectedModal = modalSelect.value;

  // Clear options
  filterSelect.innerHTML = '<option value="All">All Categories</option>';
  modalSelect.innerHTML = '';

  categoriesList.forEach(cat => {
    const icon = cat.icon || '🏷️';
    const optFilter = document.createElement('option');
    optFilter.value = cat.name;
    optFilter.textContent = `${icon} ${cat.name}`;
    filterSelect.appendChild(optFilter);

    const optModal = document.createElement('option');
    optModal.value = cat.name;
    optModal.textContent = `${icon} ${cat.name}`;
    modalSelect.appendChild(optModal);
  });

  if (selectedFilter) filterSelect.value = selectedFilter;
  if (selectedModal) modalSelect.value = selectedModal;
};

// Fetch Expenses based on current active filters
const loadExpenses = async () => {
  const search = document.getElementById('search-input').value.trim();
  const category = document.getElementById('filter-category').value;
  const startDate = document.getElementById('filter-start-date').value;
  const endDate = document.getElementById('filter-end-date').value;
  const sortVal = document.getElementById('sort-by').value;

  const [sortBy, order] = sortVal.split('-');

  try {
    const data = await expenseAPI.getAll({
      search,
      category,
      startDate,
      endDate,
      sortBy,
      order
    });

    currentExpenses = data.expenses || [];
    renderExpensesTable(currentExpenses);
    
    // Update badge counter
    document.getElementById('expense-count-badge').textContent = `${data.count || 0} items`;
    
    // Update stats cards
    updateDashboardCards(currentExpenses, { totalExpense: data.totalAmount, count: data.count });
  } catch (err) {
    showToast('Failed to load expenses', 'error');
  }
};

// Refresh Visual Analytics (Charts & Global Summaries)
const refreshAnalytics = async () => {
  try {
    const [categoryRes, monthlyRes] = await Promise.all([
      expenseAPI.getCategoryBreakdown(),
      expenseAPI.getMonthly()
    ]);

    renderCategoryChart(categoryRes.categories || []);
    renderMonthlyChart(monthlyRes || []);
  } catch (err) {
    console.error('Error updating analytics charts:', err);
  }
};

// Render Table Rows
const renderExpensesTable = (expenses) => {
  const tbody = document.getElementById('expense-table-body');
  const emptyState = document.getElementById('empty-state');
  const table = document.querySelector('.expense-table');

  tbody.innerHTML = '';

  if (!expenses || expenses.length === 0) {
    table.classList.add('hidden');
    emptyState.classList.remove('hidden');
    return;
  }

  table.classList.remove('hidden');
  emptyState.classList.add('hidden');

  const currency = currentUser ? currentUser.currency : '$';

  expenses.forEach(expense => {
    const tr = document.createElement('tr');
    
    // Find category metadata for icon & color
    const catMeta = categoriesList.find(c => c.name.toLowerCase() === expense.category.toLowerCase()) || { icon: '🏷️', color: '#6366f1' };

    const formattedDate = new Date(expense.date).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });

    tr.innerHTML = `
      <td>
        <div class="transaction-cell">
          <span class="transaction-title">${escapeHTML(expense.title)}</span>
          ${expense.notes ? `<span class="transaction-notes">${escapeHTML(expense.notes)}</span>` : ''}
        </div>
      </td>
      <td>
        <span class="category-badge" style="border-left: 3px solid ${catMeta.color || '#6366f1'};">
          <span>${catMeta.icon || '🏷️'}</span>
          <span>${escapeHTML(expense.category)}</span>
        </span>
      </td>
      <td>
        <span class="payment-badge">
          <i class="fa-regular fa-credit-card"></i>
          <span>${escapeHTML(expense.paymentMethod || 'Credit Card')}</span>
        </span>
      </td>
      <td>${formattedDate}</td>
      <td class="text-right">
        <span class="amount-text">-${formatCurrency(expense.amount, currency)}</span>
      </td>
      <td class="text-center">
        <div class="action-buttons">
          <button class="btn-icon-sm" onclick="openExpenseModal('${expense._id}')" title="Edit Expense">
            <i class="fa-solid fa-pen"></i>
          </button>
          <button class="btn-icon-sm" onclick="handleDeleteExpense('${expense._id}')" title="Delete Expense">
            <i class="fa-solid fa-trash" style="color: var(--accent-rose);"></i>
          </button>
        </div>
      </td>
    `;

    tbody.appendChild(tr);
  });
};

const escapeHTML = (str) => {
  if (!str) return '';
  return str.replace(/[&<>'"]/g, 
    tag => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' }[tag] || tag)
  );
};

// Filter & Search Handlers
const handleSearchInput = () => {
  const clearBtn = document.getElementById('clear-search-btn');
  const val = document.getElementById('search-input').value;

  if (val.length > 0) {
    clearBtn.classList.remove('hidden');
  } else {
    clearBtn.classList.add('hidden');
  }

  clearTimeout(searchDebounceTimeout);
  searchDebounceTimeout = setTimeout(() => {
    loadExpenses();
  }, 250);
};

const clearSearch = () => {
  document.getElementById('search-input').value = '';
  document.getElementById('clear-search-btn').classList.add('hidden');
  loadExpenses();
};

const applyFilters = () => {
  loadExpenses();
};

const resetDateFilter = () => {
  document.getElementById('filter-start-date').value = '';
  document.getElementById('filter-end-date').value = '';
  document.getElementById('preset-all').classList.add('active');
  document.getElementById('preset-month').classList.remove('active');
  document.getElementById('preset-30days').classList.remove('active');
  loadExpenses();
};

const setPresetDate = (type) => {
  const startEl = document.getElementById('filter-start-date');
  const endEl = document.getElementById('filter-end-date');

  document.querySelectorAll('.preset-buttons .btn').forEach(b => b.classList.remove('active'));

  const now = new Date();

  if (type === 'all') {
    startEl.value = '';
    endEl.value = '';
    document.getElementById('preset-all').classList.add('active');
  } else if (type === 'month') {
    const firstDay = new Date(now.getFullYear(), now.getMonth(), 1);
    startEl.valueAsDate = firstDay;
    endEl.valueAsDate = now;
    document.getElementById('preset-month').classList.add('active');
  } else if (type === '30days') {
    const past30 = new Date();
    past30.setDate(now.getDate() - 30);
    startEl.valueAsDate = past30;
    endEl.valueAsDate = now;
    document.getElementById('preset-30days').classList.add('active');
  }

  loadExpenses();
};

// MODAL 1: ADD / EDIT EXPENSE
const openExpenseModal = (expenseId = null) => {
  const modal = document.getElementById('expense-modal');
  const form = document.getElementById('expense-form');
  const titleEl = document.getElementById('modal-expense-title');

  form.reset();
  document.getElementById('expense-id').value = '';
  document.getElementById('expense-date-input').valueAsDate = new Date();

  if (expenseId) {
    const expense = currentExpenses.find(e => e._id === expenseId);
    if (expense) {
      titleEl.innerHTML = '<i class="fa-solid fa-pen-to-square text-accent"></i> Edit Expense';
      document.getElementById('expense-id').value = expense._id;
      document.getElementById('expense-title-input').value = expense.title;
      document.getElementById('expense-amount-input').value = expense.amount;
      document.getElementById('expense-category-input').value = expense.category;
      document.getElementById('expense-date-input').value = expense.date.split('T')[0];
      document.getElementById('expense-payment-input').value = expense.paymentMethod || 'Credit Card';
      document.getElementById('expense-notes-input').value = expense.notes || '';
    }
  } else {
    titleEl.innerHTML = '<i class="fa-solid fa-receipt text-accent"></i> Add New Expense';
  }

  modal.classList.remove('hidden');
};

const closeExpenseModal = () => {
  document.getElementById('expense-modal').classList.add('hidden');
};

const handleExpenseFormSubmit = async (e) => {
  e.preventDefault();

  const id = document.getElementById('expense-id').value;
  const title = document.getElementById('expense-title-input').value.trim();
  const amount = Number(document.getElementById('expense-amount-input').value);
  const category = document.getElementById('expense-category-input').value;
  const date = document.getElementById('expense-date-input').value;
  const paymentMethod = document.getElementById('expense-payment-input').value;
  const notes = document.getElementById('expense-notes-input').value.trim();

  const expensePayload = { title, amount, category, date, paymentMethod, notes };

  try {
    if (id) {
      // Update existing expense (PUT /expense/:id)
      await expenseAPI.update(id, expensePayload);
      showToast('Expense updated successfully!', 'success');
    } else {
      // Add new expense (POST /expense)
      await expenseAPI.create(expensePayload);
      showToast('New expense added!', 'success');
    }

    closeExpenseModal();
    await loadExpenses();
    await refreshAnalytics();
  } catch (err) {
    showToast(err.message || 'Failed to save expense', 'error');
  }
};

const handleDeleteExpense = async (id) => {
  if (!confirm('Are you sure you want to delete this expense record?')) return;

  try {
    await expenseAPI.delete(id); // DELETE /expense/:id
    showToast('Expense deleted', 'info');
    await loadExpenses();
    await refreshAnalytics();
  } catch (err) {
    showToast(err.message || 'Failed to delete expense', 'error');
  }
};

// MODAL 3: ADD CUSTOM CATEGORY
const openCategoryModal = () => {
  document.getElementById('category-form').reset();
  document.getElementById('category-modal').classList.remove('hidden');
};

const closeCategoryModal = () => {
  document.getElementById('category-modal').classList.add('hidden');
};

const handleCategoryFormSubmit = async (e) => {
  e.preventDefault();
  const name = document.getElementById('cat-name-input').value.trim();
  const icon = document.getElementById('cat-icon-input').value.trim() || '🏷️';
  const color = document.getElementById('cat-color-input').value;

  try {
    await categoryAPI.create({ name, icon, color });
    showToast(`Category "${name}" added!`, 'success');
    closeCategoryModal();
    await loadCategories();
  } catch (err) {
    showToast(err.message || 'Failed to create category', 'error');
  }
};

// Document Loaded Listener
document.addEventListener('DOMContentLoaded', () => {
  initAuth();
});
