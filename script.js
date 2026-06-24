/* ========================================
   KANBAN BOARD — Multi-Board App Logic
   ======================================== */

// --- Data Model ---
let appData = loadAppData();
let activeBoardId = appData.activeBoardId || null;
let currentStatus = '';
let editingTaskId = null;
let editingBoardId = null;
let draggedTask = null;

// --- Persistence ---
function loadAppData() {
    try {
        const raw = localStorage.getItem('kanbanAppData');
        if (raw) return JSON.parse(raw);
    } catch (e) {}

    // Migrate from old single-board format
    const oldTasks = JSON.parse(localStorage.getItem('kanbanTasks')) || [];
    if (oldTasks.length > 0) {
        const board = createBoardObj('My Board', oldTasks);
        localStorage.removeItem('kanbanTasks');
        return { boards: [board], activeBoardId: board.id };
    }

    const defaultBoard = createBoardObj('My Board', []);
    return { boards: [defaultBoard], activeBoardId: defaultBoard.id };
}

function saveAppData() {
    appData.activeBoardId = activeBoardId;
    localStorage.setItem('kanbanAppData', JSON.stringify(appData));
}

function createBoardObj(name, tasks) {
    return {
        id: Date.now().toString(36) + Math.random().toString(36).substr(2, 6),
        name,
        tasks: tasks || [],
        createdAt: Date.now()
    };
}

function getActiveBoard() {
    return appData.boards.find(b => b.id === activeBoardId) || appData.boards[0];
}

// --- Helpers ---
function generateId() {
    return Date.now().toString(36) + Math.random().toString(36).substr(2, 9);
}

function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

