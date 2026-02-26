import React, { useState, useEffect } from 'react';
import { Activity, ChevronUp, ChevronDown, Database, Zap, Gauge } from 'lucide-react';
import { useCacheMonitoring } from '../contexts/MonitoringContext';
import './MonitoringPanel.css';

export function MonitoringPanel() {
  const [isOpen, setIsOpen] = useState(() => {
    const saved = localStorage.getItem('touchpoint_monitoring_panel_open');
    return saved ? JSON.parse(saved) : false;
  });
  const [activeTab, setActiveTab] = useState('cache');
  const monitoring = useCacheMonitoring();

  useEffect(() => {
    localStorage.setItem('touchpoint_monitoring_panel_open', JSON.stringify(isOpen));
  }, [isOpen]);

  const togglePanel = () => {
    setIsOpen(!isOpen);
  };

  return (
    <div className={`monitoring-panel ${isOpen ? 'open' : 'collapsed'}`}>
      {/* Header - always visible */}
      <div className="monitoring-header" onClick={togglePanel}>
        <div className="monitoring-header-content">
          <Activity size={16} />
          <span className="monitoring-title">Cache Monitor</span>
          <span className="monitoring-stats-preview">
            {monitoring.cache.hitRate}% hit rate • {monitoring.quota.last100Seconds}/100 API calls
          </span>
        </div>
        <button className="monitoring-toggle" aria-label="Toggle monitoring panel">
          {isOpen ? <ChevronDown size={16} /> : <ChevronUp size={16} />}
        </button>
      </div>

      {/* Expanded content */}
      {isOpen && (
        <div className="monitoring-content">
          {/* Tabs */}
          <div className="monitoring-tabs">
            <button
              className={`monitoring-tab ${activeTab === 'cache' ? 'active' : ''}`}
              onClick={() => setActiveTab('cache')}
            >
              <Database size={14} />
              Cache
            </button>
            <button
              className={`monitoring-tab ${activeTab === 'api' ? 'active' : ''}`}
              onClick={() => setActiveTab('api')}
            >
              <Zap size={14} />
              API Calls
            </button>
            <button
              className={`monitoring-tab ${activeTab === 'quota' ? 'active' : ''}`}
              onClick={() => setActiveTab('quota')}
            >
              <Gauge size={14} />
              Quota
            </button>
          </div>

          {/* Tab content */}
          <div className="monitoring-tab-content">
            {activeTab === 'cache' && (
              <CacheTab stats={monitoring.cache} ops={monitoring.recentOps} />
            )}
            {activeTab === 'api' && <ApiCallsTab calls={monitoring.apiCalls} />}
            {activeTab === 'quota' && <QuotaTab stats={monitoring.quota} />}
          </div>
        </div>
      )}
    </div>
  );
}

function CacheTab({ stats, ops }) {
  return (
    <div className="cache-tab">
      {/* Summary stats */}
      <div className="cache-summary">
        <div className="cache-stat">
          <div className="cache-stat-value">{stats.hitRate}%</div>
          <div className="cache-stat-label">Hit Rate</div>
        </div>
        <div className="cache-stat">
          <div className="cache-stat-value">{stats.hits}</div>
          <div className="cache-stat-label">Hits</div>
        </div>
        <div className="cache-stat">
          <div className="cache-stat-value">{stats.misses}</div>
          <div className="cache-stat-label">Misses</div>
        </div>
        <div className="cache-stat">
          <div className="cache-stat-value">{stats.avgAge}s</div>
          <div className="cache-stat-label">Avg Age</div>
        </div>
      </div>

      {/* By entity */}
      <div className="cache-by-entity">
        <h4>By Entity Type</h4>
        <div className="entity-list">
          {Object.entries(stats.byEntity).map(([entity, data]) => {
            const total = data.hits + data.misses;
            const rate = total > 0 ? ((data.hits / total) * 100).toFixed(0) : 0;
            return (
              <div key={entity} className="entity-row">
                <span className="entity-name">{entity}</span>
                <span className="entity-stats">
                  {data.hits}/{total} ({rate}%)
                </span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Recent operations */}
      <div className="recent-ops">
        <h4>Recent Operations</h4>
        <div className="ops-list">
          {ops.map((op, idx) => {
            const time = new Date(op.timestamp).toLocaleTimeString();
            return (
              <div key={idx} className={`op-row ${op.type}`}>
                <span className="op-time">{time}</span>
                <span className="op-entity">{op.entityType}</span>
                <span className={`op-badge ${op.type}`}>
                  {op.type === 'hit' ? '✓ HIT' : '✗ MISS'}
                </span>
                {op.type === 'hit' && op.age && <span className="op-age">{op.age}s old</span>}
                {op.type === 'miss' && op.reason && <span className="op-reason">{op.reason}</span>}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function ApiCallsTab({ calls }) {
  return (
    <div className="api-calls-tab">
      <div className="api-summary">
        <div className="api-stat">
          <div className="api-stat-value">{calls.length}</div>
          <div className="api-stat-label">Recent Calls</div>
        </div>
        <div className="api-stat">
          <div className="api-stat-value">
            {calls.length > 0
              ? Math.round(calls.reduce((sum, c) => sum + c.duration, 0) / calls.length)
              : 0}
            ms
          </div>
          <div className="api-stat-label">Avg Duration</div>
        </div>
      </div>

      <div className="api-call-list">
        <h4>Call Log</h4>
        <div className="call-log">
          {calls.map((call, idx) => {
            const time = new Date(call.timestamp).toLocaleTimeString();
            return (
              <div key={idx} className="call-row">
                <span className="call-time">{time}</span>
                <span className={`call-operation ${call.operation}`}>
                  {call.operation.toUpperCase()}
                </span>
                <span className="call-entity">{call.entityType}</span>
                <span className="call-duration">{call.duration}ms</span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function QuotaTab({ stats }) {
  const getQuotaColor = (percent) => {
    if (percent < 70) return 'green';
    if (percent < 90) return 'yellow';
    return 'red';
  };

  return (
    <div className="quota-tab">
      <div className="quota-section">
        <h4>Last 100 Seconds (Per-User Limit)</h4>
        <div className="quota-bar-container">
          <div
            className={`quota-bar ${getQuotaColor(stats.percentUsed100s)}`}
            style={{ width: `${stats.percentUsed100s}%` }}
          />
        </div>
        <div className="quota-text">
          {stats.last100Seconds} / {stats.quotaLimit100s} calls ({stats.percentUsed100s}%)
        </div>
        {stats.percentUsed100s >= 80 && (
          <div className="quota-warning">
            ⚠️ Approaching quota limit. Slow down API calls or increase cache TTL.
          </div>
        )}
      </div>

      <div className="quota-section">
        <h4>Last Hour</h4>
        <div className="quota-bar-container">
          <div
            className={`quota-bar ${getQuotaColor(stats.percentUsedHour)}`}
            style={{ width: `${stats.percentUsedHour}%` }}
          />
        </div>
        <div className="quota-text">
          {stats.lastHour} / {stats.quotaLimitHour} calls ({stats.percentUsedHour}%)
        </div>
      </div>

      <div className="quota-info">
        <h4>About Quotas</h4>
        <p>Google Sheets API limits:</p>
        <ul>
          <li>100 requests per 100 seconds (per user)</li>
          <li>1,000 requests per hour (soft limit)</li>
        </ul>
        <p>Cache reduces API calls by 80-90% with proper TTL settings.</p>
      </div>
    </div>
  );
}
