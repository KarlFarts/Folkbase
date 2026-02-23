import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { CheckSquare, Calendar, User, Clock } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useActiveSheetId } from '../utils/sheetResolver';
import { useNotification } from '../contexts/NotificationContext';
import { readSheetData, SHEETS } from '../utils/devModeWrapper';
import ChecklistManager from '../components/tasks/ChecklistManager';
import TimeEntryManager from '../components/tasks/TimeEntryManager';

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
      const tasksData = await readSheetData(accessToken, activeSheetId, SHEETS.TASKS);
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
        <div style={{ textAlign: 'center', padding: 'var(--spacing-xl)' }}>
          <p>Loading task...</p>
        </div>
      </div>
    );
  }

  if (!task) {
    return (
      <div className="page-container">
        <div style={{ textAlign: 'center', padding: 'var(--spacing-xl)' }}>
          <p>Task not found</p>
        </div>
      </div>
    );
  }

  return (
    <div className="page-container">
      {/* Header */}
      <div
        className="card"
        style={{
          marginBottom: 'var(--spacing-lg)',
          background:
            'linear-gradient(135deg, var(--color-bg-elevated) 0%, var(--color-bg-tertiary) 100%)',
        }}
      >
        <div className="card-body">
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: 'var(--spacing-md)' }}>
            <div
              style={{
                width: '60px',
                height: '60px',
                borderRadius: 'var(--border-radius)',
                background: 'var(--color-primary)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'white',
              }}
            >
              <CheckSquare size={32} />
            </div>
            <div style={{ flex: 1 }}>
              <h1 style={{ marginBottom: 'var(--spacing-xs)' }}>{task.Title}</h1>
              <div
                style={{
                  display: 'flex',
                  gap: 'var(--spacing-md)',
                  flexWrap: 'wrap',
                  marginBottom: 'var(--spacing-sm)',
                }}
              >
                <span className="badge badge-status-inactive">{task['Task ID']}</span>
                {task.Priority && (
                  <span
                    className="badge"
                    style={{
                      background: getPriorityColor(task.Priority),
                      color: 'white',
                    }}
                  >
                    {task.Priority}
                  </span>
                )}
                {task.Status && (
                  <span
                    className="badge"
                    style={{
                      background: getStatusColor(task.Status),
                      color: 'white',
                    }}
                  >
                    {task.Status}
                  </span>
                )}
              </div>
              {task['Due Date'] && (
                <p className="text-muted">
                  <Calendar
                    size={16}
                    style={{ verticalAlign: 'middle', marginRight: 'var(--spacing-xs)' }}
                  />
                  Due: {task['Due Date']}
                </p>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="card" style={{ marginBottom: 'var(--spacing-lg)' }}>
        <div className="card-header" style={{ padding: 0 }}>
          <div style={{ display: 'flex', borderBottom: '1px solid var(--color-border)' }}>
            {['overview', 'checklist', 'time-tracking'].map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                style={{
                  padding: 'var(--spacing-md)',
                  background: 'none',
                  border: 'none',
                  borderBottom:
                    activeTab === tab ? '2px solid var(--color-primary)' : '2px solid transparent',
                  color: activeTab === tab ? 'var(--color-primary)' : 'var(--color-text-muted)',
                  fontWeight: activeTab === tab ? 600 : 400,
                  cursor: 'pointer',
                  transition: 'all 0.2s',
                }}
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
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
                gap: 'var(--spacing-lg)',
              }}
            >
              {/* Description */}
              {task.Description && (
                <div>
                  <h3 style={{ marginBottom: 'var(--spacing-sm)' }}>Description</h3>
                  <p style={{ whiteSpace: 'pre-wrap' }}>{task.Description}</p>
                </div>
              )}

              {/* Assignment */}
              <div>
                <h3 style={{ marginBottom: 'var(--spacing-sm)' }}>Assignment</h3>
                {task['Assigned To Name'] && (
                  <p>
                    <User
                      size={16}
                      style={{ verticalAlign: 'middle', marginRight: 'var(--spacing-xs)' }}
                    />
                    Assigned to: {task['Assigned To Name']}
                  </p>
                )}
                {task['Created By'] && (
                  <p className="text-muted">Created by: {task['Created By']}</p>
                )}
              </div>

              {/* Timing */}
              <div>
                <h3 style={{ marginBottom: 'var(--spacing-sm)' }}>Timeline</h3>
                {task['Start Date'] && <p>Start: {task['Start Date']}</p>}
                {task['Due Date'] && <p>Due: {task['Due Date']}</p>}
                {task['Estimated Hours'] && (
                  <p>
                    <Clock
                      size={16}
                      style={{ verticalAlign: 'middle', marginRight: 'var(--spacing-xs)' }}
                    />
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
                  <h3 style={{ marginBottom: 'var(--spacing-sm)' }}>Related To</h3>
                  {task['Related Contact ID'] && (
                    <p
                      style={{ cursor: 'pointer', color: 'var(--color-primary)' }}
                      onClick={() => onNavigate('contact-profile', task['Related Contact ID'])}
                    >
                      Contact: {task['Related Contact ID']}
                    </p>
                  )}
                  {task['Related Event ID'] && (
                    <p
                      style={{ cursor: 'pointer', color: 'var(--color-primary)' }}
                      onClick={() => onNavigate('event-details', task['Related Event ID'])}
                    >
                      Event: {task['Related Event ID']}
                    </p>
                  )}
                  {task['Related Organization ID'] && (
                    <p
                      style={{ cursor: 'pointer', color: 'var(--color-primary)' }}
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
                  <h3 style={{ marginBottom: 'var(--spacing-sm)' }}>Progress</h3>
                  <div style={{ marginBottom: 'var(--spacing-xs)' }}>
                    <div
                      style={{
                        height: '8px',
                        background: 'var(--color-bg-tertiary)',
                        borderRadius: 'var(--border-radius)',
                        overflow: 'hidden',
                      }}
                    >
                      <div
                        style={{
                          height: '100%',
                          width: `${task['Completion Percentage']}%`,
                          background: 'var(--color-success)',
                          transition: 'width 0.3s',
                        }}
                      />
                    </div>
                  </div>
                  <p className="text-muted">{task['Completion Percentage']}% complete</p>
                </div>
              )}

              {/* Notes */}
              {task.Notes && (
                <div style={{ gridColumn: '1 / -1' }}>
                  <h3 style={{ marginBottom: 'var(--spacing-sm)' }}>Notes</h3>
                  <p style={{ whiteSpace: 'pre-wrap' }}>{task.Notes}</p>
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
