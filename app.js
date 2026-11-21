const STORAGE_KEY = "offline-todo-list";
const THEME_STORAGE_KEY = "offline-todo-theme";

const form = document.querySelector("#todo-form");
const input = document.querySelector("#todo-input");
const list = document.querySelector("#todo-list");
const emptyState = document.querySelector("#empty-state");
const count = document.querySelector("#todo-count");
const clearCompletedButton = document.querySelector("#clear-completed");
const schedulePicker = document.querySelector("#schedule-picker");
const themeToggle = document.querySelector("#theme-toggle");
const themeIcon = document.querySelector("#theme-icon");
const themeLabel = document.querySelector("#theme-label");

let activeFilter = "all";
let activeSchedule = "today";

function getLocalDateString(date = new Date()) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function isValidDateString(value) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return false;
  }

  const [year, month, day] = value.split("-").map(Number);
  const date = new Date(year, month - 1, day);
  return (
    date.getFullYear() === year &&
    date.getMonth() === month - 1 &&
    date.getDate() === day
  );
}

function getCreatedDateFromId(id) {
  const timestamp = Number(String(id).split("-")[0]);
  return Number.isFinite(timestamp) && timestamp > 0
    ? getLocalDateString(new Date(timestamp))
    : getLocalDateString();
}

function getDaysSinceCreated(createdAt) {
  const [createdYear, createdMonth, createdDay] = createdAt
    .split("-")
    .map(Number);
  const today = new Date();
  const createdUtc = Date.UTC(createdYear, createdMonth - 1, createdDay);
  const todayUtc = Date.UTC(
    today.getFullYear(),
    today.getMonth(),
    today.getDate(),
  );
  return Math.max(0, Math.floor((todayUtc - createdUtc) / 86400000));
}

function getScheduleLabel(todo) {
  const daysSinceCreated = getDaysSinceCreated(todo.createdAt);
  if (todo.schedule === "two-weeks") {
    const daysRemaining = 14 - daysSinceCreated;
    if (daysRemaining > 0) {
      return `剩 ${daysRemaining} 天`;
    }
    return daysRemaining === 0
      ? "今天到期"
      : `逾期 ${Math.abs(daysRemaining)} 天`;
  }

  return `${daysSinceCreated} 天前`;
}

function loadThemePreference() {
  try {
    const preference = localStorage.getItem(THEME_STORAGE_KEY);
    return preference === "dark" || preference === "light" ? preference : null;
  } catch {
    return null;
  }
}

function applyTheme(theme) {
  document.documentElement.dataset.theme = theme;
  const isDark = theme === "dark";
  themeToggle.setAttribute("aria-pressed", String(isDark));
  themeIcon.textContent = isDark ? "☀️" : "🌙";
  themeLabel.textContent = isDark ? "淺色模式" : "深色模式";
}

const savedTheme = loadThemePreference();
applyTheme(savedTheme || "light");

themeToggle.addEventListener("click", () => {
  const nextTheme =
    document.documentElement.dataset.theme === "dark" ? "light" : "dark";
  applyTheme(nextTheme);
  try {
    localStorage.setItem(THEME_STORAGE_KEY, nextTheme);
  } catch {
    // 儲存空間不可用時，仍套用本次選擇。
  }
});

// 從本機儲存空間讀取清單，資料異常時以空清單開始。
function loadTodos() {
  try {
    const savedTodos = JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]");
    return Array.isArray(savedTodos)
      ? savedTodos
          .filter((todo) => todo && typeof todo.text === "string")
          .map((todo) => {
            const id = String(todo.id);
            return {
              id,
              text: todo.text,
              completed: Boolean(todo.completed),
              schedule: todo.schedule === "two-weeks" ? "two-weeks" : "today",
              createdAt: isValidDateString(todo.createdAt)
                ? todo.createdAt
                : getCreatedDateFromId(id),
            };
          })
      : [];
  } catch {
    return [];
  }
}

let todos = loadTodos();

// 每次清單變動後同步保存，讓重新整理後仍能接續使用。
function saveTodos() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(todos));
  } catch {
    // 儲存空間不可用時，仍保留目前頁面中的操作。
  }
}

