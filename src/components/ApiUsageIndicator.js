/**
 * API Usage Indicator Component
 *
 * Lightweight badge showing API usage status.
 * Appears in navbar and shows warnings when approaching rate limits.
 *
 * States:
 * - Safe: Green badge with checkmark
 * - Warning: Yellow badge with percentage
 * - Critical: Red badge with alert
 */

import React, { useState, useEffect } from 'react';
import { AlertCircle, AlertTriangle, Check, Lightbulb, X } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { getRateLimitStatus, getAllServices } from '../utils/apiUsageLogger.js';
import { getRateLimitWarnings } from '../services/apiUsageStats.js';
import './ApiUsageIndicator.css';

export function ApiUsageIndicator({ showDetails = false }) {
  const navigate = useNavigate();
  const [status, setStatus] = useState('safe');
  const [details, setDetails] = useState(null);
  const [showPopup, setShowPopup] = useState(false);

  useEffect(() => {
    const updateStatus = () => {
      const allServices = getAllServices();

      // Check all services and find the worst status
      let worstStatus = 'safe';

      allServices.forEach((service) => {
        const warnings = getRateLimitWarnings(service.id);
        if (warnings && warnings.status) {
          // Status priority: critical > warning > safe
          const statusPriority = { critical: 0, warning: 1, safe: 2 };
          if (statusPriority[warnings.status] < statusPriority[worstStatus]) {
            worstStatus = warnings.status;
          }
        }
      });

      setStatus(worstStatus);

      // Get details for the worst service
      if (worstStatus !== 'safe') {
        const worstService = allServices.find((s) => {
          const warnings = getRateLimitWarnings(s.id);
          return warnings && warnings.status === worstStatus;
        });

        if (worstService) {
          const rateLimit = getRateLimitStatus(worstService.id);
          const warnings = getRateLimitWarnings(worstService.id);
          setDetails({
            service: worstService,
            rateLimit,
            warnings,
          });
        }
      }
    };

    updateStatus();

    // Update every 10 seconds
    const interval = setInterval(updateStatus, 10000);
    return () => clearInterval(interval);
  }, []);

  const getStatusText = () => {
    switch (status) {
      case 'critical':
        return 'Rate Limit Critical';
      case 'warning':
        return 'API Usage Warning';
      case 'safe':
      default:
        return 'API Usage Normal';
    }
  };

  const getStatusIcon = () => {
    switch (status) {
      case 'critical':
        return <AlertCircle size={14} />;
      case 'warning':
        return <AlertTriangle size={14} />;
      case 'safe':
      default:
        return <Check size={14} />;
    }
  };

  if (status === 'safe' && !showDetails) {
    // Show minimal badge when safe - clickable to view dashboard
    return (
      <button
        className="api-indicator api-indicator-safe"
        onClick={() => navigate('/settings')}
        title="API usage is normal - Click to view settings"
      >
        <span className="indicator-emoji"><Check size={14} /></span>
        <span className="indicator-text">API</span>
      </button>
    );
  }

  return (
    <div className="api-indicator-container">
      {/* Badge */}
      <button
        className={`api-indicator api-indicator-${status}`}
        onClick={() => setShowPopup(!showPopup)}
        title={getStatusText()}
      >
        <span className="indicator-emoji">{getStatusIcon()}</span>
        <span className="indicator-text">{status === 'safe' ? 'API' : 'API Warning'}</span>
        {status !== 'safe' && details && (
          <span className="indicator-percentage">
            {Math.round(details.rateLimit?.criticalQuota?.percentage || 0)}%
          </span>
        )}
      </button>

      {/* Popup Details */}
      {showPopup && details && (
        <div className="api-popup">
          <div className="popup-header">
            <h3>{details.service.name}</h3>
            <button className="popup-close" onClick={() => setShowPopup(false)}>
              <X size={16} />
            </button>
          </div>

          <div className="popup-body">
            {/* Status */}
            <div className="popup-section">
              <div className="popup-label">Status</div>
              <div className={`popup-status popup-status-${details.warnings?.status}`}>
                {details.warnings?.status?.toUpperCase()}
              </div>
            </div>

            {/* Critical Quota */}
            {details.rateLimit?.criticalQuota && (
              <div className="popup-section">
                <div className="popup-label">Critical Quota</div>
                <div className="popup-quota">
                  <div className="quota-type">{details.rateLimit.criticalQuota.type}</div>
                  <div className="quota-bar">
                    <div
                      className="quota-fill"
                      style={{
                        width: `${Math.min(details.rateLimit.criticalQuota.percentage, 100)}%`,
                      }}
                    />
                  </div>
                  <div className="quota-text">
                    {details.rateLimit.criticalQuota.calls} /{' '}
                    {details.rateLimit.criticalQuota.limit} (
                    {details.rateLimit.criticalQuota.percentage}%)
                  </div>
                </div>
              </div>
            )}

            {/* Warnings */}
            {details.warnings?.warnings && details.warnings.warnings.length > 0 && (
              <div className="popup-section">
                <div className="popup-label">Warnings</div>
                <div className="popup-warnings">
                  {details.warnings.warnings.map((warning, i) => (
                    <div key={i} className="warning-item">
                      <span><AlertTriangle size={14} /></span> {warning}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Recommendations */}
            {details.warnings?.recommendations && details.warnings.recommendations.length > 0 && (
              <div className="popup-section">
                <div className="popup-label">Recommendations</div>
                <div className="popup-recommendations">
                  {details.warnings.recommendations.map((rec, i) => (
                    <div key={i} className="recommendation-item">
                      <span><Lightbulb size={14} /></span> {rec}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* View Full Dashboard Link */}
            <div className="popup-footer">
              <button
                className="btn-view-dashboard"
                onClick={() => {
                  setShowPopup(false);
                  navigate('/settings');
                }}
              >
                View Full Dashboard →
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/**
 * Service Status Component
 * Shows detailed status for a specific service
 */
export function ServiceStatusBadge({ serviceId, compact = false }) {
  const [status, setStatus] = useState('safe');
  const [percentage, setPercentage] = useState(0);

  useEffect(() => {
    const updateStatus = () => {
      const warnings = getRateLimitWarnings(serviceId);
      const rateLimit = getRateLimitStatus(serviceId);

      if (warnings) {
        setStatus(warnings.status);
      }

      if (rateLimit?.criticalQuota) {
        setPercentage(rateLimit.criticalQuota.percentage);
      }
    };

    updateStatus();
    const interval = setInterval(updateStatus, 10000);
    return () => clearInterval(interval);
  }, [serviceId]);

  const getColor = () => {
    if (status === 'critical') return 'var(--color-danger)';
    if (status === 'warning') return 'var(--color-warning)';
    return 'var(--color-success)';
  };

  if (compact) {
    return (
      <span
        className="status-dot"
        style={{ backgroundColor: getColor() }}
        title={`${status}: ${percentage}%`}
      />
    );
  }

  return (
    <div className={`status-badge status-badge-${status}`}>
      <span className="badge-dot" style={{ backgroundColor: getColor() }} />
      <span className="badge-text">{status.toUpperCase()}</span>
      {percentage > 0 && <span className="badge-percentage">{percentage}%</span>}
    </div>
  );
}
