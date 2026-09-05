// Public display metadata only. Never import account data or database helpers here.
export const DEMO_SECTIONS = [
  { id: "overview", label: "Overview", title: "MAKE TIME. MAKE IT COUNT.", description: "Your attention is your most valuable asset.", views: [] },
  { id: "focus", label: "Focus", title: "ENTER YOUR ELEMENT.", description: "Choose your rhythm. Protect your attention. Build a little momentum.", views: ["Classic", "Free", "Non-focused"] },
  { id: "schedule", label: "Schedule", title: "GIVE YOUR DAY DIRECTION.", description: "A place for your plans, a little room to breathe.", views: ["Agenda", "Calendar", "Tasks"] },
  { id: "habits", label: "Habits", title: "SMALL STEPS. REAL CHANGE.", description: "Your rituals, reflections, and the stories you make time for.", views: ["Habits", "Journal", "Movies", "Web series", "Games"] },
  { id: "goals", label: "Goals", title: "YOUR NEXT SUMMIT.", description: "Turn a distant ambition into milestones you can see.", views: [] },
  { id: "topics", label: "Learning", title: "FOLLOW YOUR CURIOSITY.", description: "Connect ideas and see your knowledge take shape.", views: [] },
  { id: "minigames", label: "Play", title: "RESET YOUR MIND.", description: "A collection of small challenges. Look around; gameplay is disabled in demo.", views: ["Minigames", "Puzzles", "Riddles", "IQ", "Q Master", "Stats"] },
  { id: "social", label: "Social", title: "CONNECTED. NOT DISTRACTED.", description: "Make space for connection without losing your day.", views: [] },
  { id: "trophies", label: "Trophies", title: "EFFORT WORTH CELEBRATING.", description: "A place for every milestone. Nothing unlocked in this preview.", views: [] },
  { id: "focus-points", label: "Focus Points", title: "ATTENTION HAS VALUE.", description: "See where consistent effort can take you.", views: [] },
  { id: "analytics", label: "Analytics", title: "SEE YOUR MOMENTUM.", description: "Your progress, made visible. Every metric starts at zero.", views: [] },
] as const;

export type DemoSection = typeof DEMO_SECTIONS[number];
