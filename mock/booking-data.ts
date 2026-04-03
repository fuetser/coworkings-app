export type Workspace = {
  id: string;
  name: string;
  floor: string;
  location: string;
  available: boolean;
  amenities: string[];
  seats: string;
  seatType: string;
  capacity: string;
  summaryLabel: string;
  zone: string;
  statusLabel: string;
  statusTone: "available" | "freeNow" | "reserved";
  availabilityNote: string;
  cardFeatures: Array<{
    label: string;
    icon: "desk" | "socket" | "monitor" | "meeting" | "window" | "quiet";
  }>;
  ctaLabel: string;
  seatCategory: "Regular Seat" | "Quiet Seat" | "Standing Desk";
  filterAmenities: string[];
  availableTimeSlots: string[];
};

export type BookingStatus = "confirmed" | "cancelled";

export type Booking = {
  id: string;
  workspaceId: string;
  dateLabel: string;
  dateValue: string;
  time: string;
  duration: string;
  location: string;
  status: BookingStatus;
};

export const workspaces: Workspace[] = [
  {
    id: "1",
    name: "Desk 12 - Zone A",
    floor: "Floor 3",
    location: "Office Layout Overview",
    available: true,
    amenities: ["Regular Seat", "Socket"],
    seats: "1 seat",
    seatType: "Regular Seat",
    capacity: "1 person",
    summaryLabel: "Desk 12 - Zone A",
    zone: "Zone A",
    statusLabel: "Available",
    statusTone: "available",
    availabilityNote: "Available for 4h (until 2 PM)",
    cardFeatures: [
      { label: "Regular Seat", icon: "desk" },
      { label: "Socket", icon: "socket" },
    ],
    ctaLabel: "Book Now",
    seatCategory: "Regular Seat",
    filterAmenities: ["Power Socket"],
    availableTimeSlots: [
      "Today, 10:00 AM - 12:00 PM",
      "Today, 2:00 PM - 4:00 PM",
    ],
  },
  {
    id: "2",
    name: "Meeting Room C - Zone B",
    floor: "Floor 3",
    location: "Meeting Room C",
    available: true,
    amenities: ["Meeting Room", "Monitor"],
    seats: "6 seats",
    seatType: "Standing Desk",
    capacity: "6 people",
    summaryLabel: "Meeting Room C - Zone B",
    zone: "Zone B",
    statusLabel: "Free Now",
    statusTone: "freeNow",
    availabilityNote: "Seats 6 people, 1h 30m remaining",
    cardFeatures: [
      { label: "Meeting Room", icon: "meeting" },
      { label: "Monitor", icon: "monitor" },
    ],
    ctaLabel: "Book Now",
    seatCategory: "Standing Desk",
    filterAmenities: ["Dual Monitor"],
    availableTimeSlots: ["Today, 2:00 PM - 4:00 PM"],
  },
  {
    id: "3",
    name: "Desk 05 - Zone A",
    floor: "Floor 2",
    location: "North Wing",
    available: false,
    amenities: ["Regular Seat", "Window"],
    seats: "1 seat",
    seatType: "Window Seat",
    capacity: "1 person",
    summaryLabel: "Desk 05 - Zone A",
    zone: "Zone A",
    statusLabel: "Reserved",
    statusTone: "reserved",
    availabilityNote: "Reserved by John D. until 1 PM",
    cardFeatures: [
      { label: "Regular Seat", icon: "desk" },
      { label: "Window", icon: "window" },
    ],
    ctaLabel: "Booked",
    seatCategory: "Regular Seat",
    filterAmenities: ["Window View"],
    availableTimeSlots: ["Today, 10:00 AM - 12:00 PM"],
  },
  {
    id: "4",
    name: "Desk 18 - Quiet Zone",
    floor: "Floor 4",
    location: "Library Corner",
    available: true,
    amenities: ["Quiet Seat"],
    seats: "1 seat",
    seatType: "Quiet Seat",
    capacity: "1 person",
    summaryLabel: "Desk 18 - Quiet Zone",
    zone: "Quiet Zone",
    statusLabel: "Available",
    statusTone: "available",
    availabilityNote: "Available all day",
    cardFeatures: [{ label: "Quiet Seat", icon: "quiet" }],
    ctaLabel: "Book Now",
    seatCategory: "Quiet Seat",
    filterAmenities: ["Power Socket", "Window View"],
    availableTimeSlots: [
      "Today, 2:00 PM - 4:00 PM",
      "Tomorrow, 9:00 AM - 11:00 AM",
    ],
  },
];

export const activeBookings: Booking[] = [
  {
    id: "booking-1",
    workspaceId: "1",
    dateLabel: "18 Oct 2025",
    dateValue: "2025-10-18",
    time: "10:00 AM - 1:00 PM",
    duration: "3 hours",
    location: "Desk B-12, Floor 7",
    status: "confirmed",
  },
];

export const pastBookings: Booking[] = [
  {
    id: "booking-2",
    workspaceId: "2",
    dateLabel: "17 Oct 2025",
    dateValue: "2025-10-17",
    time: "2:00 PM - 5:00 PM",
    duration: "3 hours",
    location: "Desk C-04, Floor 7",
    status: "cancelled",
  },
];

export const bookings = [...activeBookings, ...pastBookings];

export const getWorkspaceById = (id: string) =>
  workspaces.find((workspace) => workspace.id === id);

export const getBookingById = (id: string) =>
  bookings.find((booking) => booking.id === id);
