let tasks = JSON.parse(localStorage.getItem('kanbanTasks')) || [];
let currentStatus = '';
let draggedTask = null;

function generateId() {
    return Date.now().toString(36) + Math.random().toString(36).substr(2);
}

function saveTasks() {
    localStorage.setItem('kanbanTasks', JSON.stringify(tasks));
}

function renderTasks() {
    ['todo', 'inprogress', 'done'].forEach(status => {
        const taskList = document.getElementById(status);
        const statusTasks = tasks.filter(t => t.status === status);
        
        taskList.innerHTML = statusTasks.map(task => `
            <div class="task-card" draggable="true" data-id="${task.id}">
                <div class="task-card-actions">
                    <button class="delete-btn" onclick="deleteTask('${task.id}')">&times;</button>
                </div>
                <div class="task-card-title">${escapeHtml(task.title)}</div>
                ${task.description ? `<div class="task-card-description">${escapeHtml(task.description)}</div>` : ''}
            </div>
        `).join('');

        const count = taskList.closest('.column').querySelector('.task-count');
        count.textContent = statusTasks.length;

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
}

function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

function handleDragStart(e) {
    draggedTask = e.target;
    e.target.classList.add('dragging');
    e.dataTransfer.effectAllowed = 'move';
}

function handleDragEnd(e) {
    e.target.classList.remove('dragging');
    document.querySelectorAll('.task-list').forEach(list => {
        list.classList.remove('drag-over');
    });
}

function handleDragOver(e) {
    e.preventDefault();
    e.currentTarget.classList.add('drag-over');
}

function handleDragLeave(e) {
    e.currentTarget.classList.remove('drag-over');
}

function handleDrop(e) {
    e.preventDefault();
    e.currentTarget.classList.remove('drag-over');
    
    const taskId = draggedTask.dataset.id;
    const newStatus = e.currentTarget.id;
    
    const task = tasks.find(t => t.id === taskId);
    if (task) {
        task.status = newStatus;
        saveTasks();
        renderTasks();
    }
}

function openModal(status) {
    currentStatus = status;
    document.getElementById('modalOverlay').classList.add('active');
    document.getElementById('taskInput').focus();
}

function closeModal() {
    document.getElementById('modalOverlay').classList.remove('active');
    document.getElementById('taskInput').value = '';
    document.getElementById('taskDescription').value = '';
    currentStatus = '';
}

function addTask() {
    const title = document.getElementById('taskInput').value.trim();
    const description = document.getElementById('taskDescription').value.trim();
    
    if (!title) return;
    
    tasks.push({
        id: generateId(),
        title,
        description,
        status: currentStatus
    });
    
    saveTasks();
    renderTasks();
    closeModal();
}

function deleteTask(id) {
    tasks = tasks.filter(t => t.id !== id);
    saveTasks();
    renderTasks();
}

document.getElementById('modalOverlay').addEventListener('click', (e) => {
    if (e.target === e.currentTarget) closeModal();
});

document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') closeModal();
    if (e.key === 'Enter' && document.getElementById('modalOverlay').classList.contains('active')) {
        addTask();
    }
});

renderTasks();
