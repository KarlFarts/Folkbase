import SearchBar from './SearchBar';
import QuickActions from './QuickActions';
import UpcomingBirthdays from './UpcomingBirthdays';
import RecentActivity from './RecentActivity';
import UpcomingEvents from './UpcomingEvents';
import IncompleteTouchpointsWidget from './IncompleteTouchpointsWidget';

function DashboardSidebar({ onNavigate, contacts, activities, events, incompleteTouchpoints, onCompleteTouchpoint, onRefresh }) {
  return (
    <div className="dashboard-sidebar">
      <SearchBar contacts={contacts} onNavigate={onNavigate} />
      <QuickActions onNavigate={onNavigate} contacts={contacts} onRefresh={onRefresh} />
      <IncompleteTouchpointsWidget
        incompleteTouchpoints={incompleteTouchpoints}
        contacts={contacts}
        onCompleteTouchpoint={onCompleteTouchpoint}
      />
      <UpcomingBirthdays contacts={contacts} onNavigate={onNavigate} />
      <RecentActivity activities={activities} onNavigate={onNavigate} />
      <UpcomingEvents events={events} onNavigate={onNavigate} />
    </div>
  );
}

export default DashboardSidebar;
