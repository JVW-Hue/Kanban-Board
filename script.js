/* ========================================
   KANBAN BOARD — App Logic
   ======================================== */

let tasks = JSON.parse(localStorage.getItem('kanbanTasks')) || [];
let currentStatus = '';
let editingTaskId = null;
let draggedTask = null;

// --- Helpers ---
function generateId() {
    return Date.now().toString(36) + Math.random().toString(36).substr(2, 9);
}

function saveTasks() {
    localStorage.setItem('kanbanTasks', JSON.stringify(tasks));
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

// --- Rendering ---
function renderTasks() {
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

        // Update count
        const countEl = taskList.closest('.column').querySelector('.task-count');
        countEl.textContent = statusTasks.length;

        // Attach drag events
        taskList.querySelectorAll('.task-card').forEach(card => {
            card.addEventListener('dragstart', handleDragStart);
            card.addEventListener('dragend', handleDragEnd);
        });
    });

    // Attach drop zone events
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

    const task = tasks.find(t => t.id === taskId);
    if (task && task.status !== newStatus) {
        const oldStatus = task.status;
        task.status = newStatus;
        saveTasks();
        renderTasks();

        const statusLabels = { todo: 'To Do', inprogress: 'In Progress', done: 'Done' };
        showToast(`Moved to ${statusLabels[newStatus]}`);
    }
}

// --- Modal ---
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

    if (editingTaskId) {
        const task = tasks.find(t => t.id === editingTaskId);
        if (task) {
            task.title = title;
            task.description = description;
            showToast('Task updated');
        }
    } else {
        tasks.push({
            id: generateId(),
            title,
            description,
            status: currentStatus,
            createdAt: Date.now()
        });
        showToast('Task added');
    }

    saveTasks();
    renderTasks();
    closeModal();
}

function editTask(id) {
    const task = tasks.find(t => t.id === id);
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
    const task = tasks.find(t => t.id === id);
    if (!task) return;

    const card = document.querySelector(`.task-card[data-id="${id}"]`);
    if (card) {
        card.style.transition = 'all 0.25s ease';
        card.style.opacity = '0';
        card.style.transform = 'translateX(20px) scale(0.95)';
        setTimeout(() => {
            tasks = tasks.filter(t => t.id !== id);
            saveTasks();
            renderTasks();
            showToast('Task deleted');
        }, 250);
    } else {
        tasks = tasks.filter(t => t.id !== id);
        saveTasks();
        renderTasks();
    }
}

// --- Events ---
document.getElementById('modalOverlay').addEventListener('click', (e) => {
    if (e.target === e.currentTarget) closeModal();
});

document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') closeModal();
    if (e.key === 'Enter' && !e.shiftKey && document.getElementById('modalOverlay').classList.contains('active')) {
        e.preventDefault();
        saveTask();
    }
});

// --- Init ---
renderTasks();
