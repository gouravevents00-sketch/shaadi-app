// ─── Sprint 2: Smart Automation Templates ─────────────────────────────────────
// Maps event names / vendor categories → auto-populated checklist, vendor slots, budget

export type ChecklistSeed = { title: string; category: string; daysBeforeEvent?: number }
export type VendorSeed    = { name: string; category: string }
export type BudgetSeed    = { category: string; description: string; estimated: number }

export type EventTemplate = {
  checklist: ChecklistSeed[]
  vendors:   VendorSeed[]
  budget:    BudgetSeed[]
}

// ─── Event Name → Template ────────────────────────────────────────────────────
// Matched via substring (case-insensitive). Order matters — first match wins.

export const EVENT_TEMPLATES: Record<string, EventTemplate> = {

  mehandi: {
    checklist: [
      { title: 'Book Mehandi artist', category: 'Vendors', daysBeforeEvent: 60 },
      { title: 'Finalize Mehandi designs (bridal + guests)', category: 'Decor', daysBeforeEvent: 14 },
      { title: 'Arrange seating & tent for Mehandi', category: 'Logistics', daysBeforeEvent: 10 },
      { title: 'Confirm Mehandi artist arrival time', category: 'Vendors', daysBeforeEvent: 2 },
      { title: 'Arrange DJ/music for Mehandi', category: 'Music', daysBeforeEvent: 14 },
    ],
    vendors: [
      { name: 'Mehandi Artist', category: 'Mehandi' },
      { name: 'DJ / Music', category: 'Music' },
    ],
    budget: [
      { category: 'Mehandi', description: 'Mehandi artist fees', estimated: 25000 },
      { category: 'Mehandi', description: 'Decor & setup', estimated: 20000 },
      { category: 'Mehandi', description: 'Catering / snacks', estimated: 30000 },
    ],
  },

  haldi: {
    checklist: [
      { title: 'Arrange Haldi paste and floral Haldi setup', category: 'Decor', daysBeforeEvent: 7 },
      { title: 'Confirm Haldi photographer', category: 'Photography', daysBeforeEvent: 14 },
      { title: 'Arrange clothes protection (old dupatta/sheet) for family', category: 'Logistics', daysBeforeEvent: 3 },
      { title: 'Arrange turmeric, rose water & flower petals', category: 'Logistics', daysBeforeEvent: 3 },
    ],
    vendors: [
      { name: 'Haldi Decor', category: 'Decor' },
      { name: 'Photographer', category: 'Photography' },
    ],
    budget: [
      { category: 'Haldi', description: 'Haldi & floral decor setup', estimated: 15000 },
      { category: 'Haldi', description: 'Photographer (Haldi)', estimated: 15000 },
    ],
  },

  baraat: {
    checklist: [
      { title: 'Book Baraat band / DJ + lights', category: 'Music', daysBeforeEvent: 60 },
      { title: 'Arrange decorated horse / car for groom', category: 'Logistics', daysBeforeEvent: 30 },
      { title: 'Confirm Baraat route with venue & police', category: 'Logistics', daysBeforeEvent: 14 },
      { title: 'Brief Baraat team (family entry sequence)', category: 'Operations', daysBeforeEvent: 2 },
      { title: 'Arrange Baraat welcome drinks & snacks for guests', category: 'Catering', daysBeforeEvent: 3 },
    ],
    vendors: [
      { name: 'Baraat Band / DJ', category: 'Music' },
      { name: 'Horse / Decorated Car', category: 'Transport' },
    ],
    budget: [
      { category: 'Baraat', description: 'Band / DJ + lighting', estimated: 60000 },
      { category: 'Baraat', description: 'Horse / decorated car', estimated: 30000 },
      { category: 'Baraat', description: 'Welcome snacks & drinks', estimated: 20000 },
    ],
  },

  pheras: {
    checklist: [
      { title: 'Book pandit / priest for Pheras', category: 'Rituals', daysBeforeEvent: 60 },
      { title: 'Arrange mandap setup & fire (havan kund)', category: 'Decor', daysBeforeEvent: 7 },
      { title: 'Confirm muhurat timing with pandit', category: 'Rituals', daysBeforeEvent: 14 },
      { title: 'Prepare pooja samagri list with pandit', category: 'Rituals', daysBeforeEvent: 14 },
      { title: 'Brief photographer on Phera sequence', category: 'Photography', daysBeforeEvent: 2 },
      { title: 'Confirm seating for immediate family at mandap', category: 'Logistics', daysBeforeEvent: 3 },
    ],
    vendors: [
      { name: 'Pandit / Priest', category: 'Rituals' },
      { name: 'Mandap Decor', category: 'Decor' },
    ],
    budget: [
      { category: 'Pheras', description: 'Pandit dakshina & samagri', estimated: 21000 },
      { category: 'Pheras', description: 'Mandap & havan setup', estimated: 50000 },
    ],
  },

  sagai: {
    checklist: [
      { title: 'Arrange engagement rings', category: 'Jewellery', daysBeforeEvent: 30 },
      { title: 'Plan Sagai stage & backdrop decor', category: 'Decor', daysBeforeEvent: 14 },
      { title: 'Confirm Sagai lunch / dinner caterer', category: 'Catering', daysBeforeEvent: 14 },
      { title: 'Prepare gift exchange list (both families)', category: 'Logistics', daysBeforeEvent: 7 },
      { title: 'Book Sagai photographer / videographer', category: 'Photography', daysBeforeEvent: 30 },
    ],
    vendors: [
      { name: 'Sagai Decor', category: 'Decor' },
      { name: 'Photographer', category: 'Photography' },
      { name: 'Caterer', category: 'Catering' },
    ],
    budget: [
      { category: 'Sagai', description: 'Stage & decor', estimated: 30000 },
      { category: 'Sagai', description: 'Catering', estimated: 50000 },
      { category: 'Sagai', description: 'Photography', estimated: 25000 },
    ],
  },

  reception: {
    checklist: [
      { title: 'Confirm reception venue & layout', category: 'Venue', daysBeforeEvent: 30 },
      { title: 'Book DJ / live band for reception', category: 'Music', daysBeforeEvent: 45 },
      { title: 'Finalize stage decor & floral arrangement', category: 'Decor', daysBeforeEvent: 14 },
      { title: 'Set up photo booth / selfie corner', category: 'Decor', daysBeforeEvent: 7 },
      { title: 'Confirm buffet menu & dietary options', category: 'Catering', daysBeforeEvent: 7 },
      { title: 'Prepare couple entry sequence & song', category: 'Operations', daysBeforeEvent: 3 },
    ],
    vendors: [
      { name: 'DJ / Live Band', category: 'Music' },
      { name: 'Reception Decor', category: 'Decor' },
      { name: 'Caterer', category: 'Catering' },
      { name: 'Photographer', category: 'Photography' },
    ],
    budget: [
      { category: 'Reception', description: 'DJ / live band', estimated: 80000 },
      { category: 'Reception', description: 'Stage & decor', estimated: 100000 },
      { category: 'Reception', description: 'Catering per plate', estimated: 150000 },
    ],
  },

  cocktail: {
    checklist: [
      { title: 'Plan cocktail menu & mocktails', category: 'Catering', daysBeforeEvent: 14 },
      { title: 'Book bartender / mixologist', category: 'Vendors', daysBeforeEvent: 30 },
      { title: 'Plan cocktail decor (high tables, fairy lights)', category: 'Decor', daysBeforeEvent: 14 },
      { title: 'Book DJ / curate Spotify playlist', category: 'Music', daysBeforeEvent: 21 },
    ],
    vendors: [
      { name: 'Bartender', category: 'Catering' },
      { name: 'DJ', category: 'Music' },
      { name: 'Cocktail Decor', category: 'Decor' },
    ],
    budget: [
      { category: 'Cocktail', description: 'Beverages & bartender', estimated: 70000 },
      { category: 'Cocktail', description: 'Appetizers & snacks', estimated: 50000 },
      { category: 'Cocktail', description: 'Decor setup', estimated: 40000 },
    ],
  },

  'sham-e-mehfil': {
    checklist: [
      { title: 'Book live ghazal / qawwali singer', category: 'Music', daysBeforeEvent: 45 },
      { title: 'Arrange evening lighting & candles for ambience', category: 'Decor', daysBeforeEvent: 7 },
      { title: 'Plan seating (mehfil style — floor cushions / chairs)', category: 'Logistics', daysBeforeEvent: 7 },
      { title: 'Plan evening snacks / chai menu', category: 'Catering', daysBeforeEvent: 5 },
    ],
    vendors: [
      { name: 'Live Singer / Qawwali', category: 'Music' },
      { name: 'Evening Decor', category: 'Decor' },
    ],
    budget: [
      { category: 'Sham-e-Mehfil', description: 'Live singer / performer', estimated: 50000 },
      { category: 'Sham-e-Mehfil', description: 'Decor & ambience lighting', estimated: 25000 },
      { category: 'Sham-e-Mehfil', description: 'Snacks & chai', estimated: 15000 },
    ],
  },

  mayera: {
    checklist: [
      { title: 'Coordinate Mayera gifts with bride\'s family', category: 'Logistics', daysBeforeEvent: 14 },
      { title: 'Arrange Mayera thaal (decorated trays)', category: 'Decor', daysBeforeEvent: 5 },
      { title: 'Brief photographer on Mayera ritual sequence', category: 'Photography', daysBeforeEvent: 2 },
    ],
    vendors: [
      { name: 'Photographer', category: 'Photography' },
    ],
    budget: [
      { category: 'Mayera', description: 'Tray decoration & setup', estimated: 10000 },
    ],
  },

  sangeet: {
    checklist: [
      { title: 'Coordinate performances from both families', category: 'Operations', daysBeforeEvent: 30 },
      { title: 'Book choreographer for Sangeet', category: 'Vendors', daysBeforeEvent: 45 },
      { title: 'Book DJ / sound system for Sangeet', category: 'Music', daysBeforeEvent: 30 },
      { title: 'Arrange Sangeet stage & backdrop', category: 'Decor', daysBeforeEvent: 7 },
      { title: 'Plan Sangeet dinner menu', category: 'Catering', daysBeforeEvent: 7 },
      { title: 'Do full rehearsal 2 days before', category: 'Operations', daysBeforeEvent: 2 },
    ],
    vendors: [
      { name: 'Choreographer', category: 'Entertainment' },
      { name: 'DJ + Sound System', category: 'Music' },
      { name: 'Sangeet Decor', category: 'Decor' },
      { name: 'Caterer', category: 'Catering' },
    ],
    budget: [
      { category: 'Sangeet', description: 'Choreographer fees', estimated: 30000 },
      { category: 'Sangeet', description: 'DJ + sound', estimated: 50000 },
      { category: 'Sangeet', description: 'Stage & decor', estimated: 60000 },
      { category: 'Sangeet', description: 'Catering', estimated: 80000 },
    ],
  },

  lunch: {
    checklist: [
      { title: 'Confirm lunch menu & dietary options', category: 'Catering', daysBeforeEvent: 7 },
      { title: 'Confirm guest count with caterer', category: 'Catering', daysBeforeEvent: 3 },
      { title: 'Arrange lunch seating plan', category: 'Logistics', daysBeforeEvent: 3 },
    ],
    vendors: [
      { name: 'Caterer', category: 'Catering' },
    ],
    budget: [
      { category: 'Catering', description: 'Lunch per plate', estimated: 80000 },
    ],
  },

  dinner: {
    checklist: [
      { title: 'Confirm dinner menu & dietary options', category: 'Catering', daysBeforeEvent: 7 },
      { title: 'Confirm guest count with caterer', category: 'Catering', daysBeforeEvent: 3 },
      { title: 'Arrange dinner table layout', category: 'Logistics', daysBeforeEvent: 3 },
    ],
    vendors: [
      { name: 'Caterer', category: 'Catering' },
    ],
    budget: [
      { category: 'Catering', description: 'Dinner per plate', estimated: 100000 },
    ],
  },

  // Default fallback for any other function
  default: {
    checklist: [
      { title: 'Confirm venue & logistics', category: 'Logistics', daysBeforeEvent: 14 },
      { title: 'Confirm headcount & seating', category: 'Logistics', daysBeforeEvent: 7 },
      { title: 'Brief team on function schedule', category: 'Operations', daysBeforeEvent: 1 },
    ],
    vendors: [],
    budget: [],
  },
}

