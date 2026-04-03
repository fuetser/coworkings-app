export type Coworking = {
  id: string;
  name: string;
  district: string;
  address: string;
  priceFrom: number;
  rating: number;
  isOpenNow: boolean;
  amenities: string[];
  tags: string[];
  description: string;
};

export const coworkings: Coworking[] = [
  {
    id: "cw-1",
    name: "North Star Collective",
    district: "Central District",
    address: "14 Nevsky Avenue",
    priceFrom: 18,
    rating: 4.9,
    isOpenNow: true,
    amenities: ["Meeting Rooms", "Coffee Bar", "24/7 Access", "Phone Booths"],
    tags: ["Popular", "Quiet Focus"],
    description:
      "Warm lounge-style coworking with quiet booths, strong coffee, and fast Wi-Fi for deep work.",
  },
  {
    id: "cw-2",
    name: "Riverbank Hub",
    district: "Petrograd Side",
    address: "8 Aptekarskaya Embankment",
    priceFrom: 16,
    rating: 4.7,
    isOpenNow: true,
    amenities: ["Parking", "Pet Friendly", "Coffee Bar", "Event Space"],
    tags: ["Creative", "Community"],
    description:
      "Bright industrial space near the river with flexible desks, community events, and easy parking.",
  },
  {
    id: "cw-3",
    name: "Atlas Workroom",
    district: "Vasilievsky Island",
    address: "27 Bolshoy Prospect",
    priceFrom: 20,
    rating: 4.8,
    isOpenNow: false,
    amenities: ["Meeting Rooms", "Monitor Rental", "Phone Booths"],
    tags: ["Premium", "Teams"],
    description:
      "A polished workspace for small teams with reservable meeting rooms and ergonomic setups.",
  },
  {
    id: "cw-4",
    name: "Loft 189",
    district: "Central District",
    address: "189 Ligovsky Prospect",
    priceFrom: 14,
    rating: 4.5,
    isOpenNow: true,
    amenities: ["Coffee Bar", "Event Space", "Standing Desks"],
    tags: ["Budget Friendly", "Events"],
    description:
      "Affordable loft-style coworking with standing desks, workshops, and a lively social energy.",
  },
  {
    id: "cw-5",
    name: "Harbor Desk Club",
    district: "Admiralteysky",
    address: "6 Galernaya Street",
    priceFrom: 19,
    rating: 4.6,
    isOpenNow: false,
    amenities: ["24/7 Access", "Parking", "Meeting Rooms", "Shower"],
    tags: ["Early Birds", "Remote Teams"],
    description:
      "Calm workspace close to the historic center with all-day access and practical amenities.",
  },
  {
    id: "cw-6",
    name: "Garden Lane Cowork",
    district: "Moscow District",
    address: "33 Moskovsky Avenue",
    priceFrom: 17,
    rating: 4.8,
    isOpenNow: true,
    amenities: ["Coffee Bar", "Phone Booths", "Standing Desks", "Monitor Rental"],
    tags: ["Design Forward", "Hybrid Work"],
    description:
      "Green accents, acoustic booths, and flexible day passes make this a balanced spot for hybrid work.",
  },
];
