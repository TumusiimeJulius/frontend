const DEFAULT_BOARDS = [
  {
    id: "b1",
    name: "Product Sprint",
    lists: [
      {
        id: "l1",
        title: "To Do",
        cards: [
          {
            id: "c1",
            title: "Wireframe onboarding",
            description: "Draft initial mobile + desktop onboarding screens.",
            dueDate: "2026-04-04",
            priority: "high",
            assignee: "Alice",
          },
          {
            id: "c2",
            title: "API checklist",
            description: "Confirm endpoints needed for MVP drag/drop.",
            dueDate: "2026-04-07",
            priority: "medium",
            assignee: "Tom",
          },
        ],
      },
      {
        id: "l2",
        title: "In Progress",
        cards: [
          {
            id: "c3",
            title: "Board UI polish",
            description: "Improve spacing and task metadata readability.",
            dueDate: "2026-04-03",
            priority: "medium",
            assignee: "Nina",
          },
        ],
      },
      {
        id: "l3",
        title: "Done",
        cards: [
          {
            id: "c4",
            title: "Project setup",
            description: "Create base structure and reusable modal.",
            dueDate: "2026-03-29",
            priority: "low",
            assignee: "Sam",
          },
        ],
      },
    ],
  },
  {
    id: "b2",
    name: "Personal Tasks",
    lists: [
      { id: "l4", title: "Backlog", cards: [] },
      { id: "l5", title: "Doing", cards: [] },
    ],
  },
];

const state = {
  theme: "light",
  look: "startup",
  activeBoardId: "b1",
  search: "",
  boards: cloneDefaultBoards(),
  modal: {
    mode: null,
    targetBoardId: null,
    targetListId: null,
    targetCardId: null,
  },
  drag: {
    cardId: null,
    fromListId: null,
  },
};

let persistTimer = null;
const STORAGE_KEY = "kanban_app_state_v1";
const AUTH_SESSION_KEY = "kanban_auth_session_v1";
const LOOK_KEY = "kanban_visual_look_v1";

const els = {
  body: document.body,
  sidebar: document.getElementById("sidebar"),
  boardList: document.getElementById("boardList"),
  boardTitle: document.getElementById("boardTitle"),
  listsContainer: document.getElementById("listsContainer"),
  addListBtn: document.getElementById("addListBtn"),
  newBoardBtn: document.getElementById("newBoardBtn"),
  settingsBtn: document.getElementById("settingsBtn"),
  themeBtn: document.getElementById("themeBtn"),
  logoutBtn: document.getElementById("logoutBtn"),
  lookSelect: document.getElementById("lookSelect"),
  toggleSidebar: document.getElementById("toggleSidebar"),
  searchInput: document.getElementById("searchInput"),
  modalBackdrop: document.getElementById("modalBackdrop"),
  closeModalBtn: document.getElementById("closeModalBtn"),
  modalTitle: document.getElementById("modalTitle"),
  entityForm: document.getElementById("entityForm"),
  deleteBtn: document.getElementById("deleteBtn"),
  fieldName: document.getElementById("fieldName"),
  fieldDescription: document.getElementById("fieldDescription"),
  fieldDueDate: document.getElementById("fieldDueDate"),
  fieldPriority: document.getElementById("fieldPriority"),
  fieldAssignee: document.getElementById("fieldAssignee"),
  descriptionFieldWrap: document.getElementById("descriptionFieldWrap"),
  dueDateFieldWrap: document.getElementById("dueDateFieldWrap"),
  priorityFieldWrap: document.getElementById("priorityFieldWrap"),
  assigneeFieldWrap: document.getElementById("assigneeFieldWrap"),
};

function cloneDefaultBoards() {
  return JSON.parse(JSON.stringify(DEFAULT_BOARDS));
}

function uid(prefix) {
  return `${prefix}_${Math.random().toString(36).slice(2, 8)}`;
}

function getSerializableState() {
  return {
    theme: state.theme,
    activeBoardId: state.activeBoardId,
    boards: state.boards,
  };
}

function getStoredLook() {
  const look = localStorage.getItem(LOOK_KEY);
  if (look === "enterprise" || look === "startup" || look === "darkfirst") return look;
  return "startup";
}

function applyLook() {
  document.body.setAttribute("data-look", state.look);
  if (els.lookSelect) els.lookSelect.value = state.look;
  localStorage.setItem(LOOK_KEY, state.look);
}

function setLook(nextLook) {
  if (nextLook !== "enterprise" && nextLook !== "startup" && nextLook !== "darkfirst") return;
  state.look = nextLook;
  if (state.look === "darkfirst") state.theme = "dark";
  applyLook();
  applyTheme();
}

function setDefaults() {
  state.boards = cloneDefaultBoards();
  state.theme = "light";
  state.activeBoardId = state.boards[0].id;
}

