// Global variables
let transactions = JSON.parse(localStorage.getItem('transactions')) || [];
let currentCurrency = JSON.parse(localStorage.getItem('currentCurrency')) || {
    code: 'USD',
    symbol: '$',
    name: 'US Dollar',
    country: 'United States'
};

// DOM elements
const currencySelect = document.getElementById('currencySelect');
const selectedCurrency = document.getElementById('selectedCurrency');
const expenseForm = document.getElementById('expenseForm');
const expenseList = document.getElementById('expenseList');
const categoryFilter = document.getElementById('categoryFilter');
const typeFilter = document.getElementById('typeFilter');
const clearAllBtn = document.getElementById('clearAllBtn');
const transactionType = document.getElementById('transactionType');
const submitBtnText = document.getElementById('submitBtnText');

// Initialize the app
document.addEventListener('DOMContentLoaded', function() {
    initializeCurrencySelector();
    updateSelectedCurrency();
    updateTransactionList();
    updateSummary();
    updateCategoryBreakdown();
    setupTransactionTypeHandler();
    
    // Set today's date as default
    document.getElementById('expenseDate').value = new Date().toISOString().split('T')[0];
    
    // Migrate old data if exists
    migrateOldData();
});

// Initialize currency selector
function initializeCurrencySelector() {
    // Sort currencies alphabetically by country name
    const sortedCurrencies = currencies.sort((a, b) => a.country.localeCompare(b.country));
    
    sortedCurrencies.forEach(currency => {
        const option = document.createElement('option');
        option.value = JSON.stringify(currency);
        option.textContent = `${currency.country} - ${currency.name} (${currency.code})`;
        currencySelect.appendChild(option);
    });
    
    // Set current currency as selected
    const currentCurrencyStr = JSON.stringify(currentCurrency);
    currencySelect.value = currentCurrencyStr;
}

// Setup transaction type handler
function setupTransactionTypeHandler() {
    transactionType.addEventListener('change', function() {
        const isIncome = this.value === 'income';
        const expenseCategories = document.getElementById('expenseCategories');
        const incomeCategories = document.getElementById('incomeCategories');
        const categorySelect = document.getElementById('expenseCategory');
        
        if (isIncome) {
            expenseCategories.style.display = 'none';
            incomeCategories.style.display = 'block';
            submitBtnText.textContent = 'Add Income';
            document.getElementById('expenseDescription').placeholder = 'Income source...';
        } else {
            expenseCategories.style.display = 'block';
            incomeCategories.style.display = 'none';
            submitBtnText.textContent = 'Add Expense';
            document.getElementById('expenseDescription').placeholder = 'What did you spend on...';
        }
        
        // Reset category selection
        categorySelect.value = '';
    });
}
function updateSelectedCurrency() {
    selectedCurrency.innerHTML = `
        <span class="currency-symbol">${currentCurrency.symbol}</span>
        <span class="currency-code">${currentCurrency.code}</span>
        <span class="currency-name">${currentCurrency.name}</span>
    `;
}

// Handle currency selection
currencySelect.addEventListener('change', function() {
    if (this.value) {
        currentCurrency = JSON.parse(this.value);
        localStorage.setItem('currentCurrency', JSON.stringify(currentCurrency));
        updateSelectedCurrency();
        updateTransactionList();
        updateSummary();
        updateCategoryBreakdown();
    }
});

// Handle transaction form submission
expenseForm.addEventListener('submit', function(e) {
    e.preventDefault();
    
    const type = document.getElementById('transactionType').value;
    const description = document.getElementById('expenseDescription').value.trim();
    const amount = parseFloat(document.getElementById('expenseAmount').value);
    const category = document.getElementById('expenseCategory').value;
    const date = document.getElementById('expenseDate').value;
    
    if (!type || !description || !amount || !category || !date) {
        alert('Please fill in all fields');
        return;
    }
    
    if (amount <= 0) {
        alert('Amount must be greater than 0');
        return;
    }
    
    const transaction = {
        id: Date.now(),
        type,
        description,
        amount,
        category,
        date,
        currency: currentCurrency
    };
    
    transactions.unshift(transaction); // Add to beginning of array
    localStorage.setItem('transactions', JSON.stringify(transactions));
    
    // Reset form
    expenseForm.reset();
    document.getElementById('expenseDate').value = new Date().toISOString().split('T')[0];
    
    // Update displays
    updateTransactionList();
    updateSummary();
    updateCategoryBreakdown();
    
    // Show success feedback
    const transactionTypeText = type === 'income' ? 'Income' : 'Expense';
    showNotification(`${transactionTypeText} added successfully!`, 'success');
});