function timeAgo(timestamp) {
    const seconds = Math.floor((Date.now() - timestamp) / 1000);
    if (seconds < 60) return 'just now';
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `${minutes}m ago`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h ago`;
    const days = Math.floor(hours / 24);
    return `${days}d ago`;
}

function showToast(message) {
    const existing = document.querySelector('.toast');
    if (existing) existing.remove();
    const toast = document.createElement('div');
    toast.className = 'toast';
    toast.textContent = message;
    document.body.appendChild(toast);
    setTimeout(() => toast.remove(), 3000);
}

function getBoardEmoji(name) {
    const lower = name.toLowerCase();
    if (lower.includes('work') || lower.includes('office')) return '💼';
    if (lower.includes('personal')) return '🏠';
    if (lower.includes('design')) return '🎨';
    if (lower.includes('dev') || lower.includes('code')) return '💻';
    if (lower.includes('marketing')) return '📢';
    if (lower.includes('bug') || lower.includes('fix')) return '🐛';
    if (lower.includes('idea')) return '💡';
    if (lower.includes('learn') || lower.includes('study')) return '📚';
    if (lower.includes('health') || lower.includes('fit')) return '💪';
    if (lower.includes('finance') || lower.includes('money')) return '💰';
    return '📋';
}

// --- Board Management ---
function toggleBoardMenu() {
    const switcher = document.querySelector('.board-switcher');
    switcher.classList.toggle('open');
    if (switcher.classList.contains('open')) {
        renderBoardMenu();
    }
}

function closeBoardMenu() {
    document.querySelector('.board-switcher').classList.remove('open');
}

function renderBoardMenu() {
    const list = document.getElementById('boardMenuList');
    list.innerHTML = appData.boards.map(board => {
        const taskCount = (board.tasks || []).length;
        const isActive = board.id === activeBoardId;
        return `
            <div class="board-menu-item ${isActive ? 'active' : ''}" onclick="switchBoard('${board.id}')">
                <div class="board-item-icon">${getBoardEmoji(board.name)}</div>
                <div class="board-item-info">
                    <div class="board-item-name">${escapeHtml(board.name)}</div>
                    <div class="board-item-count">${taskCount} task${taskCount !== 1 ? 's' : ''}</div>
                </div>
                <div class="board-item-actions">
                    <button class="board-item-action" onclick="event.stopPropagation(); renameBoard('${board.id}')" title="Rename">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                            <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
                            <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
                        </svg>
                    </button>
                    <button class="board-item-action delete-action" onclick="event.stopPropagation(); deleteBoard('${board.id}')" title="Delete">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                            <polyline points="3 6 5 6 21 6"/>
                            <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>
                        </svg>
                    </button>
                </div>
            </div>`;
    }).join('');
}

function switchBoard(id) {
    activeBoardId = id;
    saveAppData();
    updateBoardName();
    renderTasks();
    closeBoardMenu();
    showToast(`Switched to ${getActiveBoard().name}`);
}

function createBoard() {
    editingBoardId = null;
    document.getElementById('boardModalTitle').textContent = 'New Board';
    document.getElementById('boardSaveBtnText').textContent = 'Create Board';
    document.getElementById('boardNameInput').value = '';
    document.getElementById('boardModalOverlay').classList.add('active');
    setTimeout(() => document.getElementById('boardNameInput').focus(), 100);
}

function renameBoard(id) {
    const board = appData.boards.find(b => b.id === id);
    if (!board) return;
    editingBoardId = id;
    document.getElementById('boardModalTitle').textContent = 'Rename Board';
    document.getElementById('boardSaveBtnText').textContent = 'Save';
    document.getElementById('boardNameInput').value = board.name;
    document.getElementById('boardModalOverlay').classList.add('active');
    setTimeout(() => document.getElementById('boardNameInput').focus(), 100);
}

function saveBoardName() {
    const name = document.getElementById('boardNameInput').value.trim();
    if (!name) {
        document.getElementById('boardNameInput').focus();
        return;
    }

    if (editingBoardId) {
        const board = appData.boards.find(b => b.id === editingBoardId);
        if (board) {
            board.name = name;
            showToast('Board renamed');
        }
    } else {
        const newBoard = createBoardObj(name, []);
        appData.boards.push(newBoard);
        activeBoardId = newBoard.id;
        showToast(`Created "${name}"`);
    }

    saveAppData();
    updateBoardName();
    renderTasks();
    closeBoardModal();
}

function deleteBoard(id) {
    if (appData.boards.length <= 1) {
        showToast("Can't delete your only board");
        return;
    }

    const board = appData.boards.find(b => b.id === id);
    if (!board) return;

    if (!confirm(`Delete "${board.name}" and all its tasks?`)) return;

    appData.boards = appData.boards.filter(b => b.id !== id);
    if (activeBoardId === id) {
        activeBoardId = appData.boards[0].id;
    }
    saveAppData();
    updateBoardName();
    renderTasks();
    closeBoardMenu();
    showToast('Board deleted');
}

function closeBoardModal() {
    document.getElementById('boardModalOverlay').classList.remove('active');
    document.getElementById('boardNameInput').value = '';
    editingBoardId = null;
}

function updateBoardName() {
    const board = getActiveBoard();
    document.getElementById('boardCurrentName').textContent = board.name;
}

// --- Task Rendering ---
function renderTasks() {
    const board = getActiveBoard();
    const tasks = board.tasks || [];

    ['todo', 'inprogress', 'done'].forEach(status => {
        const taskList = document.getElementById(status);
        const statusTasks = tasks.filter(t => t.status === status);

        if (statusTasks.length === 0) {
            const emptyMessages = {
                todo: { icon: 'clipboard', title: 'No tasks yet', sub: 'Click "Add Task" to get started' },
                inprogress: { icon: 'clock', title: 'Nothing in progress', sub: 'Drag tasks here to start working' },
                done: { icon: 'check', title: 'No completed tasks', sub: 'Finish tasks to see them here' }
            };
            const msg = emptyMessages[status];
            taskList.innerHTML = `
                <div class="empty-state">
                    ${getEmptyIcon(msg.icon)}
                    <p>${msg.title}</p>
                    <span>${msg.sub}</span>
                </div>`;
        } else {
            taskList.innerHTML = statusTasks.map(task => `
                <div class="task-card" draggable="true" data-id="${task.id}" data-column="${status}">
                    <div class="task-card-actions">
                        <button class="action-btn edit-btn" onclick="editTask('${task.id}')" title="Edit">
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                                <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
                                <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
                            </svg>
                        </button>
                        <button class="action-btn delete-btn" onclick="deleteTask('${task.id}')" title="Delete">
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                                <polyline points="3 6 5 6 21 6"/>
                                <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>
                            </svg>
                        </button>
                    </div>
                    <div class="task-card-title">${escapeHtml(task.title)}</div>
                    ${task.description ? `<div class="task-card-description">${escapeHtml(task.description)}</div>` : ''}
                    <div class="task-card-meta">
                        <span class="task-card-time">${timeAgo(task.createdAt)}</span>
                    </div>
                </div>
            `).join('');
        }

        const countEl = taskList.closest('.column').querySelector('.task-count');
        countEl.textContent = statusTasks.length;

        taskList.querySelectorAll('.task-card').forEach(card => {
            card.addEventListener('dragstart', handleDragStart);
            card.addEventListener('dragend', handleDragEnd);
        });
    });

    document.querySelectorAll('.task-list').forEach(list => {
        list.addEventListener('dragover', handleDragOver);
        list.addEventListener('dragleave', handleDragLeave);
        list.addEventListener('drop', handleDrop);
    });

    updateStats();
}

function getEmptyIcon(type) {
    const icons = {
        clipboard: `<svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"/><line x1="9" y1="9" x2="15" y2="9"/><line x1="9" y1="13" x2="15" y2="13"/><line x1="9" y1="17" x2="12" y2="17"/></svg>`,
        clock: `<svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>`,
        check: `<svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>`
    };
    return icons[type] || icons.clipboard;
}

function updateStats() {
    const board = getActiveBoard();
    const tasks = board.tasks || [];
    const todoCount = tasks.filter(t => t.status === 'todo').length;
    const progressCount = tasks.filter(t => t.status === 'inprogress').length;
    const doneCount = tasks.filter(t => t.status === 'done').length;
    const total = tasks.length;

    document.getElementById('statTodo').textContent = `${total} task${total !== 1 ? 's' : ''}`;
    document.getElementById('statProgress').textContent = `${progressCount} in progress`;
    document.getElementById('statDone').textContent = `${doneCount} done`;
}

