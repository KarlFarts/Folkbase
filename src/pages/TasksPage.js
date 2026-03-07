import React, { useState, useEffect, useCallback } from 'react';
import { ListChecks } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useActiveSheetId } from '../utils/sheetResolver';
import { useNotification } from '../contexts/NotificationContext';
import EmptyState from '../components/EmptyState';
import {
  getTasks,
  addTask,
  updateTask,
  deleteTask,
  readSheetData,
  SHEETS,
} from '../utils/devModeWrapper';
import { getUserWorkspaces } from '../utils/devModeWrapper';
import { ListPageSkeleton } from '../components/SkeletonLoader';
import ConfirmDialog from '../components/ConfirmDialog';
import WindowTemplate from '../components/WindowTemplate';

function TasksPage({ onNavigate }) {
  const { accessToken, user } = useAuth();
  const sheetId = useActiveSheetId();
  const { notify } = useNotification();

  const [tasks, setTasks] = useState([]);
  const [contacts, setContacts] = useState([]);
  const [workspaces, setWorkspaces] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Filters
  const [statusFilter, setStatusFilter] = useState('all');
  const [priorityFilter, setPriorityFilter] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');

  // Confirm dialog
  const [confirmDeleteTaskId, setConfirmDeleteTaskId] = useState(null);

  // Modal states
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingTask, setEditingTask] = useState(null);
  const [taskForm, setTaskForm] = useState({
    Title: '',
    Description: '',
    Priority: 'Medium',
    'Due Date': '',
    'Contact ID': '',
    'Workspace ID': '',
    Status: 'pending',
  });

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      setError('');

      // Load tasks
      const tasksData = await getTasks(accessToken, sheetId);
      setTasks(tasksData);

      // Load contacts for linking
      const contactsResult = await readSheetData(accessToken, sheetId, SHEETS.CONTACTS);
      setContacts(contactsResult.data || []);

      // Load workspaces
      const workspacesData = await getUserWorkspaces(accessToken, sheetId, user?.email);
      setWorkspaces(workspacesData || []);
    } catch {
      setError('Failed to load tasks. Please try again.');
    } finally {
      setLoading(false);
    }
  }, [accessToken, sheetId, user?.email]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleAddTask = async () => {
    try {
      await addTask(accessToken, sheetId, taskForm);
      notify.success('Task created successfully!');
      setShowAddModal(false);
      resetForm();
      loadData();
    } catch {
      notify.error('Failed to create task. Please try again.');
    }
  };

  const handleUpdateTask = async () => {
    try {
      await updateTask(accessToken, sheetId, editingTask['Task ID'], taskForm);
      notify.success('Task updated successfully!');
      setEditingTask(null);
      resetForm();
      loadData();
    } catch {
      notify.error('Failed to update task. Please try again.');
    }
  };

  const handleDeleteTask = async (taskId) => {
    try {
      await deleteTask(accessToken, sheetId, taskId);
      notify.success('Task deleted successfully!');
      loadData();
    } catch {
      notify.error('Failed to delete task. Please try again.');
    } finally {
      setConfirmDeleteTaskId(null);
    }
  };

  const handleToggleComplete = async (task) => {
    const newStatus = task['Status'] === 'completed' ? 'pending' : 'completed';
    try {
      await updateTask(accessToken, sheetId, task['Task ID'], { Status: newStatus });
      notify.success(newStatus === 'completed' ? 'Task completed!' : 'Task reopened');
      loadData();
    } catch {
      notify.error('Failed to update task status.');
    }
  };

  const resetForm = () => {
    setTaskForm({
      Title: '',
      Description: '',
      Priority: 'Medium',
      'Due Date': '',
      'Contact ID': '',
      'Workspace ID': '',
      Status: 'pending',
    });
  };

  const openEditModal = (task) => {
    setEditingTask(task);
    setTaskForm({
      Title: task['Title'] || '',
      Description: task['Description'] || '',
      Priority: task['Priority'] || 'Medium',
      'Due Date': task['Due Date'] || '',
      'Contact ID': task['Contact ID'] || '',
      'Workspace ID': task['Workspace ID'] || '',
      Status: task['Status'] || 'pending',
    });
  };

  const getContactName = (contactId) => {
    if (!contactId) return null;
    const contact = contacts.find((c) => c['Contact ID'] === contactId);
    return contact ? contact['Name'] : 'Unknown Contact';
  };

  const getWorkspaceName = (workspaceId) => {
    if (!workspaceId) return null;
    const workspace = workspaces.find((c) => c.id === workspaceId);
    return workspace ? workspace.name : 'Unknown Workspace';
  };

  const formatDueDate = (dateStr) => {
    if (!dateStr) return 'No due date';
    const date = new Date(dateStr);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    date.setHours(0, 0, 0, 0);

    const diffDays = Math.floor((date - today) / (1000 * 60 * 60 * 24));

    if (diffDays < 0) return `${Math.abs(diffDays)}d overdue`;
    if (diffDays === 0) return 'Today';
    if (diffDays === 1) return 'Tomorrow';
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  const getDueDateClass = (dateStr, status) => {
    if (status === 'completed') return '';
    if (!dateStr) return '';

    const date = new Date(dateStr);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    date.setHours(0, 0, 0, 0);

    if (date < today) return 'overdue';
    if (date.getTime() === today.getTime()) return 'due-today';
    return '';
  };

  // Filter tasks
  const filteredTasks = tasks.filter((task) => {
    // Status filter
    if (statusFilter !== 'all' && task['Status'] !== statusFilter) return false;

    // Priority filter
    if (priorityFilter !== 'all' && task['Priority'] !== priorityFilter) return false;

    // Search query
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      const title = (task['Title'] || '').toLowerCase();
      const description = (task['Description'] || '').toLowerCase();
      const contactName = getContactName(task['Contact ID'])?.toLowerCase() || '';
      const workspaceName = getWorkspaceName(task['Workspace ID'])?.toLowerCase() || '';

      if (
        !title.includes(query) &&
        !description.includes(query) &&
        !contactName.includes(query) &&
        !workspaceName.includes(query)
      ) {
        return false;
      }
    }

    return true;
  });

  // Sort: incomplete first (by due date), then completed
  const sortedTasks = [...filteredTasks].sort((a, b) => {
    // Completed tasks go to bottom
    if (a['Status'] === 'completed' && b['Status'] !== 'completed') return 1;
    if (a['Status'] !== 'completed' && b['Status'] === 'completed') return -1;

    // Sort by due date (earliest first, no date last among incomplete)
    const aDate = a['Due Date'] ? new Date(a['Due Date']) : new Date('9999-12-31');
    const bDate = b['Due Date'] ? new Date(b['Due Date']) : new Date('9999-12-31');
    return aDate - bDate;
  });

  const clearFilters = () => {
    setStatusFilter('all');
    setPriorityFilter('all');
    setSearchQuery('');
  };

  // Stats
  const pendingCount = tasks.filter((t) => t['Status'] === 'pending').length;
  const inProgressCount = tasks.filter((t) => t['Status'] === 'in_progress').length;
  const completedCount = tasks.filter((t) => t['Status'] === 'completed').length;
  const overdueCount = tasks.filter((t) => {
    if (t['Status'] === 'completed' || !t['Due Date']) return false;
    const dueDate = new Date(t['Due Date']);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    dueDate.setHours(0, 0, 0, 0);
    return dueDate < today;
  }).length;

  if (loading) {
    return <ListPageSkeleton count={4} />;
  }

  if (error) {
    return (
      <div className="page-container">
        <div className="empty-state">
          <h3>Error Loading Tasks</h3>
          <p>{error}</p>
          <button className="btn btn-primary" onClick={loadData}>
            Try Again
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="page-container">
      <div className="page-header">
        <h1>Tasks</h1>
        <button className="btn btn-primary" onClick={() => setShowAddModal(true)}>
          + New Task
        </button>
      </div>

      {/* Stats Bar */}
      <div className="tasks-stats-bar">
        <div className="stat-item">
          <span className="stat-value">{pendingCount}</span>
          <span className="stat-label">Pending</span>
        </div>
        <div className="stat-item">
          <span className="stat-value">{inProgressCount}</span>
          <span className="stat-label">In Progress</span>
        </div>
        <div className="stat-item">
          <span className="stat-value">{completedCount}</span>
          <span className="stat-label">Completed</span>
        </div>
        {overdueCount > 0 && (
          <div className="stat-item overdue">
            <span className="stat-value">{overdueCount}</span>
            <span className="stat-label">Overdue</span>
          </div>
        )}
      </div>

      {/* Filters */}
      <div className="tasks-filters">
        <input
          type="text"
          placeholder="Search tasks..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="search-input"
        />
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="filter-select"
        >
          <option value="all">All Status</option>
          <option value="pending">Pending</option>
          <option value="in_progress">In Progress</option>
          <option value="completed">Completed</option>
        </select>
        <select
          value={priorityFilter}
          onChange={(e) => setPriorityFilter(e.target.value)}
          className="filter-select"
        >
          <option value="all">All Priority</option>
          <option value="Urgent">Urgent</option>
          <option value="High">High</option>
          <option value="Medium">Medium</option>
          <option value="Low">Low</option>
        </select>
      </div>

      {/* Tasks List */}
      {sortedTasks.length === 0 ? (
        tasks.length === 0 ? (
          <EmptyState
            icon={ListChecks}
            title="No tasks yet"
            description="Create your first task to get started."
            action="Create Task"
            onAction={() => setShowAddModal(true)}
          />
        ) : (
          <EmptyState
            title="No matching tasks"
            description="Try adjusting your search or filters."
            secondaryAction="Clear Filters"
            onSecondaryAction={clearFilters}
          />
        )
      ) : (
        <div className="tasks-list">
          {sortedTasks.map((task) => (
            <div
              key={task['Task ID']}
              className={`task-card ${task['Status'] === 'completed' ? 'completed' : ''}`}
            >
              <div className="task-checkbox">
                <input
                  type="checkbox"
                  checked={task['Status'] === 'completed'}
                  onChange={() => handleToggleComplete(task)}
                />
              </div>

              <div className="task-content">
                <div className="task-header">
                  <h3 className="task-title">{task['Title']}</h3>
                  <span
                    className={`priority-badge priority-${(task['Priority'] || 'medium').toLowerCase()}`}
                  >
                    {task['Priority'] || 'Medium'}
                  </span>
                </div>

                {task['Description'] && <p className="task-description">{task['Description']}</p>}

                <div className="task-meta">
                  <span
                    className={`task-due-date ${getDueDateClass(task['Due Date'], task['Status'])}`}
                  >
                    {formatDueDate(task['Due Date'])}
                  </span>

                  {task['Contact ID'] && (
                    <span
                      className="task-contact-link"
                      onClick={() => onNavigate('contact-profile', task['Contact ID'])}
                    >
                      {getContactName(task['Contact ID'])}
                    </span>
                  )}

                  {task['Workspace ID'] && (
                    <span className="task-workspace-link">
                      {getWorkspaceName(task['Workspace ID'])}
                    </span>
                  )}

                  {task['Status'] === 'in_progress' && (
                    <span className="task-status-badge in-progress">In Progress</span>
                  )}
                </div>
              </div>

              <div className="task-actions">
                <button className="btn btn-sm btn-secondary" onClick={() => openEditModal(task)}>
                  Edit
                </button>
                <button
                  className="btn btn-sm btn-danger"
                  onClick={() => setConfirmDeleteTaskId(task['Task ID'])}
                >
                  Delete
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Add/Edit Modal */}
      {(showAddModal || editingTask) && (
        <WindowTemplate
          isOpen={showAddModal || !!editingTask}
          onClose={() => {
            setShowAddModal(false);
            setEditingTask(null);
            resetForm();
          }}
          title={editingTask ? 'Edit Task' : 'New Task'}
          size="md"
          footer={
            <>
              <button
                className="btn btn-secondary"
                onClick={() => {
                  setShowAddModal(false);
                  setEditingTask(null);
                  resetForm();
                }}
              >
                Cancel
              </button>
              <button
                className="btn btn-primary"
                onClick={editingTask ? handleUpdateTask : handleAddTask}
                disabled={!taskForm.Title.trim()}
              >
                {editingTask ? 'Save Changes' : 'Create Task'}
              </button>
            </>
          }
        >
          <div className="form-group">
            <label>Title *</label>
            <input
              type="text"
              value={taskForm.Title}
              onChange={(e) => setTaskForm({ ...taskForm, Title: e.target.value })}
              placeholder="What needs to be done?"
              autoFocus
            />
          </div>

          <div className="form-group">
            <label>Description</label>
            <textarea
              value={taskForm.Description}
              onChange={(e) => setTaskForm({ ...taskForm, Description: e.target.value })}
              placeholder="Add more details..."
              rows={3}
            />
          </div>

          <div className="form-row">
            <div className="form-group">
              <label>Priority</label>
              <select
                value={taskForm.Priority}
                onChange={(e) => setTaskForm({ ...taskForm, Priority: e.target.value })}
              >
                <option value="Urgent">Urgent</option>
                <option value="High">High</option>
                <option value="Medium">Medium</option>
                <option value="Low">Low</option>
              </select>
            </div>

            <div className="form-group">
              <label>Due Date</label>
              <input
                type="date"
                value={taskForm['Due Date']}
                onChange={(e) => setTaskForm({ ...taskForm, 'Due Date': e.target.value })}
              />
            </div>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label>Link to Contact</label>
              <select
                value={taskForm['Contact ID']}
                onChange={(e) => setTaskForm({ ...taskForm, 'Contact ID': e.target.value })}
              >
                <option value="">No contact</option>
                {contacts.map((contact) => (
                  <option key={contact['Contact ID']} value={contact['Contact ID']}>
                    {contact['Name']}
                  </option>
                ))}
              </select>
            </div>

            <div className="form-group">
              <label>Link to Workspace</label>
              <select
                value={taskForm['Workspace ID']}
                onChange={(e) => setTaskForm({ ...taskForm, 'Workspace ID': e.target.value })}
              >
                <option value="">No workspace</option>
                {workspaces.map((workspace) => (
                  <option key={workspace.id} value={workspace.id}>
                    {workspace.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {editingTask && (
            <div className="form-group">
              <label>Status</label>
              <select
                value={taskForm.Status}
                onChange={(e) => setTaskForm({ ...taskForm, Status: e.target.value })}
              >
                <option value="pending">Pending</option>
                <option value="in_progress">In Progress</option>
                <option value="completed">Completed</option>
              </select>
            </div>
          )}
        </WindowTemplate>
      )}

      <ConfirmDialog
        isOpen={!!confirmDeleteTaskId}
        onConfirm={() => handleDeleteTask(confirmDeleteTaskId)}
        onCancel={() => setConfirmDeleteTaskId(null)}
        title="Delete Task"
        message="Are you sure you want to delete this task?"
        confirmLabel="Delete"
        variant="danger"
      />
    </div>
  );
}

export default TasksPage;
