import React, { useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { getRandomGreeting, getTimeOfDayGreeting } from './greetingMessages';
import QuickActionBar from './QuickActionBar';
import CelebrationsWidget from './CelebrationsWidget';

function HeroWelcome({
  onNavigate,
  todoItems,
  upcomingEvents,
  incompleteProfiles,
  setupIssues,
  quickActions,
  contacts,
  expandedSection,
  onToggleSection,
}) {
  const { user } = useAuth();
  const [greeting, setGreeting] = useState(getRandomGreeting());

  const handleShuffle = () => setGreeting(getRandomGreeting());

  const formatDate = () => {
    return new Date().toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  const displayName = user?.displayName || user?.email?.split('@')[0] || 'there';
  const firstName = displayName.split(' ')[0];

  return (
    <div className="dashboard-hero-large">
      <div className="dashboard-hero-top">
        <div className="dashboard-hero-left">
          {user?.photoURL ? (
            <img src={user.photoURL} alt={displayName} className="dashboard-hero-avatar" />
          ) : (
            <div className="dashboard-hero-avatar-placeholder">
              {firstName.charAt(0).toUpperCase()}
            </div>
          )}
        </div>
        <div className="dashboard-hero-content">
          <div className="dashboard-hero-greeting">
            <h1 className="dashboard-hero-message">
              {getTimeOfDayGreeting()}, {firstName}! {greeting}
            </h1>
            <button className="dashboard-hero-shuffle" onClick={handleShuffle} title="New greeting">
              ⟳
            </button>
          </div>
          <div className="dashboard-hero-meta">
            <span className="dashboard-hero-date">{formatDate()}</span>
          </div>
        </div>
      </div>

      <div className="dashboard-hero-bottom">
        <div className="dashboard-hero-actions">
          <QuickActionBar
            todoItems={todoItems}
            upcomingEvents={upcomingEvents}
            incompleteProfiles={incompleteProfiles}
            setupIssues={setupIssues}
            quickActions={quickActions}
            onNavigate={onNavigate}
            contacts={contacts}
            expandedSection={expandedSection}
            onToggleSection={onToggleSection}
          />
        </div>
        <div className="dashboard-hero-upcoming">
          <CelebrationsWidget contacts={contacts} onNavigate={onNavigate} isSidebar={true} />
        </div>
      </div>
    </div>
  );
}

export default HeroWelcome;
