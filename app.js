const STORAGE_KEY = "offline-todo-list";
const THEME_STORAGE_KEY = "offline-todo-theme";

const form = document.querySelector("#todo-form");
const input = document.querySelector("#todo-input");
const list = document.querySelector("#todo-list");
const emptyState = document.querySelector("#empty-state");
const count = document.querySelector("#todo-count");
const themeToggle = document.querySelector("#theme-toggle");
const themeIcon = document.querySelector("#theme-icon");
const themeLabel = document.querySelector("#theme-label");
const systemTheme = window.matchMedia("(prefers-color-scheme: dark)");

let activeFilter = "all";

function loadThemePreference() {
  try {
    const preference = localStorage.getItem(THEME_STORAGE_KEY);
    return preference === "dark" || preference === "light" ? preference : null;
  } catch {
    return null;
  }
}

function applyTheme(theme, isManual = true) {
  if (isManual) {
    document.documentElement.dataset.theme = theme;
  } else {
    delete document.documentElement.dataset.theme;
  }
  const isDark = theme === "dark";
  themeToggle.setAttribute("aria-pressed", String(isDark));
  themeIcon.textContent = isDark ? "☀️" : "🌙";
  themeLabel.textContent = isDark ? "淺色模式" : "深色模式";
}

const savedTheme = loadThemePreference();
let hasManualTheme = savedTheme !== null;
applyTheme(
  savedTheme || (systemTheme.matches ? "dark" : "light"),
  hasManualTheme,
);

systemTheme.addEventListener("change", (event) => {
  if (!hasManualTheme) {
    applyTheme(event.matches ? "dark" : "light", false);
  }
});

themeToggle.addEventListener("click", () => {
  const nextTheme =
    document.documentElement.dataset.theme === "dark" ? "light" : "dark";
  hasManualTheme = true;
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
          .map((todo) => ({
            id: String(todo.id),
            text: todo.text,
            completed: Boolean(todo.completed),
          }))
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

    const deleteButton = document.createElement("button");
    deleteButton.className = "delete-button";
    deleteButton.type = "button";
    deleteButton.textContent = "×";
    deleteButton.setAttribute("aria-label", `刪除待辦：${todo.text}`);
    deleteButton.title = "刪除待辦事項";

    if (todo.completed) {
      item.classList.add("is-completed");
    }

    item.append(checkbox, text, deleteButton);
    list.append(item);
  }

  const remaining = todos.filter((todo) => !todo.completed).length;
  count.textContent = `${remaining} 項`;
  emptyState.hidden = visibleTodos.length > 0;

  if (activeFilter === "active") {
    emptyState.textContent = "目前沒有未完成的待辦事項。";
  } else if (activeFilter === "completed") {
    emptyState.textContent = "目前沒有已完成的待辦事項。";
  } else {
    emptyState.textContent = "還沒有任何待辦事項，新增一個吧!";
  }

  document.querySelectorAll(".filter-button").forEach((button) => {
    const isActive = button.dataset.filter === activeFilter;
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
