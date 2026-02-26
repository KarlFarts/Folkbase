import UrgentCard from './UrgentCard';

function UrgentSection({ title, items, urgentType, onNavigate, onMarkDone, markingDone }) {
  if (!items || items.length === 0) {
    return null;
  }

  return (
    <div className="urgent-section">
      <div className="urgent-section-header">
        <h2>{title}</h2>
        <span className="badge us-count-badge">
          {items.length}
        </span>
      </div>

      <div className="urgent-section-cards">
        {items.map((item, index) => (
          <UrgentCard
            key={item.contact['Contact ID'] || index}
            contact={item.contact}
            urgentType={urgentType}
            onNavigate={onNavigate}
            lastTouchpoint={item.lastTouchpoint}
            urgentDetail={item.urgentDetail}
            onMarkDone={onMarkDone}
            isMarking={markingDone === item.contact['Contact ID']}
          />
        ))}
      </div>
    </div>
  );
}

export default UrgentSection;
