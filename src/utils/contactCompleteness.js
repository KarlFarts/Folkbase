/**
 * Contact Completeness Scoring
 * Scores contacts 0-9 based on filled core fields
 */

export function scoreContact(contact) {
  let score = 0;
  if (contact['First Name'] || contact['Last Name']) score++;
  if (contact['Email Personal'] || contact['Email Work']) score++;
  if (contact['Phone Mobile'] || contact['Phone Home']) score++;
  if (contact['Organization']) score++;
  if (contact['Role']) score++;
  if (contact['Tags']) score++;
  if (contact['Bio']) score++;
  if (contact['Notes']) score++;
  if (contact['Last Contact Date']) score++;
  return score; // 0–9
}