function renderTodos() {
  list.replaceChildren();
  const visibleTodos = todos.filter((todo) => {
    if (activeFilter === "active") {
      return !todo.completed;
    }
    if (activeFilter === "completed") {
      return todo.completed;
    }
    if (activeFilter === "today" || activeFilter === "two-weeks") {
      return todo.schedule === activeFilter;
    }
    return true;
  });

  for (const todo of visibleTodos) {
    const item = document.createElement("li");
    item.className = "todo-item";
    item.dataset.id = todo.id;

    const checkbox = document.createElement("input");
    checkbox.className = "todo-checkbox";
    checkbox.type = "checkbox";
    checkbox.checked = todo.completed;
    checkbox.setAttribute("aria-label", `完成待辦：${todo.text}`);

    const text = document.createElement("span");
    text.className = "todo-text";
    text.textContent = todo.text;

    const metadata = document.createElement("span");
    metadata.className = "todo-meta";

    const dateLabel = document.createElement("span");
    const daysSinceCreated = getDaysSinceCreated(todo.createdAt);
    const isOverdue = todo.schedule === "two-weeks" && daysSinceCreated > 14;
    dateLabel.className = isOverdue
      ? "todo-date-label is-overdue"
      : "todo-date-label";
    dateLabel.textContent = getScheduleLabel(todo);
    metadata.append(dateLabel);

    const deleteButton = document.createElement("button");
    deleteButton.className = "delete-button";
    deleteButton.type = "button";
    deleteButton.textContent = "×";
    deleteButton.setAttribute("aria-label", `刪除待辦：${todo.text}`);
    deleteButton.title = "刪除待辦事項";

    if (todo.completed) {
      item.classList.add("is-completed");
    }

    item.append(checkbox, text, metadata, deleteButton);
    list.append(item);
  }

  const remaining = todos.filter((todo) => !todo.completed).length;
  const completedCount = todos.length - remaining;
  count.textContent = `${remaining} 項`;
  clearCompletedButton.hidden = completedCount === 0;
  emptyState.hidden = visibleTodos.length > 0;

  if (activeFilter === "active") {
    emptyState.textContent = "目前沒有未完成的待辦事項。";
  } else if (activeFilter === "completed") {
    emptyState.textContent =
      "目前沒有符合「已完成」篩選的事項；項目不會因此刪除，切換至「全部」即可查看其他待辦。";
  } else if (activeFilter === "today") {
    emptyState.textContent = "目前沒有「今天」類型的待辦事項。";
  } else if (activeFilter === "two-weeks") {
    emptyState.textContent = "目前沒有「兩週內」類型的待辦事項。";
  } else {
    emptyState.textContent = "還沒有任何待辦事項，新增一個吧!";
  }

  document.querySelectorAll(".filter-button").forEach((button) => {
    const isActive = button.dataset.filter === activeFilter;
    button.classList.toggle("is-active", isActive);
    button.setAttribute("aria-pressed", String(isActive));
  });

  document.querySelectorAll(".schedule-option").forEach((button) => {
    const isActive = button.dataset.schedule === activeSchedule;
    button.classList.toggle("is-active", isActive);
    button.setAttribute("aria-pressed", String(isActive));
  });
}

document.querySelector(".filter-bar").addEventListener("click", (event) => {
  const button = event.target.closest(".filter-button");
  if (button) {
    activeFilter = button.dataset.filter;
    renderTodos();
  }
});

schedulePicker.addEventListener("click", (event) => {
  const button = event.target.closest(".schedule-option");
  if (button) {
    activeSchedule = button.dataset.schedule;
    renderTodos();
  }
});

clearCompletedButton.addEventListener("click", () => {
  const completedCount = todos.filter((todo) => todo.completed).length;
  if (completedCount === 0) {
    return;
  }

  if (!window.confirm(`確定要清除 ${completedCount} 項已完成的待辦事項嗎？`)) {
    return;
  }

  todos = todos.filter((todo) => !todo.completed);
  saveTodos();
  renderTodos();
});

form.addEventListener("submit", (event) => {
  event.preventDefault();
  const text = input.value.trim();

  if (!text) {
    input.focus();
    return;
  }

  todos.push({
    id: `${Date.now()}-${Math.random().toString(16).slice(2)}`,
    text,
    completed: false,
    schedule: activeSchedule,
    createdAt: getLocalDateString(),
  });
  saveTodos();
  renderTodos();
  form.reset();
  input.focus();
});

list.addEventListener("change", (event) => {
  if (!event.target.matches(".todo-checkbox")) {
    return;
  }

  const item = event.target.closest(".todo-item");
  const todo = todos.find((entry) => entry.id === item.dataset.id);
  if (todo) {
    todo.completed = event.target.checked;
    saveTodos();
    renderTodos();
  }
});

list.addEventListener("click", (event) => {
  if (!event.target.closest(".delete-button")) {
    return;
  }

  const item = event.target.closest(".todo-item");
  todos = todos.filter((todo) => todo.id !== item.dataset.id);
  saveTodos();
  renderTodos();
});

renderTodos();
