import { get } from "@/services/api-client";
import { translate } from "@/constants/i18n";
import type {
  BookingRuleScope,
  BookingRules,
  FeatureItem,
  RoomBrief,
  RoomDetails,
  RoomHours,
  SeatBrief,
  Tariff,
  VenueFull,
  VenueListFilters,
  VenueListItem,
} from "@/types/venues";

let featuresPromise: Promise<FeatureItem[]> | null = null;

export async function fetchVenues(filters: VenueListFilters = {}) {
  return get<VenueListItem[]>("/venues", {
    auth: true,
    query: {
      q: filters.q,
      location: filters.location,
      date: filters.date,
      capacity:
        typeof filters.capacity === "number" && Number.isFinite(filters.capacity)
          ? filters.capacity
          : undefined,
      features: filters.features,
    },
    fallbackMessage: translate("service.venues.loadVenues"),
  });
}

export async function fetchVenueById(venueId: string) {
  return get<VenueFull>(`/venues/${venueId}`, {
    auth: true,
    fallbackMessage: translate("service.venues.loadVenueDetails"),
  });
}

export async function fetchVenueRooms(venueId: string) {
  return get<RoomBrief[]>(`/venues/${venueId}/rooms`, {
    auth: true,
    fallbackMessage: translate("service.venues.loadVenueRooms"),
  });
}

export async function fetchRoomById(roomId: string) {
  return get<RoomDetails>(`/rooms/${roomId}`, {
    auth: true,
    fallbackMessage: translate("service.venues.loadRoomDetails"),
  });
}

export async function fetchRoomSeats(roomId: string) {
  return get<SeatBrief[]>(`/rooms/${roomId}/seats`, {
    auth: true,
    fallbackMessage: translate("service.venues.loadRoomSeats"),
  });
}

export async function fetchRoomHours(roomId: string) {
  return get<RoomHours>(`/room-hours/${roomId}`, {
    auth: true,
    fallbackMessage: translate("service.venues.loadRoomHours"),
  });
}

export async function fetchTariffs() {
  return get<Tariff[]>("/tariffs", {
    auth: true,
    fallbackMessage: translate("service.venues.loadTariffs"),
  });
}

export async function fetchBookingRules(
  scope: BookingRuleScope,
  scopeId?: string,
) {
  return get<BookingRules>(`/booking-rules/${scope}`, {
    auth: true,
    query: {
      scopeId,
      roomId: scope === "room" ? scopeId : undefined,
      venueId: scope === "venue" ? scopeId : undefined,
      seatId: scope === "seat" ? scopeId : undefined,
    },
    fallbackMessage: translate("service.venues.loadRules"),
  });
}

export async function fetchFeatures(force = false) {
  if (force || !featuresPromise) {
    featuresPromise = get<FeatureItem[]>("/features", {
      auth: true,
      fallbackMessage: translate("service.venues.loadFeatures"),
    });
  }

  return featuresPromise;
}
