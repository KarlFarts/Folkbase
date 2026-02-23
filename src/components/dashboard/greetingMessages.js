export const GREETING_MESSAGES = {
  morning: [
    "Ready to make meaningful connections today?",
    "Your network is waiting.",
    "Let's nurture some relationships today.",
    "Every conversation matters.",
    "Who needs your attention today?"
  ],
  afternoon: [
    "Time to check in on your contacts.",
    "Who's on your mind today?",
    "Small gestures make big impressions.",
    "Any follow-ups to tackle?",
    "Connect with someone who matters."
  ],
  evening: [
    "Reflect on today's connections.",
    "Did you reach out to someone new today?",
    "Wind down with a thoughtful message.",
    "Tomorrow's opportunities await.",
    "Who would appreciate hearing from you?"
  ]
};

export function getRandomGreeting() {
  const hour = new Date().getHours();
  let period = hour < 12 ? 'morning' : hour < 17 ? 'afternoon' : 'evening';
  const messages = GREETING_MESSAGES[period];
  return messages[Math.floor(Math.random() * messages.length)];
}

export function getTimeOfDayGreeting() {
  const hour = new Date().getHours();
  if (hour < 12) return 'Good morning';
  if (hour < 17) return 'Good afternoon';
  return 'Good evening';
}
