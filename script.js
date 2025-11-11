// ============================================
// TASK PLANNER PRO - MAIN JAVASCRIPT
// ============================================

class TaskPlanner {
    constructor() {
        this.tasks = this.loadTasks();
        this.editingTaskId = null;
        this.draggedElement = null;
        
        this.initializeElements();
        this.attachEventListeners();
        this.renderTasks();
        this.updateStats();
        this.initializeTheme();
        this.registerServiceWorker();
        this.setMinDate();
    }

    // ============================================
    // INITIALIZATION
    // ============================================
    initializeElements() {
        this.form = document.getElementById('taskForm');
        this.tasksList = document.getElementById('tasksList');
        this.emptyState = document.getElementById('emptyState');
        this.themeToggle = document.querySelector('.theme-toggle');
        
        // Form inputs
        this.titleInput = document.getElementById('taskTitle');
        this.categoryInput = document.getElementById('taskCategory');
        this.priorityInput = document.getElementById('taskPriority');
        this.dateInput = document.getElementById('taskDate');
        this.descriptionInput = document.getElementById('taskDescription');
        
        // Buttons
        this.submitBtn = document.getElementById('submitBtnText');
        this.cancelBtn = document.getElementById('cancelEdit');
        this.clearAllBtn = document.getElementById('clearAll');
        
        // Filters
        this.filterCategory = document.getElementById('filterCategory');
        this.filterPriority = document.getElementById('filterPriority');
        this.filterStatus = document.getElementById('filterStatus');
        this.sortBy = document.getElementById('sortBy');
        
        // Stats
        this.totalTasksEl = document.getElementById('totalTasks');
        this.completedTasksEl = document.getElementById('completedTasks');
        this.pendingTasksEl = document.getElementById('pendingTasks');
    }

    attachEventListeners() {
        // Form submission
        this.form.addEventListener('submit', (e) => this.handleFormSubmit(e));
        
        // Cancel edit
        this.cancelBtn.addEventListener('click', () => this.cancelEdit());
        
        // Clear all tasks
        this.clearAllBtn.addEventListener('click', () => this.clearAllTasks());
        
        // Theme toggle
        this.themeToggle.addEventListener('click', () => this.toggleTheme());
        
        // Filters and sorting
        this.filterCategory.addEventListener('change', () => this.renderTasks());
        this.filterPriority.addEventListener('change', () => this.renderTasks());
        this.filterStatus.addEventListener('change', () => this.renderTasks());
        this.sortBy.addEventListener('change', () => this.renderTasks());
    }

    setMinDate() {
        const today = new Date().toISOString().split('T')[0];
        this.dateInput.setAttribute('min', today);
    }

    // ============================================
    // TASK MANAGEMENT
    // ============================================
    handleFormSubmit(e) {
        e.preventDefault();
        
        const taskData = {
            title: this.titleInput.value.trim(),
            category: this.categoryInput.value,
            priority: this.priorityInput.value,
            dueDate: this.dateInput.value,
            description: this.descriptionInput.value.trim(),
        };

        if (this.editingTaskId) {
            this.updateTask(this.editingTaskId, taskData);
            this.showToast('Task updated successfully!', 'success');
        } else {
            this.addTask(taskData);
            this.showToast('Task added successfully!', 'success');
        }

        this.form.reset();
        this.cancelEdit();
        this.renderTasks();
        this.updateStats();
    }

    addTask(taskData) {
        const task = {
            id: Date.now().toString(),
            ...taskData,
            completed: false,
            createdAt: new Date().toISOString(),
        };
        
        this.tasks.push(task);
        this.saveTasks();
    }

    updateTask(id, taskData) {
        const taskIndex = this.tasks.findIndex(task => task.id === id);
        if (taskIndex !== -1) {
            this.tasks[taskIndex] = {
                ...this.tasks[taskIndex],
                ...taskData,
                updatedAt: new Date().toISOString(),
            };
            this.saveTasks();
        }
    }

    deleteTask(id) {
        if (confirm('Are you sure you want to delete this task?')) {
            this.tasks = this.tasks.filter(task => task.id !== id);
            this.saveTasks();
            this.renderTasks();
            this.updateStats();
            this.showToast('Task deleted successfully!', 'success');
        }
    }

    toggleTaskComplete(id) {
        const task = this.tasks.find(task => task.id === id);
        if (task) {
            task.completed = !task.completed;
            task.completedAt = task.completed ? new Date().toISOString() : null;
            this.saveTasks();
            this.renderTasks();
            this.updateStats();
            
            const message = task.completed ? 
                '✅ Task completed!' : 
                '🔄 Task marked as pending';
            this.showToast(message, 'success');
        }
    }

    editTask(id) {
        const task = this.tasks.find(task => task.id === id);
        if (task) {
            this.editingTaskId = id;
            this.titleInput.value = task.title;
            this.categoryInput.value = task.category;
            this.priorityInput.value = task.priority;
            this.dateInput.value = task.dueDate;
            this.descriptionInput.value = task.description || '';
            
            this.submitBtn.textContent = 'Update Task';
            this.cancelBtn.style.display = 'inline-flex';
            
            // Scroll to form
            this.form.scrollIntoView({ behavior: 'smooth', block: 'center' });
            this.titleInput.focus();
        }
    }

