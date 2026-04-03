import { deleteRequest, get, patch, post } from "@/services/api-client";
import { translate } from "@/constants/i18n";

import type {
  AvailabilityResponse,
  Booking,
  BookingCreateRequest,
  BookingHistoryResponse,
  BookingLevel,
  BookingListItem,
  BookingListResponse,
  BookingRepeatRequest,
  BookingRescheduleRequest,
  CheckinRequest,
  Hold,
  HoldCreateRequest,
  PaymentCreateRequest,
  Transaction,
} from "@/types/api";

export type AvailabilityQuery = {
  level: BookingLevel;
  date: string;
  durationMinutes: number;
  seatId?: string;
  roomId?: string;
  venueId?: string;
};

export type BookingListStatus = "active" | "past";

function normalizeBookingStatus(status: string) {
  return status.trim().toLowerCase().replace(/[\s-]+/g, "_");
}

function normalizeBooking<T extends Booking | BookingListItem>(booking: T): T {
  return {
    ...booking,
    status: normalizeBookingStatus(booking.status),
  };
}

function normalizeBookingItems(response: BookingListResponse | BookingHistoryResponse | BookingListItem[]) {
  const items = Array.isArray(response) ? response : response.items;
  return items.map((item) => normalizeBooking(item));
}

function filterBookingsByTab(
  items: BookingListItem[],
  status: BookingListStatus,
) {
  if (status === "active") {
    return items.filter((item) => ["pending", "confirmed", "checked_in"].includes(item.status));
  }

  return items.filter((item) => ["cancelled", "expired", "no_show", "completed"].includes(item.status));
}

export async function fetchAvailability(query: AvailabilityQuery) {
  return get<AvailabilityResponse>("/availability", {
    auth: true,
    query,
    fallbackMessage: translate("service.bookings.loadAvailability"),
  });
}

export async function createHold(body: HoldCreateRequest) {
  return post<Hold>("/holds", {
    auth: true,
    body,
    fallbackMessage: translate("service.bookings.createHold"),
  });
}

export async function releaseHold(holdId: string) {
  return deleteRequest<void>(`/holds/${holdId}`, {
    auth: true,
    fallbackMessage: translate("service.bookings.releaseHold"),
  });
}

export async function createBooking(body: BookingCreateRequest) {
  const booking = await post<Booking>("/bookings", {
    auth: true,
    body,
    fallbackMessage: translate("service.bookings.createBooking"),
  });

  return normalizeBooking(booking);
}

export async function fetchMyBookings(status: BookingListStatus) {
  const response = await get<BookingListResponse | BookingListItem[]>("/me/bookings", {
    auth: true,
    fallbackMessage: translate("service.bookings.loadBookings"),
  });

  return filterBookingsByTab(normalizeBookingItems(response), status);
}

export async function fetchBookingHistory() {
  const response = await get<BookingHistoryResponse | BookingListItem[]>(
    "/bookings/history",
    {
      auth: true,
      fallbackMessage: translate("service.bookings.loadHistory"),
    },
  );

  return normalizeBookingItems(response);
}

export async function fetchBookingById(bookingId: string) {
  const booking = await get<Booking>(`/bookings/${bookingId}`, {
    auth: true,
    fallbackMessage: translate("service.bookings.loadDetails"),
  });

  return normalizeBooking(booking);
}

export async function rescheduleBooking(
  bookingId: string,
  body: BookingRescheduleRequest,
) {
  const booking = await patch<Booking>(`/bookings/${bookingId}/reschedule`, {
    auth: true,
    body,
    fallbackMessage: translate("service.bookings.reschedule"),
  });

  return normalizeBooking(booking);
}

export async function repeatBooking(
  bookingId: string,
  body: BookingRepeatRequest,
) {
  const booking = await post<Booking>(`/bookings/${bookingId}/repeat`, {
    auth: true,
    body,
    fallbackMessage: translate("service.bookings.repeat"),
  });

  return normalizeBooking(booking);
}

export async function cancelBooking(bookingId: string) {
  return deleteRequest<void>(`/bookings/${bookingId}`, {
    auth: true,
    fallbackMessage: translate("service.bookings.cancel"),
  });
}

export async function createPayment(body: PaymentCreateRequest) {
  return post<Transaction>("/payments", {
    auth: true,
    body,
    fallbackMessage: translate("service.bookings.createPayment"),
  });
}

export async function fetchPaymentById(paymentId: string) {
  return get<Transaction>(`/payments/${paymentId}`, {
    auth: true,
    fallbackMessage: translate("service.bookings.loadPayment"),
  });
}

export async function capturePayment(paymentId: string) {
  return post<Transaction>(`/payments/${paymentId}/capture`, {
    auth: true,
    fallbackMessage: translate("service.bookings.capturePayment"),
  });
}

export async function refundPayment(paymentId: string) {
  return post<Transaction>(`/payments/${paymentId}/refund`, {
    auth: true,
    fallbackMessage: translate("service.bookings.refundPayment"),
  });
}

export async function checkInToBooking(
  bookingId: string,
  body: CheckinRequest,
) {
  return post(`/bookings/${bookingId}/checkin`, {
    auth: true,
    body,
    fallbackMessage: translate("service.bookings.checkIn"),
  });
}