// --- Drag & Drop ---
function handleDragStart(e) {
    draggedTask = e.target.closest('.task-card');
    if (!draggedTask) return;
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', draggedTask.dataset.id);
    requestAnimationFrame(() => {
        draggedTask.classList.add('dragging');
    });
}

function handleDragEnd(e) {
    const card = e.target.closest('.task-card');
    if (card) card.classList.remove('dragging');
    document.querySelectorAll('.task-list').forEach(list => {
        list.classList.remove('drag-over');
    });
    draggedTask = null;
}

function handleDragOver(e) {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    e.currentTarget.classList.add('drag-over');
}

function handleDragLeave(e) {
    if (!e.currentTarget.contains(e.relatedTarget)) {
        e.currentTarget.classList.remove('drag-over');
    }
}

function handleDrop(e) {
    e.preventDefault();
    e.currentTarget.classList.remove('drag-over');

    const taskId = e.dataTransfer.getData('text/plain');
    const newStatus = e.currentTarget.id;
    if (!taskId || !newStatus) return;

    const board = getActiveBoard();
    const task = board.tasks.find(t => t.id === taskId);
    if (task && task.status !== newStatus) {
        task.status = newStatus;
        saveAppData();
        renderTasks();
        const statusLabels = { todo: 'To Do', inprogress: 'In Progress', done: 'Done' };
        showToast(`Moved to ${statusLabels[newStatus]}`);
    }
}

// --- Task Modal ---
function openModal(status) {
    currentStatus = status;
    editingTaskId = null;
    document.getElementById('modalTitle').textContent = 'Add New Task';
    document.getElementById('saveBtnText').textContent = 'Add Task';
    document.getElementById('taskInput').value = '';
    document.getElementById('taskDescription').value = '';
    document.getElementById('modalOverlay').classList.add('active');
    setTimeout(() => document.getElementById('taskInput').focus(), 100);
}

function closeModal() {
    document.getElementById('modalOverlay').classList.remove('active');
    document.getElementById('taskInput').value = '';
    document.getElementById('taskDescription').value = '';
    currentStatus = '';
    editingTaskId = null;
    document.getElementById('modalTitle').textContent = 'Add New Task';
    document.getElementById('saveBtnText').textContent = 'Add Task';
}

function saveTask() {
    const title = document.getElementById('taskInput').value.trim();
    const description = document.getElementById('taskDescription').value.trim();
    if (!title) {
        document.getElementById('taskInput').focus();
        return;
    }

    const board = getActiveBoard();

    if (editingTaskId) {
        const task = board.tasks.find(t => t.id === editingTaskId);
        if (task) {
            task.title = title;
            task.description = description;
            showToast('Task updated');
        }
    } else {
        board.tasks.push({
            id: generateId(),
            title,
            description,
            status: currentStatus,
            createdAt: Date.now()
        });
        showToast('Task added');
    }

    saveAppData();
    renderTasks();
    closeModal();
}

function editTask(id) {
    const board = getActiveBoard();
    const task = board.tasks.find(t => t.id === id);
    if (!task) return;

    editingTaskId = id;
    currentStatus = task.status;
    document.getElementById('modalTitle').textContent = 'Edit Task';
    document.getElementById('saveBtnText').textContent = 'Save Changes';
    document.getElementById('taskInput').value = task.title;
    document.getElementById('taskDescription').value = task.description || '';
    document.getElementById('modalOverlay').classList.add('active');
    setTimeout(() => document.getElementById('taskInput').focus(), 100);
}

function deleteTask(id) {
    const board = getActiveBoard();
    const card = document.querySelector(`.task-card[data-id="${id}"]`);
    if (card) {
        card.style.transition = 'all 0.25s ease';
        card.style.opacity = '0';
        card.style.transform = 'translateX(20px) scale(0.95)';
        setTimeout(() => {
            board.tasks = board.tasks.filter(t => t.id !== id);
            saveAppData();
            renderTasks();
            showToast('Task deleted');
        }, 250);
    } else {
        board.tasks = board.tasks.filter(t => t.id !== id);
        saveAppData();
        renderTasks();
    }
}

// --- Events ---
document.getElementById('modalOverlay').addEventListener('click', (e) => {
    if (e.target === e.currentTarget) closeModal();
});

document.getElementById('boardModalOverlay').addEventListener('click', (e) => {
    if (e.target === e.currentTarget) closeBoardModal();
});

document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
        closeModal();
        closeBoardModal();
        closeBoardMenu();
    }
    if (e.key === 'Enter' && !e.shiftKey) {
        if (document.getElementById('modalOverlay').classList.contains('active')) {
            e.preventDefault();
            saveTask();
        }
        if (document.getElementById('boardModalOverlay').classList.contains('active')) {
            e.preventDefault();
            saveBoardName();
        }
    }
});

// Close board menu when clicking outside
document.addEventListener('click', (e) => {
    const switcher = document.querySelector('.board-switcher');
    if (!switcher.contains(e.target)) {
        closeBoardMenu();
    }
});

// --- Init ---
updateBoardName();
renderTasks();