// Update transaction list
function updateTransactionList() {
    const filterCategory = categoryFilter.value;
    const filterType = typeFilter.value;
    
    let filteredTransactions = transactions;
    
    if (filterType) {
        filteredTransactions = filteredTransactions.filter(transaction => transaction.type === filterType);
    }
    
    if (filterCategory) {
        filteredTransactions = filteredTransactions.filter(transaction => transaction.category === filterCategory);
    }
    
    if (filteredTransactions.length === 0) {
        expenseList.innerHTML = `
            <div class="empty-state">
                <i class="fas fa-receipt"></i>
                <p>${filterCategory || filterType ? 'No transactions match your filters' : 'No transactions recorded yet'}</p>
                <span>${filterCategory || filterType ? 'Try adjusting your filters' : 'Add your first transaction above to get started!'}</span>
            </div>
        `;
        return;
    }
    
    expenseList.innerHTML = filteredTransactions.map(transaction => `
        <div class="expense-item ${transaction.type}">
            <div class="expense-category">${getCategoryEmoji(transaction.category)}</div>
            <div class="expense-details">
                <h4>${transaction.description}</h4>
                <p>${formatDate(transaction.date)} • ${getCategoryName(transaction.category)}</p>
            </div>
            <div class="expense-amount ${transaction.type}">
                ${transaction.type === 'income' ? '+' : '-'}${transaction.currency.symbol}${transaction.amount.toFixed(2)}
                ${transaction.currency.code !== currentCurrency.code ? 
                    `<br><small style="color: #718096;">(${transaction.currency.code})</small>` : ''
                }
            </div>
            <button class="delete-btn" onclick="deleteTransaction(${transaction.id})">
                <i class="fas fa-trash"></i>
            </button>
        </div>
    `).join('');
}

// Delete transaction
function deleteTransaction(id) {
    if (confirm('Are you sure you want to delete this transaction?')) {
        transactions = transactions.filter(transaction => transaction.id !== id);
        localStorage.setItem('transactions', JSON.stringify(transactions));
        updateTransactionList();
        updateSummary();
        updateCategoryBreakdown();
        showNotification('Transaction deleted successfully!', 'success');
    }
}

// Update summary
function updateSummary() {
    const now = new Date();
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();
    const startOfWeek = new Date(now.setDate(now.getDate() - now.getDay()));
    
    // Filter transactions by current currency for accurate totals
    const currentCurrencyTransactions = transactions.filter(transaction => 
        transaction.currency.code === currentCurrency.code
    );
    
    const income = currentCurrencyTransactions
        .filter(transaction => transaction.type === 'income')
        .reduce((sum, transaction) => sum + transaction.amount, 0);
    
    const expenses = currentCurrencyTransactions
        .filter(transaction => transaction.type === 'expense')
        .reduce((sum, transaction) => sum + transaction.amount, 0);
    
    const balance = income - expenses;
    
    const monthlyExpenses = currentCurrencyTransactions
        .filter(transaction => {
            const transactionDate = new Date(transaction.date);
            return transaction.type === 'expense' && 
                   transactionDate.getMonth() === currentMonth && 
                   transactionDate.getFullYear() === currentYear;
        })
        .reduce((sum, transaction) => sum + transaction.amount, 0);
    
    const weeklyExpenses = currentCurrencyTransactions
        .filter(transaction => transaction.type === 'expense' && new Date(transaction.date) >= startOfWeek)
        .reduce((sum, transaction) => sum + transaction.amount, 0);
    
    document.getElementById('totalIncome').textContent = 
        `${currentCurrency.symbol}${income.toFixed(2)}`;
    document.getElementById('totalExpenses').textContent = 
        `${currentCurrency.symbol}${expenses.toFixed(2)}`;
    document.getElementById('netBalance').textContent = 
        `${currentCurrency.symbol}${balance.toFixed(2)}`;
    document.getElementById('monthlyExpenses').textContent = 
        `${currentCurrency.symbol}${monthlyExpenses.toFixed(2)}`;
    document.getElementById('weeklyExpenses').textContent = 
        `${currentCurrency.symbol}${weeklyExpenses.toFixed(2)}`;
    
    // Update balance card color based on positive/negative
    const balanceCard = document.querySelector('.summary-card.balance');
    if (balance >= 0) {
        balanceCard.style.background = 'linear-gradient(135deg, #48bb78, #38a169)';
    } else {
        balanceCard.style.background = 'linear-gradient(135deg, #f56565, #e53e3e)';
    }
}

