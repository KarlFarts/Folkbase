import { googleEventToCRMEvent } from '../eventTransformers';

describe('googleEventToCRMEvent unresolved attendees', () => {
  const contacts = [
    { 'Contact ID': 'CON001', Email: 'alice@example.com', 'First Name': 'Alice', 'Last Name': 'Smith' },
  ];

  it('puts unmatched attendee emails in Unresolved Attendees as JSON array', () => {
    const gcalEvent = {
      summary: 'Team Meeting',
      status: 'confirmed',
      start: { date: '2026-03-08' },
      end: { date: '2026-03-09' },
      attendees: [
        { email: 'alice@example.com', displayName: 'Alice Smith' },
        { email: 'bob@example.com', displayName: 'Bob Jones' },
        { email: 'carol@example.com' }, // no displayName
      ],
    };

    const result = googleEventToCRMEvent(gcalEvent, contacts);

    // alice matched to CON001
    expect(result['Attendees']).toBe('CON001');
    // bob and carol are unresolved
    const unresolved = JSON.parse(result['Unresolved Attendees']);
    expect(unresolved).toContain('Bob Jones');
    expect(unresolved).toContain('carol@example.com'); // falls back to email when no displayName
    expect(unresolved).toHaveLength(2);
  });

  it('does not set Unresolved Attendees when all attendees matched', () => {
    const gcalEvent = {
      summary: 'Solo',
      status: 'confirmed',
      start: { date: '2026-03-08' },
      end: { date: '2026-03-09' },
      attendees: [{ email: 'alice@example.com', displayName: 'Alice Smith' }],
    };

    const result = googleEventToCRMEvent(gcalEvent, contacts);
    expect(result['Unresolved Attendees']).toBeUndefined();
  });

  it('does not set Unresolved Attendees when no attendees at all', () => {
    const gcalEvent = {
      summary: 'Solo',
      status: 'confirmed',
      start: { date: '2026-03-08' },
      end: { date: '2026-03-09' },
    };

    const result = googleEventToCRMEvent(gcalEvent, contacts);
    expect(result['Unresolved Attendees']).toBeUndefined();
  });
});
