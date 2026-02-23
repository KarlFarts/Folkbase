/**
 * Quick script to seed test relationship data in dev mode
 * Run this in browser console: window.seedTestRelationships()
 */

export function seedTestRelationships() {
  // Get existing contacts from localStorage
  const contactsStr = localStorage.getItem('test_contacts');
  if (!contactsStr) {
    console.error('No contacts found in localStorage. Seed contacts first.');
    return;
  }

  const contacts = JSON.parse(contactsStr);
  if (contacts.length < 2) {
    console.error('Need at least 2 contacts to create relationships');
    return;
  }

  // Create some test entity relationships
  const testRelationships = [
    {
      'Relationship ID': 'ERE001',
      'Source Entity Type': 'Contact',
      'Source Entity ID': contacts[0]['Contact ID'],
      'Target Entity Type': 'Contact',
      'Target Entity ID': contacts[1]['Contact ID'],
      'Relationship Type': 'Professional',
      'Relationship Subtype': 'Colleague',
      'Is Directional': 'FALSE',
      Strength: 'Good',
      Notes: 'Work together on projects',
      'Date Established': '2024-01-15',
      'Created By': 'dev@test.com',
      'Created Date': '2024-01-15',
      'Last Updated': '2024-01-15',
    },
  ];

  // Add more if we have more contacts
  if (contacts.length >= 3) {
    testRelationships.push({
      'Relationship ID': 'ERE002',
      'Source Entity Type': 'Contact',
      'Source Entity ID': contacts[0]['Contact ID'],
      'Target Entity Type': 'Contact',
      'Target Entity ID': contacts[2]['Contact ID'],
      'Relationship Type': 'Professional',
      'Relationship Subtype': 'Client',
      'Is Directional': 'TRUE',
      Strength: 'Strong',
      Notes: 'Primary client contact',
      'Date Established': '2023-06-01',
      'Created By': 'dev@test.com',
      'Created Date': '2023-06-01',
      'Last Updated': '2024-01-15',
    });
  }

  // Save to localStorage
  localStorage.setItem('test_entity_relationships', JSON.stringify(testRelationships));

  // eslint-disable-next-line no-console
  console.log(`Seeded ${testRelationships.length} test entity relationships`);
}

// Make it available globally in dev mode
if (import.meta.env.VITE_DEV_MODE === 'true') {
  window.seedTestRelationships = seedTestRelationships;
}