// Update category breakdown
function updateCategoryBreakdown() {
    const categoryBreakdown = document.getElementById('categoryBreakdown');
    
    // Filter transactions by current currency
    const currentCurrencyTransactions = transactions.filter(transaction => 
        transaction.currency.code === currentCurrency.code
    );
    
    if (currentCurrencyTransactions.length === 0) {
        categoryBreakdown.innerHTML = `
            <div class="empty-state">
                <i class="fas fa-chart-pie"></i>
                <p>No data to display</p>
            </div>
        `;
        return;
    }
    
    // Calculate category totals for expenses only
    const categoryTotals = {};
    currentCurrencyTransactions
        .filter(transaction => transaction.type === 'expense')
        .forEach(transaction => {
            categoryTotals[transaction.category] = (categoryTotals[transaction.category] || 0) + transaction.amount;
        });
    
    if (Object.keys(categoryTotals).length === 0) {
        categoryBreakdown.innerHTML = `
            <div class="empty-state">
                <i class="fas fa-chart-pie"></i>
                <p>No expense data to display</p>
            </div>
        `;
        return;
    }
    
    // Sort categories by amount (descending)
    const sortedCategories = Object.entries(categoryTotals)
        .sort(([,a], [,b]) => b - a);
    
    const total = Object.values(categoryTotals).reduce((sum, amount) => sum + amount, 0);
    
    categoryBreakdown.innerHTML = sortedCategories.map(([category, amount]) => {
        const percentage = ((amount / total) * 100).toFixed(1);
        return `
            <div class="category-item">
                <div class="category-info">
                    <span style="font-size: 1.2rem; margin-right: 10px;">${getCategoryEmoji(category)}</span>
                    <span>${getCategoryName(category)}</span>
                    <span style="margin-left: 10px; color: #718096; font-size: 0.9rem;">${percentage}%</span>
                </div>
                <div class="category-amount">${currentCurrency.symbol}${amount.toFixed(2)}</div>
            </div>
        `;
    }).join('');
}

// Handle category filter
categoryFilter.addEventListener('change', function() {
    updateTransactionList();
});

// Handle type filter
typeFilter.addEventListener('change', function() {
    updateTransactionList();
});

// Handle clear all transactions
clearAllBtn.addEventListener('click', function() {
    if (transactions.length === 0) {
        showNotification('No transactions to clear!', 'info');
        return;
    }
    
    if (confirm('Are you sure you want to delete ALL transactions? This action cannot be undone.')) {
        transactions = [];
        localStorage.setItem('transactions', JSON.stringify(transactions));
        updateTransactionList();
        updateSummary();
        updateCategoryBreakdown();
        showNotification('All transactions cleared!', 'success');
    }
});

// Migration function to convert old expense data to transaction format
function migrateOldData() {
    const oldExpenses = JSON.parse(localStorage.getItem('expenses')) || [];
    if (oldExpenses.length > 0 && transactions.length === 0) {
        const migratedTransactions = oldExpenses.map(expense => ({
            ...expense,
            type: 'expense'
        }));
        transactions = migratedTransactions;
        localStorage.setItem('transactions', JSON.stringify(transactions));
        localStorage.removeItem('expenses'); // Clean up old data
        showNotification('Migrated old expense data to new format!', 'success');
    }
}

// Utility functions
function getCategoryEmoji(category) {
    const emojis = {
        // Expense categories
        'food': '🍽️',
        'transport': '🚗',
        'shopping': '🛍️',
        'entertainment': '🎬',
        'health': '🏥',
        'bills': '📋',
        'education': '📚',
        'travel': '✈️',
        'other': '📌',
        // Income categories
        'salary': '💼',
        'freelance': '💻',
        'business': '🏢',
        'investment': '📈',
        'bonus': '🎁',
        'gift': '🎉',
        'refund': '🔄',
        'other-income': '📌'
    };
    return emojis[category] || '📌';
}

function getCategoryName(category) {
    const names = {
        // Expense categories
        'food': 'Food & Dining',
        'transport': 'Transportation',
        'shopping': 'Shopping',
        'entertainment': 'Entertainment',
        'health': 'Healthcare',
        'bills': 'Bills & Utilities',
        'education': 'Education',
        'travel': 'Travel',
        'other': 'Other',
        // Income categories
        'salary': 'Salary',
        'freelance': 'Freelance',
        'business': 'Business',
        'investment': 'Investment',
        'bonus': 'Bonus',
        'gift': 'Gift',
        'refund': 'Refund',
        'other-income': 'Other Income'
    };
    return names[category] || 'Other';
}

