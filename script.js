const categories = [
  "Food",
  "Transport",
  "Rent",
  "Education",
  "Shopping",
  "Entertainment",
  "Health",
  "Bills",
  "Other"
];

const BUDGET_KEY = "budgetPlanner_budgets";
const EXPENSE_KEY = "budgetPlanner_expenses";

let budgets = JSON.parse(localStorage.getItem(BUDGET_KEY)) || {};
let expenses = JSON.parse(localStorage.getItem(EXPENSE_KEY)) || [];
let chart;

const budgetCategory = document.getElementById("budgetCategory");
const expenseCategory = document.getElementById("expenseCategory");
const budgetForm = document.getElementById("budgetForm");
const expenseForm = document.getElementById("expenseForm");
const expenseDate = document.getElementById("expenseDate");

function currency(value) {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 2
  }).format(value);
}

function saveData() {
  localStorage.setItem(BUDGET_KEY, JSON.stringify(budgets));
  localStorage.setItem(EXPENSE_KEY, JSON.stringify(expenses));
}

function populateCategories() {
  const options = categories.map(c => `<option value="${c}">${c}</option>`).join("");
  budgetCategory.innerHTML = options;
  expenseCategory.innerHTML = options;
}

function getSpentByCategory() {
  return expenses.reduce((totals, expense) => {
    totals[expense.category] = (totals[expense.category] || 0) + Number(expense.amount);
    return totals;
  }, {});
}

function renderSummary() {
  const spentByCategory = getSpentByCategory();
  const totalBudget = Object.values(budgets).reduce((sum, value) => sum + Number(value), 0);
  const totalSpent = expenses.reduce((sum, expense) => sum + Number(expense.amount), 0);
  const remaining = totalBudget - totalSpent;
  const usage = totalBudget > 0 ? (totalSpent / totalBudget) * 100 : 0;

  document.getElementById("totalBudget").textContent = currency(totalBudget);
  document.getElementById("totalSpent").textContent = currency(totalSpent);
  document.getElementById("remaining").textContent = currency(remaining);
  document.getElementById("usage").textContent = `${usage.toFixed(1)}%`;

  const overBudget = Object.keys(budgets).filter(
    category => (spentByCategory[category] || 0) > Number(budgets[category])
  );

  const alertBox = document.getElementById("alertBox");
  if (overBudget.length) {
    alertBox.textContent = `Over-budget warning: ${overBudget.join(", ")} exceeded the planned budget.`;
    alertBox.classList.remove("hidden");
  } else {
    alertBox.classList.add("hidden");
  }
}

function renderBudgets() {
  const list = document.getElementById("budgetList");
  const spent = getSpentByCategory();
  const entries = Object.entries(budgets);

  if (!entries.length) {
    list.innerHTML = '<div class="empty">No budgets added yet.</div>';
    return;
  }

  list.innerHTML = entries.map(([category, amount]) => {
    const actual = spent[category] || 0;
    const isOver = actual > Number(amount);
    return `
      <div class="item ${isOver ? "over" : ""}">
        <div class="item-main">
          <div class="item-title">${escapeHtml(category)}</div>
          <div class="item-sub">
            Budget: ${currency(Number(amount))} | Spent: ${currency(actual)}
          </div>
        </div>
        <div class="item-actions">
          <button class="small-btn" onclick="editBudget('${encodeURIComponent(category)}')">Edit</button>
          <button class="small-btn danger" onclick="deleteBudget('${encodeURIComponent(category)}')">Delete</button>
        </div>
      </div>
    `;
  }).join("");
}

function renderExpenses() {
  const list = document.getElementById("expenseList");

  if (!expenses.length) {
    list.innerHTML = '<div class="empty">No expenses added yet.</div>';
    return;
  }

  const sorted = [...expenses].sort((a, b) =>
    new Date(b.date) - new Date(a.date)
  );

  list.innerHTML = sorted.map(expense => `
    <div class="item">
      <div class="item-main">
        <div class="item-title">${escapeHtml(expense.category)} — ${currency(Number(expense.amount))}</div>
        <div class="item-sub">${escapeHtml(expense.note || "No description")} | ${expense.date}</div>
      </div>
      <div class="item-actions">
        <button class="small-btn danger" onclick="deleteExpense('${expense.id}')">Delete</button>
      </div>
    </div>
  `).join("");
}

function renderChart() {
  const spent = getSpentByCategory();
  const labels = categories.filter(c => budgets[c] !== undefined || spent[c] !== undefined);

  const budgetValues = labels.map(c => Number(budgets[c] || 0));
  const spentValues = labels.map(c => Number(spent[c] || 0));

  if (chart) chart.destroy();

  chart = new Chart(document.getElementById("budgetChart"), {
    type: "bar",
    data: {
      labels,
      datasets: [
        {
          label: "Budget",
          data: budgetValues
        },
        {
          label: "Actual Spending",
          data: spentValues
        }
      ]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      scales: {
        y: {
          beginAtZero: true,
          ticks: {
            callback: value => "₹" + value
          }
        }
      },
      plugins: {
        legend: {
          position: "top"
        },
        tooltip: {
          callbacks: {
            label: context => `${context.dataset.label}: ${currency(context.raw)}`
          }
        }
      }
    }
  });
}

function renderAll() {
  renderSummary();
  renderBudgets();
  renderExpenses();
  renderChart();
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

budgetForm.addEventListener("submit", event => {
  event.preventDefault();
  const category = budgetCategory.value;
  const amount = Number(document.getElementById("budgetAmount").value);

  if (!Number.isFinite(amount) || amount < 0) {
    alert("Please enter a valid budget amount.");
    return;
  }

  budgets[category] = amount;
  saveData();
  budgetForm.reset();
  populateCategories();
  renderAll();
});

expenseForm.addEventListener("submit", event => {
  event.preventDefault();

  const category = expenseCategory.value;
  const amount = Number(document.getElementById("expenseAmount").value);
  const note = document.getElementById("expenseNote").value.trim();
  const date = expenseDate.value;

  if (!Number.isFinite(amount) || amount <= 0 || !date) {
    alert("Please enter a valid amount and date.");
    return;
  }

  expenses.push({
    id: Date.now().toString(),
    category,
    amount,
    note,
    date
  });

  saveData();
  expenseForm.reset();
  expenseDate.value = new Date().toISOString().split("T")[0];
  renderAll();
});

window.editBudget = function(encodedCategory) {
  const category = decodeURIComponent(encodedCategory);
  const current = budgets[category];
  const updated = prompt(`Enter new budget for ${category}:`, current);

  if (updated === null) return;

  const amount = Number(updated);
  if (!Number.isFinite(amount) || amount < 0) {
    alert("Invalid budget amount.");
    return;
  }

  budgets[category] = amount;
  saveData();
  renderAll();
};

window.deleteBudget = function(encodedCategory) {
  const category = decodeURIComponent(encodedCategory);
  if (!confirm(`Delete the ${category} budget?`)) return;

  delete budgets[category];
  saveData();
  renderAll();
};

window.deleteExpense = function(id) {
  if (!confirm("Delete this expense?")) return;

  expenses = expenses.filter(expense => expense.id !== id);
  saveData();
  renderAll();
};

document.getElementById("clearAll").addEventListener("click", () => {
  if (!confirm("This will delete all budgets and expenses. Continue?")) return;

  budgets = {};
  expenses = [];
  saveData();
  renderAll();
});

populateCategories();
expenseDate.value = new Date().toISOString().split("T")[0];
renderAll();
