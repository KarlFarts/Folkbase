import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { CheckSquare, Calendar, User, Clock } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useActiveSheetId } from '../utils/sheetResolver';
import { useNotification } from '../contexts/NotificationContext';
import { readSheetData, SHEETS } from '../utils/devModeWrapper';
import ChecklistManager from '../components/tasks/ChecklistManager';
import TimeEntryManager from '../components/tasks/TimeEntryManager';
import { ProfileSkeleton } from '../components/SkeletonLoader';

export default function TaskProfile({ onNavigate }) {
  const { id } = useParams();
  const { accessToken } = useAuth();
  const activeSheetId = useActiveSheetId();
  const { notify } = useNotification();

  const [task, setTask] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('overview');

  useEffect(() => {
    if (id && accessToken && activeSheetId) {
      loadTask();
    }
  }, [id, accessToken, activeSheetId]);

  const loadTask = async () => {
    try {
      setLoading(true);
      const { data: tasksData } = await readSheetData(accessToken, activeSheetId, SHEETS.TASKS);
      const taskData = tasksData.find((t) => t['Task ID'] === id);

      if (!taskData) {
        notify.error('Task not found');
        return;
      }

      setTask(taskData);
    } catch (err) {
      console.error('Error loading task:', err);
      notify.error('Failed to load task');
    } finally {
      setLoading(false);
    }
  };

  const getPriorityColor = (priority) => {
    const colors = {
      Urgent: 'var(--color-error)',
      High: 'var(--color-warning)',
      Medium: 'var(--color-info)',
      Low: 'var(--color-text-muted)',
    };
    return colors[priority] || 'var(--color-text-muted)';
  };

  const getStatusColor = (status) => {
    const colors = {
      'Not Started': 'var(--color-text-muted)',
      'In Progress': 'var(--color-info)',
      Completed: 'var(--color-success)',
      Blocked: 'var(--color-error)',
      'On Hold': 'var(--color-warning)',
    };
    return colors[status] || 'var(--color-text-muted)';
  };

  if (loading) {
    return (
      <div className="page-container">
        <ProfileSkeleton />
      </div>
    );
  }

  if (!task) {
    return (
      <div className="page-container">
        <div className="tp-center-pad">
          <p>Task not found</p>
        </div>
      </div>
    );
  }

  return (
    <div className="page-container">
      {/* Header */}
      <div className="card tp-header-card">
        <div className="card-body">
          <div className="tp-header-row">
            <div className="tp-icon-box">
              <CheckSquare size={32} />
            </div>
            <div className="tp-header-info">
              <h1 className="tp-title">{task.Title}</h1>
              <div className="tp-badges">
                <span className="badge badge-status-inactive">{task['Task ID']}</span>
                {task.Priority && (
                  <span
                    className="badge tp-priority-badge"
                    style={{ background: getPriorityColor(task.Priority) }}
                  >
                    {task.Priority}
                  </span>
                )}
                {task.Status && (
                  <span
                    className="badge tp-status-badge"
                    style={{ background: getStatusColor(task.Status) }}
                  >
                    {task.Status}
                  </span>
                )}
              </div>
              {task['Due Date'] && (
                <p className="text-muted">
                  <Calendar size={16} className="tp-inline-icon" />
                  Due: {task['Due Date']}
                </p>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="card tp-tabs-card">
        <div className="card-header tp-tabs-header">
          <div className="tp-tab-bar">
            {['overview', 'checklist', 'time-tracking'].map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`tp-tab${activeTab === tab ? ' tp-tab--active' : ''}`}
              >
                {tab === 'overview' && 'Overview'}
                {tab === 'checklist' && 'Checklist'}
                {tab === 'time-tracking' && 'Time Tracking'}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Tab Content */}
      {activeTab === 'overview' && (
        <div className="card">
          <div className="card-body">
            <div className="tp-overview-grid">
              {/* Description */}
              {task.Description && (
                <div>
                  <h3 className="tp-section-heading">Description</h3>
                  <p className="tp-pre-wrap">{task.Description}</p>
                </div>
              )}

              {/* Assignment */}
              <div>
                <h3 className="tp-section-heading">Assignment</h3>
                {task['Assigned To Name'] && (
                  <p>
                    <User size={16} className="tp-inline-icon" />
                    Assigned to: {task['Assigned To Name']}
                  </p>
                )}
                {task['Created By'] && (
                  <p className="text-muted">Created by: {task['Created By']}</p>
                )}
              </div>

              {/* Timing */}
              <div>
                <h3 className="tp-section-heading">Timeline</h3>
                {task['Start Date'] && <p>Start: {task['Start Date']}</p>}
                {task['Due Date'] && <p>Due: {task['Due Date']}</p>}
                {task['Estimated Hours'] && (
                  <p>
                    <Clock size={16} className="tp-inline-icon" />
                    Estimated: {task['Estimated Hours']}h
                  </p>
                )}
                {task['Actual Hours'] && (
                  <p className="text-muted">Actual: {task['Actual Hours']}h</p>
                )}
              </div>

              {/* Related Entities */}
              {(task['Related Contact ID'] ||
                task['Related Event ID'] ||
                task['Related Organization ID']) && (
                <div>
                  <h3 className="tp-section-heading">Related To</h3>
                  {task['Related Contact ID'] && (
                    <p
                      className="tp-link"
                      onClick={() => onNavigate('contact-profile', task['Related Contact ID'])}
                    >
                      Contact: {task['Related Contact ID']}
                    </p>
                  )}
                  {task['Related Event ID'] && (
                    <p
                      className="tp-link"
                      onClick={() => onNavigate('event-details', task['Related Event ID'])}
                    >
                      Event: {task['Related Event ID']}
                    </p>
                  )}
                  {task['Related Organization ID'] && (
                    <p
                      className="tp-link"
                      onClick={() =>
                        onNavigate('organization-profile', task['Related Organization ID'])
                      }
                    >
                      Organization: {task['Related Organization ID']}
                    </p>
                  )}
                </div>
              )}

              {/* Progress */}
              {task['Completion Percentage'] && (
                <div>
                  <h3 className="tp-section-heading">Progress</h3>
                  <div className="tp-progress-wrap">
                    <div className="tp-progress-bar">
                      <div
                        className="tp-progress-fill"
                        style={{ width: `${task['Completion Percentage']}%` }}
                      />
                    </div>
                  </div>
                  <p className="text-muted">{task['Completion Percentage']}% complete</p>
                </div>
              )}

              {/* Notes */}
              {task.Notes && (
                <div className="tp-full-width">
                  <h3 className="tp-section-heading">Notes</h3>
                  <p className="tp-pre-wrap">{task.Notes}</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {activeTab === 'checklist' && (
        <div className="card">
          <div className="card-body">
            <ChecklistManager taskId={id} />
          </div>
        </div>
      )}

      {activeTab === 'time-tracking' && (
        <div className="card">
          <div className="card-body">
            <TimeEntryManager taskId={id} />
          </div>
        </div>
      )}
    </div>
  );
}
