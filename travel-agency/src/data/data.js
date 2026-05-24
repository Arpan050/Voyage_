export const PACKAGES = [
  {
    id: 1, name: "Santorini Escape", destination: "Greece", region: "europe",
    emoji: "🏛️", badge: "Bestseller", duration: "8 Days", groupSize: "2–12",
    price: 2890,
    desc: "Whitewashed villages, volcanic caldera sunsets, and Aegean sea treasures await.",
    highlights: ["Caldera View Hotel", "Wine Tasting", "Akrotiri Ruins", "Sunset Sailing"],
    bg: "linear-gradient(135deg,#1a3050,#2d4a6e)",
  },
  {
    id: 2, name: "Rajasthan Royal", destination: "India", region: "asia",
    emoji: "🕌", badge: "Heritage", duration: "10 Days", groupSize: "4–16",
    price: 1650,
    desc: "Majestic forts, desert camel treks, and royal palaces across the land of kings.",
    highlights: ["Jaipur Palace Tour", "Desert Camp", "Udaipur Lake Cruise", "Jodhpur Blue City"],
    bg: "linear-gradient(135deg,#3d1e2a,#6e2d4a)",
  },
  {
    id: 3, name: "Kyoto in Bloom", destination: "Japan", region: "asia",
    emoji: "🌸", badge: "Seasonal", duration: "7 Days", groupSize: "2–10",
    price: 3200,
    desc: "Cherry blossom season through ancient temples, zen gardens, and traditional ryokans.",
    highlights: ["Arashiyama Bamboo", "Tea Ceremony", "Fushimi Inari", "Gion Night Walk"],
    bg: "linear-gradient(135deg,#2d1e3d,#5a2d6e)",
  },
  {
    id: 4, name: "Patagonia Trek", destination: "Argentina & Chile", region: "americas",
    emoji: "🏔️", badge: "Adventure", duration: "12 Days", groupSize: "6–14",
    price: 4100,
    desc: "Raw wilderness, glacier fields, and the iconic towers of Torres del Paine.",
    highlights: ["W Circuit Trek", "Grey Glacier", "El Chalten Hike", "Perito Moreno"],
    bg: "linear-gradient(135deg,#1e3d2a,#2d6e4a)",
  },
  {
    id: 5, name: "Amalfi Coast Drive", destination: "Italy", region: "europe",
    emoji: "🍋", badge: "Luxury", duration: "9 Days", groupSize: "2–8",
    price: 3750,
    desc: "Cliff-side villages, turquoise coves, and limoncello evenings along Italy's most dramatic coast.",
    highlights: ["Positano Beaches", "Pompeii Day", "Capri Ferry", "Private Villa Stay"],
    bg: "linear-gradient(135deg,#3d2a1e,#6e4a2d)",
  },
  {
    id: 6, name: "Serengeti Safari", destination: "Tanzania", region: "africa",
    emoji: "🦁", badge: "Wildlife", duration: "11 Days", groupSize: "4–12",
    price: 5200,
    desc: "Witness the Great Migration and big five game drives across endless golden savanna.",
    highlights: ["Ngorongoro Crater", "Hot Air Balloon", "Maasai Village", "Zanzibar Extension"],
    bg: "linear-gradient(135deg,#2a1e3d,#4a2d6e)",
  },
];

export const BOOKINGS = [
  { id:"TRP-001", customer:"Arjun Sharma",  package:"Santorini Escape",  date:"Mar 12, 2025", amount:"₹2,40,000", status:"confirmed" },
  { id:"TRP-002", customer:"Meera Iyer",    package:"Kyoto in Bloom",    date:"Mar 15, 2025", amount:"₹2,65,000", status:"pending"   },
  { id:"TRP-003", customer:"Rohit Verma",   package:"Serengeti Safari",  date:"Mar 18, 2025", amount:"₹4,32,000", status:"confirmed" },
  { id:"TRP-004", customer:"Sneha Das",     package:"Amalfi Coast Drive",date:"Mar 20, 2025", amount:"₹3,12,000", status:"cancelled" },
  { id:"TRP-005", customer:"Vikram Nair",   package:"Patagonia Trek",    date:"Mar 22, 2025", amount:"₹3,40,000", status:"pending"   },
];

export const DESTINATIONS = [
  { name:"Southeast Asia", count:"24 Packages", bg:"#2d4a3e", emoji:"🌴" },
  { name:"Mediterranean",  count:"18 Packages", bg:"#1a3050", emoji:"⛵" },
  { name:"South America",  count:"12 Packages", bg:"#3d2a1e", emoji:"🌿" },
  { name:"East Africa",    count:"9 Packages",  bg:"#2a1e3d", emoji:"🦓" },
  { name:"Japan & Korea",  count:"15 Packages", bg:"#1e2d3d", emoji:"⛩️" },
];

export const REVIEWS = [
  { stars:5, text:"The Santorini package exceeded every expectation. Every detail was handled — transfers, guides, reservations. We just showed up and experienced.", author:"Priya M.", trip:"Santorini Escape" },
  { stars:5, text:"Our Rajasthan trip felt genuinely immersive. The desert camp under the stars was the highlight of our lives. Will book again in a heartbeat.", author:"David & Lisa K.", trip:"Rajasthan Royal" },
  { stars:5, text:"I've done expedition travel before but the Patagonia trek curation here was next level. The guides knew every trail and weather window perfectly.", author:"Carlos R.", trip:"Patagonia Trek" },
];