    cancelEdit() {
        this.editingTaskId = null;
        this.submitBtn.textContent = 'Add Task';
        this.cancelBtn.style.display = 'none';
        this.form.reset();
    }

    clearAllTasks() {
        if (confirm('Are you sure you want to delete ALL tasks? This cannot be undone!')) {
            this.tasks = [];
            this.saveTasks();
            this.renderTasks();
            this.updateStats();
            this.showToast('All tasks cleared!', 'success');
        }
    }

    // ============================================
    // RENDERING
    // ============================================
    renderTasks() {
        const filteredTasks = this.getFilteredAndSortedTasks();
        
        if (filteredTasks.length === 0) {
            this.tasksList.style.display = 'none';
            this.emptyState.classList.add('show');
            return;
        }

        this.tasksList.style.display = 'grid';
        this.emptyState.classList.remove('show');
        
        this.tasksList.innerHTML = filteredTasks.map(task => this.createTaskCard(task)).join('');
        
        // Attach event listeners to task cards
        this.attachTaskEventListeners();
    }

    createTaskCard(task) {
        const isOverdue = new Date(task.dueDate) < new Date() && !task.completed;
        const categoryEmojis = {
            work: '💼',
            personal: '👤',
            shopping: '🛒',
            health: '💪',
            education: '📚',
            other: '📌'
        };

        return `
            <div class="task-card priority-${task.priority} ${task.completed ? 'completed' : ''}" 
                 data-id="${task.id}"
                 draggable="true">
                <div class="task-header">
                    <h3 class="task-title">${this.escapeHtml(task.title)}</h3>
                    <input 
                        type="checkbox" 
                        class="task-checkbox" 
                        ${task.completed ? 'checked' : ''}
                        aria-label="Mark task as ${task.completed ? 'incomplete' : 'complete'}"
                    >
                </div>
                
                <div class="task-meta">
                    <span class="task-badge badge-category">
                        ${categoryEmojis[task.category]} ${task.category}
                    </span>
                    <span class="task-badge badge-priority ${task.priority}">
                        ${task.priority} priority
                    </span>
                    <span class="task-badge badge-date ${isOverdue ? 'overdue' : ''}">
                        <i class="fas fa-calendar"></i>
                        ${this.formatDate(task.dueDate)}
                        ${isOverdue ? ' (Overdue)' : ''}
                    </span>
                </div>
                
                ${task.description ? `
                    <p class="task-description">${this.escapeHtml(task.description)}</p>
                ` : ''}
                
                <div class="task-actions">
                    <button class="task-btn edit" aria-label="Edit task">
                        <i class="fas fa-edit"></i> Edit
                    </button>
                    <button class="task-btn delete" aria-label="Delete task">
                        <i class="fas fa-trash"></i> Delete
                    </button>
                </div>
            </div>
        `;
    }

    attachTaskEventListeners() {
        document.querySelectorAll('.task-card').forEach(card => {
            const id = card.dataset.id;
            
            // Checkbox toggle
            const checkbox = card.querySelector('.task-checkbox');
            checkbox.addEventListener('change', () => this.toggleTaskComplete(id));
            
            // Edit button
            const editBtn = card.querySelector('.edit');
            editBtn.addEventListener('click', () => this.editTask(id));
            
            // Delete button
            const deleteBtn = card.querySelector('.delete');
            deleteBtn.addEventListener('click', () => this.deleteTask(id));
            
            // Drag and drop
            card.addEventListener('dragstart', (e) => this.handleDragStart(e));
            card.addEventListener('dragend', (e) => this.handleDragEnd(e));
            card.addEventListener('dragover', (e) => this.handleDragOver(e));
            card.addEventListener('drop', (e) => this.handleDrop(e));
        });
    }

    // ============================================
    // DRAG AND DROP
    // ============================================
    handleDragStart(e) {
        this.draggedElement = e.currentTarget;
        e.currentTarget.classList.add('dragging');
        e.dataTransfer.effectAllowed = 'move';
    }

    handleDragEnd(e) {
        e.currentTarget.classList.remove('dragging');
        this.draggedElement = null;
    }

    handleDragOver(e) {
        e.preventDefault();
        e.dataTransfer.dropEffect = 'move';
        
        const afterElement = this.getDragAfterElement(e.clientY);
        const draggable = this.draggedElement;
        
        if (afterElement == null) {
            this.tasksList.appendChild(draggable);
        } else {
            this.tasksList.insertBefore(draggable, afterElement);
        }
    }

    handleDrop(e) {
        e.preventDefault();
        this.reorderTasks();
    }

    getDragAfterElement(y) {
        const draggableElements = [...this.tasksList.querySelectorAll('.task-card:not(.dragging)')];
        
        return draggableElements.reduce((closest, child) => {
            const box = child.getBoundingClientRect();
            const offset = y - box.top - box.height / 2;
            
            if (offset < 0 && offset > closest.offset) {
                return { offset: offset, element: child };
            } else {
                return closest;
            }
        }, { offset: Number.NEGATIVE_INFINITY }).element;
    }

