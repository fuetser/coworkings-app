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

type RoomHoursApiSlot = {
  weekday?: unknown;
  dayLabel?: unknown;
  day_label?: unknown;
  opensAt?: unknown;
  opens_at?: unknown;
  startLocalTime?: unknown;
  start_local_time?: unknown;
  closesAt?: unknown;
  closes_at?: unknown;
  endLocalTime?: unknown;
  end_local_time?: unknown;
  closed?: unknown;
  isClosed?: unknown;
  is_closed?: unknown;
};

type RoomHoursApiObjectResponse = {
  roomId?: unknown;
  room_id?: unknown;
  timezone?: unknown;
  time_zone?: unknown;
  schedule?: unknown;
  hours?: unknown;
  workingHours?: unknown;
  working_hours?: unknown;
};

type RoomHoursApiResponse = RoomHoursApiObjectResponse | RoomHoursApiSlot[];

function normalizeWeekday(value: unknown, index: number) {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    return index + 1;
  }

  if (value >= 0 && value <= 6) {
    return value + 1;
  }

  if (value >= 1 && value <= 7) {
    return value;
  }

  return index + 1;
}

function normalizeRoomHourSlot(slot: RoomHoursApiSlot, index: number) {
  return {
    weekday: normalizeWeekday(slot.weekday, index),
    dayLabel:
      typeof slot.dayLabel === "string"
        ? slot.dayLabel
        : typeof slot.day_label === "string"
          ? slot.day_label
          : null,
    opensAt:
      typeof slot.opensAt === "string"
        ? slot.opensAt
        : typeof slot.opens_at === "string"
          ? slot.opens_at
          : typeof slot.startLocalTime === "string"
            ? slot.startLocalTime
            : typeof slot.start_local_time === "string"
              ? slot.start_local_time
              : null,
    closesAt:
      typeof slot.closesAt === "string"
        ? slot.closesAt
        : typeof slot.closes_at === "string"
          ? slot.closes_at
          : typeof slot.endLocalTime === "string"
            ? slot.endLocalTime
            : typeof slot.end_local_time === "string"
              ? slot.end_local_time
              : null,
    closed:
      typeof slot.closed === "boolean"
        ? slot.closed
        : typeof slot.isClosed === "boolean"
          ? slot.isClosed
          : typeof slot.is_closed === "boolean"
            ? slot.is_closed
            : false,
  };
}

function getRawSchedule(payload: RoomHoursApiResponse) {
  if (Array.isArray(payload)) {
    return payload;
  }

  if (Array.isArray(payload.schedule)) {
    return payload.schedule;
  }

  if (Array.isArray(payload.hours)) {
    return payload.hours;
  }

  if (Array.isArray(payload.workingHours)) {
    return payload.workingHours;
  }

  if (Array.isArray(payload.working_hours)) {
    return payload.working_hours;
  }

  return [];
}

function normalizeRoomHours(roomId: string, payload: RoomHoursApiResponse): RoomHours {
  const rawSchedule = getRawSchedule(payload);
  const responseMeta = Array.isArray(payload) ? {} : payload;

  return {
    roomId:
      typeof responseMeta.roomId === "string"
        ? responseMeta.roomId
        : typeof responseMeta.room_id === "string"
          ? responseMeta.room_id
          : roomId,
    timezone:
      typeof responseMeta.timezone === "string"
        ? responseMeta.timezone
        : typeof responseMeta.time_zone === "string"
          ? responseMeta.time_zone
          : null,
    schedule: rawSchedule.map((slot, index) =>
      normalizeRoomHourSlot((slot ?? {}) as RoomHoursApiSlot, index),
    ),
  };
}

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
  const payload = await get<RoomHoursApiResponse>(`/room-hours/${roomId}`, {
    auth: true,
    fallbackMessage: translate("service.venues.loadRoomHours"),
  });

  return normalizeRoomHours(roomId, payload ?? []);
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