// ─── Vendor Category → Follow-up tasks ───────────────────────────────────────

export const VENDOR_FOLLOWUP: Record<string, string[]> = {
  photography: [
    'Share shot list with photographer',
    'Schedule pre-wedding briefing call',
    'Confirm photographer arrival time on wedding day',
    'Share event timeline with photographer',
  ],
  videography: [
    'Share story brief with videographer',
    'Confirm drone usage permissions at venue',
    'Confirm videographer arrival time',
  ],
  catering: [
    'Finalize menu with caterer',
    'Confirm final headcount with caterer',
    'Confirm catering setup & teardown time',
    'Arrange tasting session',
  ],
  decor: [
    'Share mood board / reference images with decorator',
    'Confirm decor setup & removal timeline',
    'Final venue walkthrough with decorator',
  ],
  music: [
    'Share playlist preferences',
    'Confirm sound check time',
    'Brief DJ on event schedule',
  ],
  mehandi: [
    'Confirm Mehandi artist arrival time',
    'Share design references with Mehandi artist',
  ],
  makeup: [
    'Schedule trial makeup session',
    'Confirm makeup start time on event day',
    'Share look references / mood board',
  ],
  transport: [
    'Confirm vehicle pickup & drop points',
    'Share guest list with transport coordinator',
    'Confirm arrival time at venue',
  ],
  pandit: [
    'Confirm pooja samagri list with pandit',
    'Confirm muhurat & arrival time',
  ],
}