function applyPersistedState(payload) {
  if (!payload || !Array.isArray(payload.boards) || payload.boards.length === 0) return false;
  state.boards = payload.boards;
  state.theme = payload.theme === "dark" ? "dark" : "light";
  const hasActiveBoard = payload.activeBoardId && payload.boards.some((board) => board.id === payload.activeBoardId);
  state.activeBoardId = hasActiveBoard ? payload.activeBoardId : payload.boards[0].id;
  return true;
}

function loadStateFromLocalStorage() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      setDefaults();
      return;
    }
    const payload = JSON.parse(raw);
    if (!applyPersistedState(payload)) setDefaults();
  } catch (error) {
    setDefaults();
    console.warn("Failed to read localStorage state. Using defaults.", error);
  }
}

function saveStateToLocalStorage() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(getSerializableState()));
  } catch (error) {
    console.warn("Failed to persist state to localStorage.", error);
  }
}

function schedulePersist() {
  clearTimeout(persistTimer);
  persistTimer = setTimeout(() => {
    saveStateToLocalStorage();
  }, 250);
}

function getActiveBoard() {
  return state.boards.find((board) => board.id === state.activeBoardId);
}

function applyTheme() {
  const dark = state.look === "darkfirst" ? true : state.theme === "dark";
  els.body.classList.toggle("dark", dark);
  if (state.look === "darkfirst") {
    els.themeBtn.textContent = "Dark Fixed";
    els.themeBtn.disabled = true;
  } else {
    els.themeBtn.disabled = false;
    els.themeBtn.textContent = dark ? "Light Mode" : "Dark Mode";
  }
}

function renderBoards() {
  els.boardList.innerHTML = "";
  state.boards.forEach((board) => {
    const row = document.createElement("div");
    row.className = "board-row";

    const selectBtn = document.createElement("button");
    selectBtn.className = `board-item ${board.id === state.activeBoardId ? "active" : ""}`;
    selectBtn.textContent = board.name;
    selectBtn.addEventListener("click", () => {
      state.activeBoardId = board.id;
      render();
      schedulePersist();
    });

    const deleteBtn = document.createElement("button");
    deleteBtn.className = "board-delete-btn";
    deleteBtn.type = "button";
    deleteBtn.textContent = "Delete";
    deleteBtn.disabled = state.boards.length === 1;
    deleteBtn.title = state.boards.length === 1 ? "At least one board is required" : `Delete ${board.name}`;
    deleteBtn.addEventListener("click", () => deleteBoardWithConfirmation(board.id));

    row.appendChild(selectBtn);
    row.appendChild(deleteBtn);
    els.boardList.appendChild(row);
  });
}

function getVisibleCards(cards) {
  const q = state.search.trim().toLowerCase();
  if (!q) return cards;
  return cards.filter((card) => {
    return (
      card.title.toLowerCase().includes(q) ||
      (card.description || "").toLowerCase().includes(q) ||
      (card.assignee || "").toLowerCase().includes(q)
    );
  });
}

function renderLists() {
  const board = getActiveBoard();
  els.boardTitle.textContent = board?.name || "Board";
  els.listsContainer.innerHTML = "";
  if (!board) return;

  board.lists.forEach((list) => {
    const col = document.createElement("article");
    col.className = "list-column";
    col.dataset.listId = list.id;

    const head = document.createElement("div");
    head.className = "list-head";
    head.innerHTML = `
      <span class="list-title">${list.title}</span>
      <button class="icon-btn edit-list" aria-label="Edit list">Edit</button>
    `;

    const cardsWrap = document.createElement("div");
    cardsWrap.className = "cards";
    cardsWrap.dataset.listId = list.id;
    cardsWrap.addEventListener("dragover", (e) => handleDragOver(e, list.id));
    cardsWrap.addEventListener("drop", () => handleDrop(list.id, null));

    const visibleCards = getVisibleCards(list.cards);
    visibleCards.forEach((card) => {
      const cardEl = document.createElement("article");
      cardEl.className = "card";
      cardEl.draggable = true;
      cardEl.dataset.cardId = card.id;
      cardEl.dataset.listId = list.id;
      cardEl.innerHTML = `
        <h4>${card.title}</h4>
        <p>${card.description || ""}</p>
        <div class="meta">
          <span class="pill ${card.priority}">${card.priority}</span>
          <span>${card.dueDate || "No due date"}</span>
        </div>
      `;
      cardEl.addEventListener("click", () => openModal("edit-card", { listId: list.id, cardId: card.id }));
      cardEl.addEventListener("dragstart", () => {
        state.drag.cardId = card.id;
        state.drag.fromListId = list.id;
        cardEl.classList.add("dragging");
      });
      cardEl.addEventListener("dragend", () => {
        cardEl.classList.remove("dragging");
      });
      cardEl.addEventListener("dragover", (e) => handleDragOver(e, list.id));
      cardEl.addEventListener("drop", (e) => {
        e.stopPropagation();
        handleDrop(list.id, card.id);
      });
      cardsWrap.appendChild(cardEl);
    });

    const foot = document.createElement("div");
    foot.className = "list-footer";
    foot.innerHTML = `<button class="ghost-btn full add-card">+ Add Card</button>`;

    col.appendChild(head);
    col.appendChild(cardsWrap);
    col.appendChild(foot);
    els.listsContainer.appendChild(col);

    head.querySelector(".edit-list").addEventListener("click", () => openModal("edit-list", { listId: list.id }));
    foot.querySelector(".add-card").addEventListener("click", () => openModal("new-card", { listId: list.id }));
  });
}