function formatDate(dateString) {
    const date = new Date(dateString);
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    
    if (date.toDateString() === today.toDateString()) {
        return 'Today';
    } else if (date.toDateString() === yesterday.toDateString()) {
        return 'Yesterday';
    } else {
        return date.toLocaleDateString('en-US', { 
            month: 'short', 
            day: 'numeric',
            year: date.getFullYear() !== today.getFullYear() ? 'numeric' : undefined
        });
    }
}

function showNotification(message, type = 'info') {
    // Create notification element
    const notification = document.createElement('div');
    notification.className = `notification notification-${type}`;
    notification.innerHTML = `
        <i class="fas fa-${type === 'success' ? 'check-circle' : type === 'error' ? 'exclamation-circle' : 'info-circle'}"></i>
        <span>${message}</span>
    `;
    
    // Add styles
    notification.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        background: ${type === 'success' ? '#48bb78' : type === 'error' ? '#f56565' : '#4299e1'};
        color: white;
        padding: 15px 20px;
        border-radius: 8px;
        box-shadow: 0 4px 12px rgba(0,0,0,0.15);
        z-index: 1000;
        display: flex;
        align-items: center;
        gap: 10px;
        font-weight: 500;
        animation: slideInFromRight 0.3s ease;
        max-width: 300px;
    `;
    
    // Add animation keyframes if not already added
    if (!document.querySelector('#notification-styles')) {
        const style = document.createElement('style');
        style.id = 'notification-styles';
        style.textContent = `
            @keyframes slideInFromRight {
                from {
                    transform: translateX(100%);
                    opacity: 0;
                }
                to {
                    transform: translateX(0);
                    opacity: 1;
                }
            }
            @keyframes slideOutToRight {
                from {
                    transform: translateX(0);
                    opacity: 1;
                }
                to {
                    transform: translateX(100%);
                    opacity: 0;
                }
            }
        `;
        document.head.appendChild(style);
    }
    
    document.body.appendChild(notification);
    
    // Remove notification after 3 seconds
    setTimeout(() => {
        notification.style.animation = 'slideOutToRight 0.3s ease';
        setTimeout(() => {
            if (notification.parentNode) {
                notification.parentNode.removeChild(notification);
            }
        }, 300);
    }, 3000);
}

// Export data functionality
function exportData() {
    const dataStr = JSON.stringify(transactions, null, 2);
    const dataBlob = new Blob([dataStr], {type: 'application/json'});
    const url = URL.createObjectURL(dataBlob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `transactions_${new Date().toISOString().split('T')[0]}.json`;
    link.click();
    URL.revokeObjectURL(url);
    showNotification('Data exported successfully!', 'success');
}

// Import data functionality
function importData(event) {
    const file = event.target.files[0];
    if (!file) return;
    
    const reader = new FileReader();
    reader.onload = function(e) {
        try {
            const importedTransactions = JSON.parse(e.target.result);
            if (Array.isArray(importedTransactions)) {
                transactions = importedTransactions;
                localStorage.setItem('transactions', JSON.stringify(transactions));
                updateTransactionList();
                updateSummary();
                updateCategoryBreakdown();
                showNotification('Data imported successfully!', 'success');
            } else {
                throw new Error('Invalid file format');
            }
        } catch (error) {
            showNotification('Error importing data. Please check file format.', 'error');
        }
    };
    reader.readAsText(file);
}

// Keyboard shortcuts
document.addEventListener('keydown', function(e) {
    // Ctrl/Cmd + Enter to submit form when focused on form elements
    if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
        if (document.activeElement.closest('#expenseForm')) {
            e.preventDefault();
            expenseForm.dispatchEvent(new Event('submit'));
        }
    }
    
    // Escape to clear form
    if (e.key === 'Escape') {
        if (document.activeElement.closest('#expenseForm')) {
            expenseForm.reset();
            document.getElementById('expenseDate').value = new Date().toISOString().split('T')[0];
            document.getElementById('expenseDescription').focus();
        }
    }
});

// Auto-focus on description field when page loads
window.addEventListener('load', function() {
    document.getElementById('expenseDescription').focus();
});

// Service Worker for offline functionality (optional)
if ('serviceWorker' in navigator) {
    window.addEventListener('load', function() {
        navigator.serviceWorker.register('./sw.js')
            .then(function(registration) {
                console.log('ServiceWorker registration successful');
            })
            .catch(function(error) {
                console.log('ServiceWorker registration failed');
            });
    });
}
