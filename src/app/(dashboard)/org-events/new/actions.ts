'use server'

import { createClient, createServiceClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'

function generateCode(name: string) {
  const prefix = name.slice(0, 4).toUpperCase().replace(/\s/g, '')
  const rand = Math.random().toString(36).slice(2, 4).toUpperCase()
  return `${prefix}${rand}`
}

// ─── Template definitions ──────────────────────────────────────────────────
// Checklist tasks + budget categories seeded by event sub_type

type ChecklistTask = { category: string; task: string; days_before: number | null }
type BudgetCategory = { name: string; estimated: number }

const TEMPLATES: Record<string, { checklist: ChecklistTask[]; budget: BudgetCategory[] }> = {

  conference: {
    checklist: [
      { category: 'Venue & Logistics', task: 'Confirm venue booking and contract', days_before: 90 },
      { category: 'Venue & Logistics', task: 'Arrange AV equipment and technician', days_before: 60 },
      { category: 'Venue & Logistics', task: 'Set up registration desk', days_before: 3 },
      { category: 'Speakers', task: 'Confirm keynote speakers', days_before: 90 },
      { category: 'Speakers', task: 'Collect speaker bios and photos', days_before: 45 },
      { category: 'Speakers', task: 'Send speaker briefing document', days_before: 14 },
      { category: 'Speakers', task: 'Collect presentation files from all speakers', days_before: 3 },
      { category: 'Delegates', task: 'Open delegate registrations', days_before: 90 },
      { category: 'Delegates', task: 'Send confirmation emails to delegates', days_before: 14 },
      { category: 'Delegates', task: 'Print delegate badges', days_before: 2 },
      { category: 'Delegates', task: 'Prepare delegate kits / bags', days_before: 2 },
      { category: 'Agenda', task: 'Finalise session agenda', days_before: 30 },
      { category: 'Agenda', task: 'Publish agenda on event portal', days_before: 21 },
      { category: 'Catering', task: 'Finalise menu and catering vendor', days_before: 30 },
      { category: 'Catering', task: 'Collect dietary preferences from delegates', days_before: 14 },
      { category: 'Sponsors', task: 'Send sponsorship deck to prospects', days_before: 90 },
      { category: 'Sponsors', task: 'Finalise sponsor agreements', days_before: 45 },
      { category: 'Sponsors', task: 'Confirm sponsor deliverables and branding', days_before: 14 },
      { category: 'Communications', task: 'Send save-the-date to delegates', days_before: 60 },
      { category: 'Communications', task: 'Send event day reminder', days_before: 1 },
      { category: 'Day-of', task: 'Briefing with all volunteers and staff', days_before: 0 },
      { category: 'Day-of', task: 'Test AV and presentation systems', days_before: 0 },
    ],
    budget: [
      { name: 'Venue', estimated: 0 },
      { name: 'AV & Tech', estimated: 0 },
      { name: 'Catering', estimated: 0 },
      { name: 'Speakers (Fees & Travel)', estimated: 0 },
      { name: 'Delegate Kits', estimated: 0 },
      { name: 'Printing & Stationery', estimated: 0 },
      { name: 'Branding & Decor', estimated: 0 },
      { name: 'Photography & Video', estimated: 0 },
      { name: 'Marketing & Promotions', estimated: 0 },
      { name: 'Miscellaneous', estimated: 0 },
    ],
  },

  award_ceremony: {
    checklist: [
      { category: 'Venue & Stage', task: 'Confirm venue and stage design', days_before: 90 },
      { category: 'Venue & Stage', task: 'Arrange backdrop, podium, and lighting', days_before: 30 },
      { category: 'Venue & Stage', task: 'Sound check and AV rehearsal', days_before: 1 },
      { category: 'Awards', task: 'Finalise award categories', days_before: 90 },
      { category: 'Awards', task: 'Collect nominations and entries', days_before: 60 },
      { category: 'Awards', task: 'Jury selection and evaluation', days_before: 45 },
      { category: 'Awards', task: 'Procure trophies / mementos', days_before: 21 },
      { category: 'Guests & VIPs', task: 'Finalise guest list and VVIP list', days_before: 45 },
      { category: 'Guests & VIPs', task: 'Send invites to VIPs', days_before: 30 },
      { category: 'Guests & VIPs', task: 'Arrange VVIP escorts and protocol', days_before: 7 },
      { category: 'Run of Show', task: 'Draft detailed run of show', days_before: 14 },
      { category: 'Run of Show', task: 'Share run of show with MC / anchor', days_before: 7 },
      { category: 'Sponsors', task: 'Finalise title sponsor', days_before: 90 },
      { category: 'Entertainment', task: 'Book anchor / MC', days_before: 60 },
      { category: 'Entertainment', task: 'Book performance act', days_before: 45 },
      { category: 'Day-of', task: 'Red carpet / entry setup', days_before: 0 },
      { category: 'Day-of', task: 'Backstage coordination briefing', days_before: 0 },
    ],
    budget: [
      { name: 'Venue', estimated: 0 },
      { name: 'Stage & Decor', estimated: 0 },
      { name: 'AV & Lighting', estimated: 0 },
      { name: 'Trophies & Mementos', estimated: 0 },
      { name: 'Anchor / MC', estimated: 0 },
      { name: 'Entertainment', estimated: 0 },
      { name: 'Catering', estimated: 0 },
      { name: 'Photography & Video', estimated: 0 },
      { name: 'Branding & Printing', estimated: 0 },
      { name: 'Sponsors (Receivable)', estimated: 0 },
    ],
  },

  concert: {
    checklist: [
      { category: 'Artists', task: 'Confirm artist/band booking', days_before: 90 },
      { category: 'Artists', task: 'Receive tech rider from artist', days_before: 60 },
      { category: 'Artists', task: 'Arrange hospitality per rider', days_before: 14 },
      { category: 'Artists', task: 'Confirm artist travel and accommodation', days_before: 14 },
      { category: 'Artists', task: 'Soundcheck scheduled', days_before: 1 },
      { category: 'Venue & Production', task: 'Confirm venue booking', days_before: 90 },
      { category: 'Venue & Production', task: 'Main stage and PA system setup', days_before: 3 },
      { category: 'Venue & Production', task: 'Lighting rig installation', days_before: 2 },
      { category: 'Venue & Production', task: 'Barricade and crowd management setup', days_before: 1 },
      { category: 'Ticketing', task: 'Set up ticketing platform', days_before: 60 },
      { category: 'Ticketing', task: 'Launch ticket sales', days_before: 45 },
      { category: 'Ticketing', task: 'Set up box office / gate management', days_before: 2 },
      { category: 'Security', task: 'Hire security personnel', days_before: 30 },
      { category: 'Security', task: 'Security briefing', days_before: 1 },
      { category: 'Day-of', task: 'Gates open and crowd management active', days_before: 0 },
      { category: 'Day-of', task: 'Artist arrival and dressing room check', days_before: 0 },
    ],
    budget: [
      { name: 'Artist Fee', estimated: 0 },
      { name: 'Venue', estimated: 0 },
      { name: 'Stage & Production', estimated: 0 },
      { name: 'AV & Lighting', estimated: 0 },
      { name: 'Security', estimated: 0 },
      { name: 'Hospitality (Artist)', estimated: 0 },
      { name: 'Marketing & Ticketing', estimated: 0 },
      { name: 'Staffing & Volunteers', estimated: 0 },
      { name: 'Catering & F&B', estimated: 0 },
      { name: 'Miscellaneous', estimated: 0 },
    ],
  },

  state_function: {
    checklist: [
      { category: 'Protocol', task: 'Confirm dignitaries and protocol order', days_before: 30 },
      { category: 'Protocol', task: 'Prepare seating chart and name plates', days_before: 7 },
      { category: 'Protocol', task: 'Arrange VVIP escorts and security', days_before: 7 },
      { category: 'Protocol', task: 'Brief all officials on protocol order', days_before: 2 },
      { category: 'Venue & Setup', task: 'Confirm venue with state authorities', days_before: 60 },
      { category: 'Venue & Setup', task: 'Stage, dais, and podium setup', days_before: 3 },
      { category: 'Venue & Setup', task: 'National flag and floral arrangements', days_before: 1 },
      { category: 'Security', task: 'Coordinate with SPG / Z+ security teams', days_before: 14 },
      { category: 'Security', task: 'Route survey and motorcade plan', days_before: 7 },
      { category: 'Media', task: 'Press accreditation for media', days_before: 14 },
      { category: 'Media', task: 'Media briefing and press release', days_before: 1 },
      { category: 'Day-of', task: 'Final security walkthrough', days_before: 0 },
      { category: 'Day-of', task: 'Welcome delegation at entrance', days_before: 0 },
    ],
    budget: [
      { name: 'Venue & Logistics', estimated: 0 },
      { name: 'Stage & Decor', estimated: 0 },
      { name: 'Security', estimated: 0 },
      { name: 'Protocol & Hospitality', estimated: 0 },
      { name: 'Catering', estimated: 0 },
      { name: 'Media & Documentation', estimated: 0 },
      { name: 'Printing & Stationery', estimated: 0 },
      { name: 'Miscellaneous', estimated: 0 },
    ],
  },

  product_launch: {
    checklist: [
      { category: 'Venue & Experience', task: 'Confirm venue and experiential setup', days_before: 60 },
      { category: 'Venue & Experience', task: 'Brand installation and demo stations', days_before: 7 },
      { category: 'Media & PR', task: 'Finalize media and influencer invite list', days_before: 45 },
      { category: 'Media & PR', task: 'Send press invites', days_before: 21 },
      { category: 'Media & PR', task: 'Prepare press kits', days_before: 7 },
      { category: 'Content', task: 'Product demo script finalized', days_before: 14 },
      { category: 'Content', task: 'Presentation / video content ready', days_before: 7 },
      { category: 'Live Streaming', task: 'Set up live stream platform', days_before: 14 },
      { category: 'Guests', task: 'Final RSVP count confirmed', days_before: 5 },
      { category: 'Day-of', task: 'Media check-in and seating', days_before: 0 },
      { category: 'Day-of', task: 'Product reveal on cue', days_before: 0 },
    ],
    budget: [
      { name: 'Venue', estimated: 0 },
      { name: 'Brand & Experiential Setup', estimated: 0 },
      { name: 'AV & Live Stream', estimated: 0 },
      { name: 'Catering', estimated: 0 },
      { name: 'Photography & Video', estimated: 0 },
      { name: 'PR & Media', estimated: 0 },
      { name: 'Gifting (Media Kits)', estimated: 0 },
      { name: 'Miscellaneous', estimated: 0 },
    ],
  },

  team_building: {
    checklist: [
      { category: 'Accommodation', task: 'Book resort / venue and rooms', days_before: 60 },
      { category: 'Accommodation', task: 'Send room allocation to attendees', days_before: 7 },
      { category: 'Activities', task: 'Finalize activity plan and facilitators', days_before: 30 },
      { category: 'Transport', task: 'Arrange bus / vehicle for participants', days_before: 14 },
      { category: 'Transport', task: 'Share transport schedule', days_before: 3 },
      { category: 'Meals', task: 'Confirm meal plan with venue', days_before: 14 },
      { category: 'Communication', task: 'Send offsite briefing to all attendees', days_before: 7 },
      { category: 'Day-of', task: 'Check-in and room allocation', days_before: 0 },
      { category: 'Day-of', task: 'Induction and activity kickoff', days_before: 0 },
    ],
    budget: [
      { name: 'Accommodation', estimated: 0 },
      { name: 'Transport', estimated: 0 },
      { name: 'Activities & Facilitators', estimated: 0 },
      { name: 'Meals', estimated: 0 },
      { name: 'Miscellaneous', estimated: 0 },
    ],
  },

  felicitation: {
    checklist: [
      { category: 'Guests', task: 'Finalize list of honorees', days_before: 30 },
      { category: 'Guests', task: 'Send invitations to honorees and guests', days_before: 21 },
      { category: 'Gifts & Mementos', task: 'Procure mementos / shaals for honorees', days_before: 14 },
      { category: 'Programme', task: 'Finalize programme order', days_before: 14 },
      { category: 'Programme', task: 'Cultural performance confirmed', days_before: 14 },
      { category: 'Venue', task: 'Confirm venue and seating arrangement', days_before: 30 },
      { category: 'Day-of', task: 'Guest reception and seating', days_before: 0 },
      { category: 'Day-of', task: 'Felicitation ceremony on schedule', days_before: 0 },
    ],
    budget: [
      { name: 'Venue', estimated: 0 },
      { name: 'Mementos & Gifts', estimated: 0 },
      { name: 'Catering', estimated: 0 },
      { name: 'Stage & Decor', estimated: 0 },
      { name: 'Cultural Programme', estimated: 0 },
      { name: 'Printing & Invitations', estimated: 0 },
      { name: 'Miscellaneous', estimated: 0 },
    ],
  },

  sports: {
    checklist: [
      { category: 'Registrations', task: 'Open participant registrations', days_before: 90 },
      { category: 'Registrations', task: 'Close registrations and confirm count', days_before: 14 },
      { category: 'Route & Logistics', task: 'Finalize route and get permissions', days_before: 60 },
      { category: 'Route & Logistics', task: 'Set up water stations along route', days_before: 2 },
      { category: 'Volunteers', task: 'Recruit volunteers', days_before: 30 },
      { category: 'Volunteers', task: 'Volunteer briefing and zone assignment', days_before: 2 },
      { category: 'Medical', task: 'Arrange medical teams and ambulance', days_before: 14 },
      { category: 'Medals & Prizes', task: 'Procure medals and certificates', days_before: 21 },
      { category: 'Day-of', task: 'Bib distribution and chip timing setup', days_before: 0 },
      { category: 'Day-of', task: 'Flag-off ceremony', days_before: 0 },
    ],
    budget: [
      { name: 'Venue & Route Management', estimated: 0 },
      { name: 'Medals & Prizes', estimated: 0 },
      { name: 'Timing & Registration Tech', estimated: 0 },
      { name: 'Medical Support', estimated: 0 },
      { name: 'Volunteers (T-Shirts etc)', estimated: 0 },
      { name: 'Catering & Hydration', estimated: 0 },
      { name: 'Marketing', estimated: 0 },
      { name: 'Miscellaneous', estimated: 0 },
    ],
  },

  brand_activation: {
    checklist: [
      { category: 'Permissions & Compliance', task: 'Get location/mall/authority permission', days_before: 30 },
      { category: 'Permissions & Compliance', task: 'Brand approval and artwork sign-off', days_before: 14 },
      { category: 'Setup & Infra', task: 'Confirm fabricator for stall / setup', days_before: 21 },
      { category: 'Setup & Infra', task: 'Production and delivery of setup material', days_before: 7 },
      { category: 'Setup & Infra', task: 'Stall installation at venue', days_before: 1 },
      { category: 'Promoters', task: 'Hire and confirm promoters / brand ambassadors', days_before: 14 },
      { category: 'Promoters', task: 'Promoter briefing and product training', days_before: 2 },
      { category: 'Promoters', task: 'Uniform / T-shirt delivery to promoters', days_before: 2 },
      { category: 'Inventory & Sampling', task: 'Confirm product / sample inventory at warehouse', days_before: 7 },
      { category: 'Inventory & Sampling', task: 'Dispatch inventory to activation location', days_before: 2 },
      { category: 'Data Collection', task: 'Set up lead capture form / QR code', days_before: 7 },
      { category: 'Data Collection', task: 'Test data collection process end-to-end', days_before: 1 },
      { category: 'Day-of', task: 'Supervisor on ground — setup check', days_before: 0 },
      { category: 'Day-of', task: 'Footfall and sampling count reporting', days_before: 0 },
      { category: 'Reporting', task: 'Daily report sent to client', days_before: null },
      { category: 'Reporting', task: 'Final activity report with photos and data', days_before: null },
    ],
    budget: [
      { name: 'Venue / Location Charges', estimated: 0 },
      { name: 'Stall Fabrication & Setup', estimated: 0 },
      { name: 'Branding & POS Material', estimated: 0 },
      { name: 'Promoters & Supervisors', estimated: 0 },
      { name: 'Inventory / Product Samples', estimated: 0 },
      { name: 'Logistics & Transport', estimated: 0 },
      { name: 'Photographer / Videographer', estimated: 0 },
      { name: 'Miscellaneous', estimated: 0 },
    ],
  },

  sampling_campaign: {
    checklist: [
      { category: 'Planning', task: 'Finalize target locations and route plan', days_before: 21 },
      { category: 'Planning', task: 'Get permissions for each sampling location', days_before: 14 },
      { category: 'Inventory', task: 'Confirm sample quantity with client', days_before: 14 },
      { category: 'Inventory', task: 'Inventory received and quality checked', days_before: 5 },
      { category: 'Inventory', task: 'Kits packed and dispatched to field teams', days_before: 2 },
      { category: 'Promoters', task: 'Hire promoters for each location', days_before: 14 },
      { category: 'Promoters', task: 'Product briefing and sampling SOP training', days_before: 2 },
      { category: 'Promoters', task: 'Uniform / caps / ID cards distributed', days_before: 1 },
      { category: 'Data & Reporting', task: 'Daily sampling tally sheet setup', days_before: 3 },
      { category: 'Data & Reporting', task: 'WhatsApp group for field reporting active', days_before: 1 },
      { category: 'Day-of', task: 'Field supervisor check-in at each location', days_before: 0 },
      { category: 'Day-of', task: 'Morning count of samples dispatched', days_before: 0 },
      { category: 'Reporting', task: 'End-of-day samples distributed count', days_before: null },
      { category: 'Reporting', task: 'Final campaign report with geo-tagged photos', days_before: null },
    ],
    budget: [
      { name: 'Promoters & Supervisors', estimated: 0 },
      { name: 'Sampling Kits / Packaging', estimated: 0 },
      { name: 'Product / Samples (Inventory)', estimated: 0 },
      { name: 'Transport & Logistics', estimated: 0 },
      { name: 'Permissions & Local Charges', estimated: 0 },
      { name: 'Uniforms & Branding Material', estimated: 0 },
      { name: 'Photography & Reporting', estimated: 0 },
      { name: 'Miscellaneous', estimated: 0 },
    ],
  },

  roadshow: {
    checklist: [
      { category: 'Planning', task: 'Finalize cities and activation schedule', days_before: 30 },
      { category: 'Planning', task: 'Confirm location/venue in each city', days_before: 21 },
      { category: 'Vehicle & Setup', task: 'Book and brand the activity vehicle / van', days_before: 21 },
      { category: 'Vehicle & Setup', task: 'Vehicle wrap / branding installed', days_before: 7 },
      { category: 'Vehicle & Setup', task: 'AV / generator / equipment loaded in van', days_before: 2 },
      { category: 'Permissions', task: 'Local authority permission for each city', days_before: 14 },
      { category: 'Team', task: 'Hire city-wise promoters and supervisors', days_before: 14 },
      { category: 'Team', task: 'Team briefing and SOPs shared', days_before: 3 },
      { category: 'Inventory', task: 'Product / sample inventory dispatched city-wise', days_before: 5 },
      { category: 'Day-of', task: 'Vehicle departs on schedule', days_before: 0 },
      { category: 'Day-of', task: 'Setup at location and activity live', days_before: 0 },
      { category: 'Reporting', task: 'City-wise daily report to client', days_before: null },
      { category: 'Reporting', task: 'Final roadshow report with all city data', days_before: null },
    ],
    budget: [
      { name: 'Vehicle Hire & Branding', estimated: 0 },
      { name: 'Fuel & Transport', estimated: 0 },
      { name: 'Promoters & Supervisors', estimated: 0 },
      { name: 'Accommodation (Team)', estimated: 0 },
      { name: 'Inventory / Samples', estimated: 0 },
      { name: 'Permissions & Local Charges', estimated: 0 },
      { name: 'AV & Equipment', estimated: 0 },
      { name: 'Miscellaneous', estimated: 0 },
    ],
  },

  mall_activation: {
    checklist: [
      { category: 'Mall Permissions', task: 'Get mall management approval and booking', days_before: 30 },
      { category: 'Mall Permissions', task: 'Submit brand/artwork to mall for approval', days_before: 21 },
      { category: 'Mall Permissions', task: 'Confirm space dimensions and power points', days_before: 14 },
      { category: 'Setup', task: 'Fabricator briefing and stall design finalized', days_before: 21 },
      { category: 'Setup', task: 'Stall fabrication completed', days_before: 5 },
      { category: 'Setup', task: 'Stall installation at mall', days_before: 1 },
      { category: 'Promoters', task: 'Hire promoters (per shift)', days_before: 14 },
      { category: 'Promoters', task: 'Promoter briefing at mall location', days_before: 1 },
      { category: 'Contest / Engagement', task: 'Contest mechanics and prizes confirmed', days_before: 14 },
      { category: 'Contest / Engagement', task: 'QR / spin wheel / digital activity tested', days_before: 1 },
      { category: 'Day-of', task: 'Morning setup check before mall opens', days_before: 0 },
      { category: 'Reporting', task: 'Daily footfall and participation report', days_before: null },
    ],
    budget: [
      { name: 'Mall Space Rental', estimated: 0 },
      { name: 'Stall Fabrication', estimated: 0 },
      { name: 'Branding & POS Material', estimated: 0 },
      { name: 'Promoters', estimated: 0 },
      { name: 'Contest Prizes / Gifts', estimated: 0 },
      { name: 'Logistics', estimated: 0 },
      { name: 'Miscellaneous', estimated: 0 },
    ],
  },

  van_campaign: {
    checklist: [
      { category: 'Planning', task: 'Finalize village / town list and route', days_before: 21 },
      { category: 'Planning', task: 'Get local authority permissions (if needed)', days_before: 14 },
      { category: 'Vehicle', task: 'Book and brand campaign van', days_before: 14 },
      { category: 'Vehicle', task: 'PA system, generator, and equipment loaded', days_before: 2 },
      { category: 'Team', task: 'Hire local promoters and van crew', days_before: 14 },
      { category: 'Team', task: 'Team briefing and product training', days_before: 2 },
      { category: 'Inventory', task: 'Product samples / demonstration material loaded', days_before: 2 },
      { category: 'Day-of', task: 'Van departs on time as per route plan', days_before: 0 },
      { category: 'Day-of', task: 'Activity at each village on schedule', days_before: 0 },
      { category: 'Reporting', task: 'Village-wise coverage report with photos', days_before: null },
    ],
    budget: [
      { name: 'Van Hire & Branding', estimated: 0 },
      { name: 'Fuel', estimated: 0 },
      { name: 'Crew & Local Promoters', estimated: 0 },
      { name: 'Inventory / Samples', estimated: 0 },
      { name: 'PA System & Equipment', estimated: 0 },
      { name: 'Miscellaneous', estimated: 0 },
    ],
  },

  rwa_activation: {
    checklist: [
      { category: 'Permissions', task: 'Get RWA / society president approval', days_before: 14 },
      { category: 'Permissions', task: 'Confirm entry date, time, and gate access', days_before: 7 },
      { category: 'Setup', task: 'Canopy / table setup material arranged', days_before: 3 },
      { category: 'Team', task: 'Hire local promoters for each society', days_before: 7 },
      { category: 'Team', task: 'Promoter briefing with product demo', days_before: 1 },
      { category: 'Inventory', task: 'Samples and kits loaded in vehicle', days_before: 1 },
      { category: 'Day-of', task: 'Entry at gate and setup before activity time', days_before: 0 },
      { category: 'Day-of', task: 'Activity runs as per schedule', days_before: 0 },
      { category: 'Reporting', task: 'Society-wise count and photo report', days_before: null },
    ],
    budget: [
      { name: 'RWA Permission / Charges', estimated: 0 },
      { name: 'Promoters', estimated: 0 },
      { name: 'Inventory / Samples', estimated: 0 },
      { name: 'Setup Material', estimated: 0 },
      { name: 'Transport', estimated: 0 },
      { name: 'Miscellaneous', estimated: 0 },
    ],
  },

  kiosk_campaign: {
    checklist: [
      { category: 'Location', task: 'Confirm kiosk location and duration', days_before: 21 },
      { category: 'Location', task: 'Get permissions from location authority', days_before: 14 },
      { category: 'Setup', task: 'Kiosk design and fabrication', days_before: 14 },
      { category: 'Setup', task: 'Kiosk installed and tested at location', days_before: 1 },
      { category: 'Team', task: 'Hire kiosk staff (per shift)', days_before: 14 },
      { category: 'Team', task: 'Staff briefing and SOP training', days_before: 1 },
      { category: 'Lead Capture', task: 'Lead form / tablet / QR code set up', days_before: 3 },
      { category: 'Inventory', task: 'Product / brochures / gifts stocked at kiosk', days_before: 1 },
      { category: 'Day-of', task: 'Kiosk open on time with full staff', days_before: 0 },
      { category: 'Reporting', task: 'Daily leads and footfall report', days_before: null },
    ],
    budget: [
      { name: 'Location / Space Charges', estimated: 0 },
      { name: 'Kiosk Fabrication', estimated: 0 },
      { name: 'Branding & Signage', estimated: 0 },
      { name: 'Staff', estimated: 0 },
      { name: 'Inventory / Gifts', estimated: 0 },
      { name: 'Technology (Lead Capture)', estimated: 0 },
      { name: 'Miscellaneous', estimated: 0 },
    ],
  },

  ipl_activation: {
    checklist: [
      { category: 'Rights & Permissions', task: 'Stadium / franchise activation rights confirmed', days_before: 30 },
      { category: 'Rights & Permissions', task: 'BCCI / franchise approval for branding', days_before: 21 },
      { category: 'Setup', task: 'Fan zone design and fabrication', days_before: 14 },
      { category: 'Setup', task: 'Setup installed at stadium / fan zone area', days_before: 1 },
      { category: 'Team', task: 'Hire brand ambassadors and fan zone hosts', days_before: 14 },
      { category: 'Team', task: 'Team briefing and activity SOP', days_before: 2 },
      { category: 'Activities', task: 'Fan engagement activities / games confirmed', days_before: 14 },
      { category: 'Sampling', task: 'Sampling inventory at venue', days_before: 1 },
      { category: 'Security', task: 'Coordinate entry passes with stadium security', days_before: 7 },
      { category: 'Day-of', task: 'Setup ready before gates open', days_before: 0 },
      { category: 'Reporting', task: 'Match-day footfall and activation report', days_before: null },
    ],
    budget: [
      { name: 'Activation Rights / Franchise Fee', estimated: 0 },
      { name: 'Fan Zone Setup & Branding', estimated: 0 },
      { name: 'Brand Ambassadors / Hosts', estimated: 0 },
      { name: 'Sampling & Inventory', estimated: 0 },
      { name: 'Security & Entry Passes', estimated: 0 },
      { name: 'Photography & Content', estimated: 0 },
      { name: 'Miscellaneous', estimated: 0 },
    ],
  },

  // Default fallback for types without specific templates
  _default: {
    checklist: [
      { category: 'Venue & Logistics', task: 'Confirm venue booking', days_before: 90 },
      { category: 'Venue & Logistics', task: 'Finalize vendors list', days_before: 60 },
      { category: 'Venue & Logistics', task: 'On-site setup walkthrough', days_before: 1 },
      { category: 'Guests', task: 'Finalize guest list', days_before: 30 },
      { category: 'Guests', task: 'Send invitations', days_before: 21 },
      { category: 'Guests', task: 'Confirm RSVPs', days_before: 7 },
      { category: 'Catering', task: 'Finalize menu and catering vendor', days_before: 30 },
      { category: 'Programme', task: 'Finalize programme / agenda', days_before: 14 },
      { category: 'Communications', task: 'Send event reminder', days_before: 2 },
      { category: 'Day-of', task: 'Team briefing', days_before: 0 },
      { category: 'Day-of', task: 'Guest reception', days_before: 0 },
    ],
    budget: [
      { name: 'Venue', estimated: 0 },
      { name: 'Catering', estimated: 0 },
      { name: 'AV & Tech', estimated: 0 },
      { name: 'Decor', estimated: 0 },
      { name: 'Photography & Video', estimated: 0 },
      { name: 'Printing & Stationery', estimated: 0 },
      { name: 'Miscellaneous', estimated: 0 },
    ],
  },
}

// ─── Create event action ───────────────────────────────────────────────────

export async function createOrgEvent(data: {
  name: string
  description: string | null
  type: 'corporate' | 'government' | 'public'
  sub_type: string
  start_date: string | null
  end_date: string | null
  venue: string | null
  city: string | null
  expected_count: number
  budget_total: number
}) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated' }

  const { data: member } = await supabase
    .from('company_members')
    .select('company_id, role')
    .eq('user_id', user.id)
    .single()
  if (!member) return { error: 'No access' }
  if (member.role === 'coordinator') return { error: 'Only owners and admins can create events' }

  const sc = createServiceClient()
  const event_code = generateCode(data.name)

  const { data: event, error } = await sc
    .from('org_events')
    .insert({
      company_id: member.company_id,
      event_code,
      name: data.name,
      description: data.description,
      type: data.type,
      sub_type: data.sub_type,
      start_date: data.start_date,
      end_date: data.end_date,
      venue: data.venue,
      city: data.city,
      expected_count: data.expected_count,
      budget_total: data.budget_total,
    })
    .select('id')
    .single()

  if (error) return { error: error.message }

  const eventId = event.id

  // ── Seed templates ───────────────────────────────────────────────────────
  const template = TEMPLATES[data.sub_type] ?? TEMPLATES['_default']

  await Promise.all([
    // Checklist items
    sc.from('org_checklist_items').insert(
      template.checklist.map((item, i) => ({
        org_event_id: eventId,
        category: item.category,
        task: item.task,
        days_before: item.days_before,
        order: i,
        status: 'pending',
      }))
    ),
    // Budget categories
    sc.from('org_budget_categories').insert(
      template.budget.map((cat, i) => ({
        org_event_id: eventId,
        name: cat.name,
        estimated: cat.estimated,
        order: i,
      }))
    ),
  ])

  redirect(`/org-events/${eventId}/overview`)
}