// ─── Date-relative Wedding Reminders ─────────────────────────────────────────

export const DATE_REMINDERS: { daysBeforeEvent: number; title: string; category: string }[] = [
  { daysBeforeEvent: 180, title: 'Book photographer & videographer', category: 'Vendors' },
  { daysBeforeEvent: 180, title: 'Finalize venue & do site visit', category: 'Venue' },
  { daysBeforeEvent: 120, title: 'Book decorator & caterer', category: 'Vendors' },
  { daysBeforeEvent: 90,  title: 'Finalize guest list (first draft)', category: 'Guests' },
  { daysBeforeEvent: 90,  title: 'Book accommodation for out-of-town guests', category: 'Logistics' },
  { daysBeforeEvent: 60,  title: 'Send save-the-dates', category: 'Guests' },
  { daysBeforeEvent: 60,  title: 'Book all remaining vendors', category: 'Vendors' },
  { daysBeforeEvent: 45,  title: 'Finalise bridal outfit fittings', category: 'Outfits' },
  { daysBeforeEvent: 30,  title: 'Send formal invitations', category: 'Guests' },
  { daysBeforeEvent: 30,  title: 'Collect guest RSVPs & dietary requirements', category: 'Guests' },
  { daysBeforeEvent: 21,  title: 'Confirm final headcount with all vendors', category: 'Vendors' },
  { daysBeforeEvent: 14,  title: 'Complete all advance vendor payments', category: 'Budget' },
  { daysBeforeEvent: 14,  title: 'Prepare event day timeline & team assignments', category: 'Operations' },
  { daysBeforeEvent: 7,   title: 'Final walkthrough at venue with all vendors', category: 'Venue' },
  { daysBeforeEvent: 7,   title: 'Confirm transport arrangements for all guests', category: 'Logistics' },
  { daysBeforeEvent: 3,   title: 'Full team briefing — share final run-of-show', category: 'Operations' },
  { daysBeforeEvent: 2,   title: 'Confirm all vendor arrival times', category: 'Vendors' },
  { daysBeforeEvent: 1,   title: 'Pack all essentials — rings, documents, emergency kit', category: 'Logistics' },
]

// ─── Helpers ─────────────────────────────────────────────────────────────────

export function findEventTemplate(eventName: string): EventTemplate {
  const lower = eventName.toLowerCase()
  for (const [key, template] of Object.entries(EVENT_TEMPLATES)) {
    if (key === 'default') continue
    // handle hyphenated keys like 'sham-e-mehfil'
    if (lower.includes(key)) return template
  }
  return EVENT_TEMPLATES.default
}

export function findVendorFollowup(category: string): string[] {
  const lower = category.toLowerCase()
  for (const [key, tasks] of Object.entries(VENDOR_FOLLOWUP)) {
    if (lower.includes(key)) return tasks
  }
  return []
}