    reorderTasks() {
        const taskCards = [...this.tasksList.querySelectorAll('.task-card')];
        const newOrder = taskCards.map(card => card.dataset.id);
        
        this.tasks.sort((a, b) => {
            return newOrder.indexOf(a.id) - newOrder.indexOf(b.id);
        });
        
        this.saveTasks();
        this.showToast('Tasks reordered!', 'success');
    }

    // ============================================
    // FILTERING AND SORTING
    // ============================================
    getFilteredAndSortedTasks() {
        let filtered = [...this.tasks];
        
        // Filter by category
        if (this.filterCategory.value !== 'all') {
            filtered = filtered.filter(task => task.category === this.filterCategory.value);
        }
        
        // Filter by priority
        if (this.filterPriority.value !== 'all') {
            filtered = filtered.filter(task => task.priority === this.filterPriority.value);
        }
        
        // Filter by status
        if (this.filterStatus.value === 'completed') {
            filtered = filtered.filter(task => task.completed);
        } else if (this.filterStatus.value === 'pending') {
            filtered = filtered.filter(task => !task.completed);
        }
        
        // Sort
        filtered.sort((a, b) => {
            switch (this.sortBy.value) {
                case 'date-asc':
                    return new Date(a.dueDate) - new Date(b.dueDate);
                case 'date-desc':
                    return new Date(b.dueDate) - new Date(a.dueDate);
                case 'priority-high':
                    const priorityOrder = { high: 3, medium: 2, low: 1 };
                    return priorityOrder[b.priority] - priorityOrder[a.priority];
                case 'priority-low':
                    const priorityOrderLow = { high: 1, medium: 2, low: 3 };
                    return priorityOrderLow[b.priority] - priorityOrderLow[a.priority];
                case 'title':
                    return a.title.localeCompare(b.title);
                default:
                    return 0;
            }
        });
        
        return filtered;
    }

    // ============================================
    // STATISTICS
    // ============================================
    updateStats() {
        const total = this.tasks.length;
        const completed = this.tasks.filter(task => task.completed).length;
        const pending = total - completed;
        
        this.animateNumber(this.totalTasksEl, total);
        this.animateNumber(this.completedTasksEl, completed);
        this.animateNumber(this.pendingTasksEl, pending);
    }

    animateNumber(element, target) {
        const current = parseInt(element.textContent) || 0;
        const increment = target > current ? 1 : -1;
        const duration = 300;
        const steps = Math.abs(target - current);
        const stepDuration = steps > 0 ? duration / steps : 0;
        
        let count = current;
        const timer = setInterval(() => {
            count += increment;
            element.textContent = count;
            
            if (count === target) {
                clearInterval(timer);
            }
        }, stepDuration);
    }

    // ============================================
    // THEME
    // ============================================
    initializeTheme() {
        const savedTheme = localStorage.getItem('theme') || 'light';
        document.documentElement.setAttribute('data-theme', savedTheme);
        this.updateThemeIcon(savedTheme);
    }

    toggleTheme() {
        const currentTheme = document.documentElement.getAttribute('data-theme');
        const newTheme = currentTheme === 'light' ? 'dark' : 'light';
        
        document.documentElement.setAttribute('data-theme', newTheme);
        localStorage.setItem('theme', newTheme);
        this.updateThemeIcon(newTheme);
        
        this.showToast(`${newTheme === 'dark' ? '🌙' : '☀️'} ${newTheme} mode activated!`, 'success');
    }

    updateThemeIcon(theme) {
        const icon = this.themeToggle.querySelector('i');
        icon.className = theme === 'light' ? 'fas fa-moon' : 'fas fa-sun';
    }

    // ============================================
    // LOCAL STORAGE
    // ============================================
    saveTasks() {
        localStorage.setItem('tasks', JSON.stringify(this.tasks));
    }

    loadTasks() {
        const tasks = localStorage.getItem('tasks');
        return tasks ? JSON.parse(tasks) : [];
    }

    // ============================================
    // SERVICE WORKER
    // ============================================
    registerServiceWorker() {
        if ('serviceWorker' in navigator) {
            navigator.serviceWorker.register('/sw.js')
                .then(registration => {
                    console.log('Service Worker registered:', registration);
                })
                .catch(error => {
                    console.log('Service Worker registration failed:', error);
                });
        }
    }

    // ============================================
    // UTILITIES
    // ============================================
    showToast(message, type = 'success') {
        const toast = document.getElementById('toast');
        toast.textContent = message;
        toast.className = `toast ${type} show`;
        
        setTimeout(() => {
            toast.classList.remove('show');
        }, 3000);
    }

    formatDate(dateString) {
        const date = new Date(dateString);
        const options = { year: 'numeric', month: 'short', day: 'numeric' };
        return date.toLocaleDateString('en-US', options);
    }

    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }
}

// Initialize the app
document.addEventListener('DOMContentLoaded', () => {
    new TaskPlanner();
});
