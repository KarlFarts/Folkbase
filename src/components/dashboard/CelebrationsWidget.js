import { useMemo, useState } from 'react';

function CelebrationsWidget({ contacts, onNavigate, daysAhead = 30, bare = false }) {
  const [currentIndex, setCurrentIndex] = useState(0);

  // eslint-disable-next-line react-hooks/preserve-manual-memoization
  const celebrations = useMemo(() => {
    if (!contacts || contacts.length === 0) return [];

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const thisYear = today.getFullYear();

    const celebrationList = [];

    contacts.forEach((contact) => {
      const contactId = contact['Contact ID'];
      const contactName = contact['Name'];

      // Process Birthday
      if (contact.Birthday) {
        const birthday = new Date(contact.Birthday);
        const celebDate = new Date(birthday);
        celebDate.setFullYear(thisYear);
        celebDate.setHours(0, 0, 0, 0);

        // If date has passed this year, check next year
        if (celebDate < today) {
          celebDate.setFullYear(thisYear + 1);
        }

        const daysUntil = Math.floor((celebDate - today) / (1000 * 60 * 60 * 24));

        if (daysUntil <= daysAhead) {
          celebrationList.push({
            id: `birthday-${contactId}`,
            contactId,
            contactName,
            type: 'Birthday',
            date: celebDate,
            daysUntil,
          });
        }
      }

      // Process Anniversary
      if (contact.Anniversary) {
        const anniversary = new Date(contact.Anniversary);
        const celebDate = new Date(anniversary);
        celebDate.setFullYear(thisYear);
        celebDate.setHours(0, 0, 0, 0);

        if (celebDate < today) {
          celebDate.setFullYear(thisYear + 1);
        }

        const daysUntil = Math.floor((celebDate - today) / (1000 * 60 * 60 * 24));

        if (daysUntil <= daysAhead) {
          celebrationList.push({
            id: `anniversary-${contactId}`,
            contactId,
            contactName,
            type: 'Anniversary',
            date: celebDate,
            daysUntil,
          });
        }
      }

      // Process Death Anniversary
      if (contact.DeathAnniversary) {
        const memorial = new Date(contact.DeathAnniversary);
        const celebDate = new Date(memorial);
        celebDate.setFullYear(thisYear);
        celebDate.setHours(0, 0, 0, 0);

        if (celebDate < today) {
          celebDate.setFullYear(thisYear + 1);
        }

        const daysUntil = Math.floor((celebDate - today) / (1000 * 60 * 60 * 24));

        if (daysUntil <= daysAhead) {
          celebrationList.push({
            id: `memorial-${contactId}`,
            contactId,
            contactName,
            type: 'Memorial',
            date: celebDate,
            daysUntil,
          });
        }
      }
    });

    // Sort by soonest first
    return celebrationList.sort((a, b) => a.daysUntil - b.daysUntil);
  }, [contacts, daysAhead]);

  const formatDaysUntil = (days) => {
    if (days === 0) return 'Today';
    if (days === 1) return 'Tomorrow';
    return `In ${days} days`;
  };

  const formatDate = (date) => {
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  const handleItemClick = (contactId) => {
    onNavigate('contact-profile', contactId);
  };

  const handlePrev = () => {
    setCurrentIndex((prev) => (prev === 0 ? celebrations.length - 1 : prev - 1));
  };

  const handleNext = () => {
    setCurrentIndex((prev) => (prev === celebrations.length - 1 ? 0 : prev + 1));
  };

  if (celebrations.length === 0) {
    if (bare) {
      return (
        <div className="celebrations-widget-empty">
          <p>No upcoming celebrations in the next {daysAhead} days</p>
        </div>
      );
    }
    return (
      <div className="celebrations-widget-simple">
        <div className="celebrations-widget-header">
          <h3>Upcoming</h3>
        </div>
        <div className="celebrations-widget-empty">
          <p>No upcoming celebrations in the next {daysAhead} days</p>
        </div>
      </div>
    );
  }

  const currentCelebration = celebrations[currentIndex];

  const carousel = (
    <div className="celebrations-carousel">
        <button
          className="celebrations-carousel-arrow celebrations-carousel-prev"
          onClick={handlePrev}
          disabled={celebrations.length <= 1}
        >
          ‹
        </button>

        <div
          className="celebrations-carousel-item"
          onClick={() => handleItemClick(currentCelebration.contactId)}
        >
          <div className="celebrations-carousel-header">
            <div className="celebrations-carousel-name">{currentCelebration.contactName}</div>
            {currentCelebration.daysUntil <= 7 && (
              <span className="celebrations-carousel-badge">New</span>
            )}
          </div>
          <div className="celebrations-carousel-type">{currentCelebration.type}</div>
          <div className="celebrations-carousel-date">{formatDate(currentCelebration.date)}</div>
          <div className="celebrations-carousel-days">
            {formatDaysUntil(currentCelebration.daysUntil)}
          </div>
          <div className="celebrations-carousel-indicator">
            {currentIndex + 1} / {celebrations.length}
          </div>
        </div>

        <button
          className="celebrations-carousel-arrow celebrations-carousel-next"
          onClick={handleNext}
          disabled={celebrations.length <= 1}
        >
          ›
        </button>
      </div>
  );

  if (bare) {
    return carousel;
  }

  return (
    <div className="celebrations-widget-simple">
      <div className="celebrations-widget-header">
        <h3>Upcoming</h3>
      </div>
      {carousel}
    </div>
  );
}

export default CelebrationsWidget;
