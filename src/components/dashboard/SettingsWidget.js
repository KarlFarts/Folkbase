import React from 'react';
import { Check, AlertTriangle, Zap, Info } from 'lucide-react';
import CollapsibleWidget from './CollapsibleWidget';

const SettingsWidget = ({ issues }) => {
  const issueCount = issues ? issues.length : 0;

  return (
    <CollapsibleWidget
      title="Setup & Health"
      labelText="Issues"
      count={issueCount}
      defaultExpanded={issueCount > 0}
    >
      <div style={{ padding: '8px' }}>
        {issueCount === 0 ? (
          <div className="setup-all-good">
            <span><Check size={14} /></span> Everything looks good!
          </div>
        ) : (
          issues.map((issue, idx) => (
            <div key={idx} className={`setup-issue-item setup-issue-${issue.type}`}>
              <div className="setup-issue-icon">
                {issue.type === 'critical' ? <AlertTriangle size={14} /> : issue.type === 'warning' ? <Zap size={14} /> : <Info size={14} />}
              </div>
              <div className="setup-issue-content">
                <div className="setup-issue-message">{issue.message}</div>
                {issue.action && (
                  <button onClick={issue.action} className="setup-issue-action">
                    {issue.actionLabel}
                  </button>
                )}
              </div>
            </div>
          ))
        )}
      </div>
    </CollapsibleWidget>
  );
};

export default SettingsWidget;