function handleDragOver(event, listId) {
  event.preventDefault();
  if (!state.drag.cardId) return;
  const list = getActiveBoard().lists.find((l) => l.id === listId);
  if (!list) return;
}

function handleDrop(targetListId, beforeCardId) {
  const { cardId, fromListId } = state.drag;
  if (!cardId || !fromListId) return;
  const board = getActiveBoard();
  const fromList = board.lists.find((list) => list.id === fromListId);
  const toList = board.lists.find((list) => list.id === targetListId);
  if (!fromList || !toList) return;

  const oldIndex = fromList.cards.findIndex((c) => c.id === cardId);
  if (oldIndex === -1) return;
  const [card] = fromList.cards.splice(oldIndex, 1);

  const destinationIndex = beforeCardId
    ? toList.cards.findIndex((c) => c.id === beforeCardId)
    : toList.cards.length;

  if (destinationIndex < 0) {
    toList.cards.push(card);
  } else {
    toList.cards.splice(destinationIndex, 0, card);
  }

  state.drag.cardId = null;
  state.drag.fromListId = null;
  renderLists();
  schedulePersist();
}

function resetForm() {
  els.fieldName.value = "";
  els.fieldDescription.value = "";
  els.fieldDueDate.value = "";
  els.fieldPriority.value = "low";
  els.fieldAssignee.value = "";
}

function showFields({ description, dueDate, priority, assignee }) {
  els.descriptionFieldWrap.classList.toggle("hidden", !description);
  els.dueDateFieldWrap.classList.toggle("hidden", !dueDate);
  els.priorityFieldWrap.classList.toggle("hidden", !priority);
  els.assigneeFieldWrap.classList.toggle("hidden", !assignee);
}

function openModal(mode, payload = {}) {
  state.modal = {
    mode,
    targetBoardId: state.activeBoardId,
    targetListId: payload.listId || null,
    targetCardId: payload.cardId || null,
  };
  resetForm();
  els.deleteBtn.classList.add("hidden");

  if (mode === "new-board") {
    els.modalTitle.textContent = "New Board";
    showFields({ description: false, dueDate: false, priority: false, assignee: false });
  }

  if (mode === "new-list") {
    els.modalTitle.textContent = "New List";
    showFields({ description: false, dueDate: false, priority: false, assignee: false });
  }

  if (mode === "new-card") {
    els.modalTitle.textContent = "New Task";
    showFields({ description: true, dueDate: true, priority: true, assignee: true });
  }

  if (mode === "edit-list") {
    const list = getActiveBoard().lists.find((l) => l.id === payload.listId);
    if (!list) return;
    els.modalTitle.textContent = "Edit List";
    els.fieldName.value = list.title;
    els.deleteBtn.classList.remove("hidden");
    showFields({ description: false, dueDate: false, priority: false, assignee: false });
  }

  if (mode === "edit-card") {
    const list = getActiveBoard().lists.find((l) => l.id === payload.listId);
    const card = list?.cards.find((c) => c.id === payload.cardId);
    if (!card) return;
    els.modalTitle.textContent = "Edit Task";
    els.fieldName.value = card.title || "";
    els.fieldDescription.value = card.description || "";
    els.fieldDueDate.value = card.dueDate || "";
    els.fieldPriority.value = card.priority || "low";
    els.fieldAssignee.value = card.assignee || "";
    els.deleteBtn.classList.remove("hidden");
    showFields({ description: true, dueDate: true, priority: true, assignee: true });
  }

  els.modalBackdrop.classList.remove("hidden");
}

function closeModal() {
  els.modalBackdrop.classList.add("hidden");
  state.modal = { mode: null, targetBoardId: null, targetListId: null, targetCardId: null };
}

