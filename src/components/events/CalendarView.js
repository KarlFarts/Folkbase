import { useState, useMemo } from 'react';
import CalendarEventPopover from './CalendarEventPopover';

function CalendarView({
  events,
  googleCalendarEvents = [],
  onEventClick,
  onAddToFolkbase,
  onImportEvent,
  syncedCalendarIds = new Set(),
  hideFolkbaseOnly = false,
}) {
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [activePopover, setActivePopover] = useState(null); // { gcalEvent, x, y }

  const { calendarDays, monthName, year } = useMemo(() => {
    const year = currentMonth.getFullYear();
    const month = currentMonth.getMonth();
    const monthName = currentMonth.toLocaleDateString('en-US', { month: 'long' });

    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const startingDayOfWeek = firstDay.getDay();

    const days = [];

    // Add padding days from previous month
    for (let i = 0; i < startingDayOfWeek; i++) {
      const paddingDate = new Date(year, month, -startingDayOfWeek + i + 1);
      days.push({ date: paddingDate, isCurrentMonth: false, events: [], googleEvents: [] });
    }

    // Add days of current month
    for (let day = 1; day <= lastDay.getDate(); day++) {
      const date = new Date(year, month, day);

      let dayEvents = events.filter((event) => {
        const eventDate = new Date(event['Event Date']);
        return eventDate.toDateString() === date.toDateString();
      });

      // Filter out folkbase-only events when the toggle is on
      if (hideFolkbaseOnly) {
        dayEvents = dayEvents.filter((event) => event['Google Calendar ID']);
      }

      // Add Google Calendar personal events
      const dayGoogleEvents = googleCalendarEvents.filter((gcalEvent) => {
        const eventDateStr = gcalEvent.start?.dateTime || gcalEvent.start?.date;
        if (!eventDateStr) return false;
        const eventDate = new Date(eventDateStr);
        return eventDate.toDateString() === date.toDateString();
      });

      days.push({ date, isCurrentMonth: true, events: dayEvents, googleEvents: dayGoogleEvents });
    }

    // Add padding days from next month
    const remainingDays = 42 - days.length; // 6 rows * 7 days
    for (let i = 1; i <= remainingDays; i++) {
      const paddingDate = new Date(year, month + 1, i);
      days.push({ date: paddingDate, isCurrentMonth: false, events: [], googleEvents: [] });
    }

    return { calendarDays: days, monthName, year };
  }, [currentMonth, events, googleCalendarEvents, hideFolkbaseOnly]);

  const goToPreviousMonth = () => {
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1, 1));
  };

  const goToNextMonth = () => {
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 1));
  };

  const goToToday = () => {
    setCurrentMonth(new Date());
  };

  const isToday = (date) => {
    const today = new Date();
    return date.toDateString() === today.toDateString();
  };

  const handleGcalEventClick = (e, gcalEvent) => {
    e.stopPropagation();
    const rect = e.currentTarget.getBoundingClientRect();
    setActivePopover({
      gcalEvent,
      x: Math.min(rect.left, window.innerWidth - 300),
      y: rect.bottom + 4,
    });
  };

  const handleAddToFolkbase = (gcalEvent) => {
    setActivePopover(null);
    if (onAddToFolkbase) {
      onAddToFolkbase(gcalEvent);
    } else if (onImportEvent) {
      // backward compat
      onImportEvent(gcalEvent);
    }
  };

  return (
    <div className="calendar-view">
      {/* Calendar Header */}
      <div className="card cv-header-card">
        <div className="card-body cv-header-body">
          <div className="cv-header-row">
            <h2 className="cv-month-title">
              {monthName} {year}
            </h2>
            <div className="cv-nav-buttons">
              <button
                className="btn btn-secondary btn-sm"
                onClick={goToPreviousMonth}
                title="Previous month"
              >
                <svg
                  width="16"
                  height="16"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                >
                  <polyline points="15 18 9 12 15 6" />
                </svg>
              </button>
              <button className="btn btn-secondary btn-sm" onClick={goToToday}>
                Today
              </button>
              <button
                className="btn btn-secondary btn-sm"
                onClick={goToNextMonth}
                title="Next month"
              >
                <svg
                  width="16"
                  height="16"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                >
                  <polyline points="9 18 15 12 9 6" />
                </svg>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Calendar Grid */}
      <div className="card">
        <div className="card-body cv-grid-body">
          <div className="calendar-grid">
            {/* Day headers */}
            {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day) => (
              <div key={day} className="calendar-day-header cv-day-header">
                {day}
              </div>
            ))}

            {/* Calendar days */}
            {calendarDays.map((dayData, index) => {
              const { date, isCurrentMonth, events: dayEvents, googleEvents } = dayData;
              const today = isToday(date);

              return (
                <div
                  key={index}
                  className="calendar-day cv-day-cell"
                  style={{
                    backgroundColor: isCurrentMonth
                      ? 'var(--color-bg-primary)'
                      : 'var(--color-bg-secondary)',
                    opacity: isCurrentMonth ? 1 : 0.5,
                    cursor: dayEvents.length > 0 ? 'pointer' : 'default',
                  }}
                  onClick={() => {
                    if (dayEvents.length === 1) {
                      onEventClick(dayEvents[0]['Event ID']);
                    }
                  }}
                >
                  <div
                    className="cv-day-number"
                    style={{
                      fontWeight: today ? 700 : 600,
                      color: today
                        ? 'var(--color-primary)'
                        : isCurrentMonth
                          ? 'var(--color-text-primary)'
                          : 'var(--color-text-secondary)',
                    }}
                  >
                    {today && (
                      <span className="cv-today-circle">{date.getDate()}</span>
                    )}
                    {!today && date.getDate()}
                  </div>

                  {/* Event indicators */}
                  {(dayEvents.length > 0 || googleEvents.length > 0) && (
                    <div className="cv-event-indicators">
                      {/* Folkbase Events */}
                      {dayEvents.slice(0, 2).map((event, idx) => {
                        const isSynced =
                          !!event['Google Calendar ID'] &&
                          syncedCalendarIds.has(event['Google Calendar ID']);
                        return (
                          <div
                            key={`crm-${idx}`}
                            className={`calendar-event-indicator cv-crm-event-indicator${isSynced ? ' cv-crm-event-indicator--synced' : ''}`}
                            onClick={(e) => {
                              e.stopPropagation();
                              onEventClick(event['Event ID']);
                            }}
                            title={event['Event Name']}
                          >
                            {isSynced && (
                              <span className="cv-synced-badge" aria-label="Synced with Google Calendar" />
                            )}
                            {event['Event Name']}
                          </div>
                        );
                      })}
                      {/* Google Calendar Events */}
                      {googleEvents.slice(0, 2).map((event, idx) => (
                        <div
                          key={`gcal-${idx}`}
                          className="calendar-event-indicator cv-gcal-event-indicator"
                          onClick={(e) => handleGcalEventClick(e, event)}
                          title={`${event.summary} (Google Calendar)`}
                        >
                          {event.summary}
                        </div>
                      ))}
                      {dayEvents.length + googleEvents.length > 4 && (
                        <div className="cv-more-count">
                          +{dayEvents.length + googleEvents.length - 4} more
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Popover for calendar-only events */}
      {activePopover && (
        <div
          style={{
            position: 'fixed',
            left: activePopover.x,
            top: activePopover.y,
            zIndex: 201,
          }}
        >
          <CalendarEventPopover
            gcalEvent={activePopover.gcalEvent}
            onClose={() => setActivePopover(null)}
            onAddToFolkbase={handleAddToFolkbase}
          />
        </div>
      )}
    </div>
  );
}

export default CalendarView;
