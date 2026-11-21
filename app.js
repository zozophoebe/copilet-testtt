const STORAGE_KEY = "offline-todo-list";

const form = document.querySelector("#todo-form");
const input = document.querySelector("#todo-input");
const list = document.querySelector("#todo-list");
const emptyState = document.querySelector("#empty-state");
const count = document.querySelector("#todo-count");

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

  for (const todo of todos) {
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
  emptyState.hidden = todos.length > 0;
}

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