function submitModal(event) {
  event.preventDefault();
  const board = getActiveBoard();
  const name = els.fieldName.value.trim();
  if (!name) return;
  if (state.modal.mode !== "new-board" && !board) return;

  if (state.modal.mode === "new-board") {
    const boardId = uid("b");
    state.boards.push({ id: boardId, name, lists: [] });
    state.activeBoardId = boardId;
  }

  if (state.modal.mode === "new-list") {
    board.lists.push({ id: uid("l"), title: name, cards: [] });
  }

  if (state.modal.mode === "new-card") {
    const list = board.lists.find((l) => l.id === state.modal.targetListId);
    if (!list) return;
    list.cards.push({
      id: uid("c"),
      title: name,
      description: els.fieldDescription.value.trim(),
      dueDate: els.fieldDueDate.value,
      priority: els.fieldPriority.value,
      assignee: els.fieldAssignee.value.trim(),
    });
  }

  if (state.modal.mode === "edit-list") {
    const list = board.lists.find((l) => l.id === state.modal.targetListId);
    if (!list) return;
    list.title = name;
  }

  if (state.modal.mode === "edit-card") {
    const list = board.lists.find((l) => l.id === state.modal.targetListId);
    const card = list?.cards.find((c) => c.id === state.modal.targetCardId);
    if (!card) return;
    card.title = name;
    card.description = els.fieldDescription.value.trim();
    card.dueDate = els.fieldDueDate.value;
    card.priority = els.fieldPriority.value;
    card.assignee = els.fieldAssignee.value.trim();
  }

  closeModal();
  render();
  schedulePersist();
}

function deleteEntity() {
  const board = getActiveBoard();
  if (state.modal.mode === "edit-list") {
    if (!board) return;
    const list = board.lists.find((l) => l.id === state.modal.targetListId);
    if (!list) return;
    const confirmDelete = window.confirm(
      `Delete list "${list.title}" and all cards in it? This action cannot be undone.`,
    );
    if (!confirmDelete) return;
    const index = board.lists.findIndex((l) => l.id === state.modal.targetListId);
    if (index !== -1) board.lists.splice(index, 1);
  }

  if (state.modal.mode === "edit-card") {
    if (!board) return;
    const list = board.lists.find((l) => l.id === state.modal.targetListId);
    if (!list) return;
    const index = list.cards.findIndex((c) => c.id === state.modal.targetCardId);
    if (index !== -1) list.cards.splice(index, 1);
  }

  closeModal();
  render();
  schedulePersist();
}

function deleteBoardWithConfirmation(boardId) {
  if (state.boards.length === 1) {
    window.alert("You need at least one board.");
    return;
  }

  const board = state.boards.find((item) => item.id === boardId);
  if (!board) return;
  const listCount = board.lists.length;
  const taskCount = board.lists.reduce((acc, list) => acc + list.cards.length, 0);
  const confirmDelete = window.confirm(
    `Delete board "${board.name}" with ${listCount} list(s) and ${taskCount} task(s)? This action cannot be undone.`,
  );
  if (!confirmDelete) return;

  state.boards = state.boards.filter((item) => item.id !== boardId);
  if (state.activeBoardId === boardId) {
    state.activeBoardId = state.boards[0]?.id || null;
  }
  render();
  schedulePersist();
}

function render() {
  renderBoards();
  renderLists();
  els.addListBtn.disabled = !getActiveBoard();
  applyTheme();
}

els.newBoardBtn.addEventListener("click", () => openModal("new-board"));
els.addListBtn.addEventListener("click", () => openModal("new-list"));
els.themeBtn.addEventListener("click", () => {
  if (state.look === "darkfirst") return;
  state.theme = state.theme === "dark" ? "light" : "dark";
  applyTheme();
  schedulePersist();
});
els.lookSelect.addEventListener("change", (event) => {
  setLook(event.target.value);
});
els.settingsBtn.addEventListener("click", () => {
  window.alert("Use Workspace Look selector: Enterprise, Startup, or Dark-Mode-First.");
});
els.logoutBtn.addEventListener("click", () => {
  localStorage.removeItem(AUTH_SESSION_KEY);
  window.location.replace("./index.html");
});
els.toggleSidebar.addEventListener("click", () => {
  els.sidebar.classList.toggle("collapsed");
});
els.searchInput.addEventListener("input", (e) => {
  state.search = e.target.value;
  renderLists();
});
els.closeModalBtn.addEventListener("click", closeModal);
els.modalBackdrop.addEventListener("click", (e) => {
  if (e.target === els.modalBackdrop) closeModal();
});
els.entityForm.addEventListener("submit", submitModal);
els.deleteBtn.addEventListener("click", deleteEntity);

function init() {
  const session = localStorage.getItem(AUTH_SESSION_KEY);
  if (!session) {
    window.location.replace("./index.html");
    return;
  }
  state.look = getStoredLook();
  applyLook();
  loadStateFromLocalStorage();
  render();
}

init();
