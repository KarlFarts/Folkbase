import React, { useState, useMemo } from 'react';

function CalendarView({ events, googleCalendarEvents = [], onEventClick, onImportEvent }) {
  const [currentMonth, setCurrentMonth] = useState(new Date());

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
      const dayEvents = events.filter((event) => {
        const eventDate = new Date(event['Event Date']);
        return eventDate.toDateString() === date.toDateString();
      });

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
  }, [currentMonth, events, googleCalendarEvents]);

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

  return (
    <div className="calendar-view">
      {/* Calendar Header */}
      <div className="card" style={{ marginBottom: 'var(--spacing-md)' }}>
        <div className="card-body" style={{ padding: 'var(--spacing-md)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h2 style={{ margin: 0, fontSize: 'var(--font-size-xl)' }}>
              {monthName} {year}
            </h2>
            <div style={{ display: 'flex', gap: 'var(--spacing-xs)' }}>
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
        <div className="card-body" style={{ padding: 0 }}>
          <div className="calendar-grid">
            {/* Day headers */}
            {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day) => (
              <div
                key={day}
                className="calendar-day-header"
                style={{
                  padding: 'var(--spacing-sm)',
                  textAlign: 'center',
                  fontWeight: 600,
                  borderBottom: '2px solid var(--color-border-default)',
                  backgroundColor: 'var(--color-bg-secondary)',
                  fontSize: 'var(--font-size-sm)',
                  color: 'var(--color-text-secondary)',
                }}
              >
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
                  className="calendar-day"
                  style={{
                    minHeight: '100px',
                    padding: 'var(--spacing-xs)',
                    border: '1px solid var(--color-border-default)',
                    backgroundColor: isCurrentMonth
                      ? 'var(--color-bg-primary)'
                      : 'var(--color-bg-secondary)',
                    opacity: isCurrentMonth ? 1 : 0.5,
                    cursor: dayEvents.length > 0 ? 'pointer' : 'default',
                    position: 'relative',
                  }}
                  onClick={() => {
                    if (dayEvents.length === 1) {
                      onEventClick(dayEvents[0]['Event ID']);
                    }
                  }}
                >
                  <div
                    style={{
                      fontSize: 'var(--font-size-sm)',
                      fontWeight: today ? 700 : 600,
                      marginBottom: 'var(--spacing-xs)',
                      color: today
                        ? 'var(--color-primary)'
                        : isCurrentMonth
                          ? 'var(--color-text-primary)'
                          : 'var(--color-text-secondary)',
                    }}
                  >
                    {today && (
                      <span
                        style={{
                          display: 'inline-block',
                          width: '24px',
                          height: '24px',
                          lineHeight: '24px',
                          textAlign: 'center',
                          borderRadius: '50%',
                          backgroundColor: 'var(--color-primary)',
                          color: 'white',
                        }}
                      >
                        {date.getDate()}
                      </span>
                    )}
                    {!today && date.getDate()}
                  </div>

                  {/* Event indicators */}
                  {(dayEvents.length > 0 || googleEvents.length > 0) && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                      {/* CRM Events */}
                      {dayEvents.slice(0, 2).map((event, idx) => (
                        <div
                          key={`crm-${idx}`}
                          className="calendar-event-indicator"
                          style={{
                            fontSize: 'var(--font-size-xs)',
                            padding: '2px 4px',
                            backgroundColor: 'var(--color-primary-alpha-20)',
                            color: 'var(--color-primary)',
                            borderRadius: '3px',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            whiteSpace: 'nowrap',
                            cursor: 'pointer',
                          }}
                          onClick={(e) => {
                            e.stopPropagation();
                            onEventClick(event['Event ID']);
                          }}
                          title={event['Event Name']}
                        >
                          {event['Event Name']}
                        </div>
                      ))}
                      {/* Google Calendar Events */}
                      {googleEvents.slice(0, 2).map((event, idx) => (
                        <div
                          key={`gcal-${idx}`}
                          className="calendar-event-indicator"
                          style={{
                            fontSize: 'var(--font-size-xs)',
                            padding: '2px 4px',
                            backgroundColor: 'rgba(5, 150, 105, 0.1)',
                            color: 'var(--color-success)',
                            borderRadius: '3px',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            whiteSpace: 'nowrap',
                            cursor: 'pointer',
                            borderLeft: '3px solid var(--color-success)',
                          }}
                          onClick={(e) => {
                            e.stopPropagation();
                            if (onImportEvent) {
                              onImportEvent(event);
                            }
                          }}
                          title={`${event.summary} (Google Calendar)`}
                        >
                          📅 {event.summary}
                        </div>
                      ))}
                      {dayEvents.length + googleEvents.length > 4 && (
                        <div
                          style={{
                            fontSize: 'var(--font-size-xs)',
                            color: 'var(--color-text-secondary)',
                            fontWeight: 600,
                            paddingLeft: '4px',
                          }}
                        >
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
    </div>
  );
}

export default CalendarView;
