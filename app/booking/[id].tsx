import { getI18nLanguage, getLocaleForLanguage, translate } from "@/constants/i18n";
import { Radii } from "@/constants/theme";
import { useAppTheme } from "@/hooks/use-app-theme";
import { useI18n } from "@/hooks/use-i18n";
import {
  cancelBooking,
  capturePayment,
  checkInToBooking,
  createBooking,
  createHold,
  createPayment,
  fetchAvailability,
  fetchBookingById,
  fetchPaymentById,
  releaseHold,
  refundPayment,
  repeatBooking,
  rescheduleBooking,
} from "@/services/bookings";
import { fetchBookingRules, fetchRoomById, fetchRoomSeats, fetchVenueById } from "@/services/venues";
import type {
  AvailabilityQuery,
  AvailabilitySlot,
  Booking,
  BookingCreateRequest,
  BookingLevel,
  BookingRules,
  HoldCreateRequest,
  RoomDetails,
  SeatBrief,
  Transaction,
  VenueFull,
} from "@/types/api";
import { router, useLocalSearchParams } from "expo-router";
import { ArrowLeft, Calendar } from "lucide-react-native";
import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import {
  ActivityIndicator,
  Alert,
  Modal,
  ScrollView,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

type ScreenMode = "book" | "detail";

type Params = {
  id?: string | string[];
  mode?: string | string[];
  level?: string | string[];
  action?: string | string[];
  sourceBookingId?: string | string[];
  initialStartTime?: string | string[];
  initialEndTime?: string | string[];
  seatId?: string | string[];
  seatLabel?: string | string[];
  seatType?: string | string[];
  roomId?: string | string[];
  roomName?: string | string[];
  roomFeatures?: string | string[];
  venueId?: string | string[];
  venueName?: string | string[];
  venueAddress?: string | string[];
  venueTimezone?: string | string[];
  notice?: string | string[];
  paymentId?: string | string[];
};

type BookingTargetContext = {
  level: BookingLevel;
  targetId: string;
  seatId: string | null;
  seatLabel: string | null;
  seatType: string | null;
  roomId: string | null;
  roomName: string;
  venueId: string;
  venueName: string;
  venueAddress: string;
  venueTimezone: string;
  roomFeatures: string[];
  allowFullRoomBooking?: boolean;
  bookingRules?: BookingRules | null;
};

type BookingPresentation = {
  booking: Booking;
  venueName: string;
  venueAddress: string;
  venueTimezone: string;
  roomName: string;
  seatLabel: string | null;
  seatType: string | null;
  roomFeatures: string[];
  allowFullRoomBooking: boolean;
};

const DEFAULT_DURATION_OPTIONS = [60, 120] as const;

const normalizeParam = (value: string | string[] | undefined) =>
  Array.isArray(value) ? value[0] : value;

const parseListParam = (value: string | string[] | undefined) => {
  const normalized = normalizeParam(value);
  return normalized ? normalized.split("|").map((item) => item.trim()).filter(Boolean) : [];
};

const normalizeBookingLevel = (value: string | string[] | undefined): BookingLevel => {
  const normalized = normalizeParam(value);
  if (normalized === "room" || normalized === "venue") {
    return normalized;
  }
  return "seat";
};

const formatDateOnly = (value: string, locale: string) => {
  const date = new Date(`${value}T00:00:00`);
  return Number.isNaN(date.getTime())
    ? value
    : new Intl.DateTimeFormat(locale, {
        weekday: "long",
        month: "short",
        day: "numeric",
      }).format(date);
};

const formatDateTime = (value: string, locale: string) => {
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? value
    : new Intl.DateTimeFormat(locale, {
        day: "2-digit",
        month: "short",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      }).format(date);
};

const formatTimeOnly = (value: string, locale: string) => {
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? value
    : new Intl.DateTimeFormat(locale, {
        hour: "numeric",
        minute: "2-digit",
      }).format(date);
};

const formatPaymentAmount = (amountCents: number, currency: string) => `${amountCents} ${currency}`;

const formatDateKey = (date: Date) => {
  const year = date.getFullYear();
  const month = `${date.getMonth() + 1}`.padStart(2, "0");
  const day = `${date.getDate()}`.padStart(2, "0");
  return `${year}-${month}-${day}`;
};

const formatNullableDateTime = (value: string | null, locale: string, fallback: string) => (value ? formatDateTime(value, locale) : fallback);

const formatSlotLabel = (slot: AvailabilitySlot, locale: string) =>
  `${formatTimeOnly(slot.startTime, locale)} - ${formatTimeOnly(slot.endTime, locale)}`;

const getDurationMinutes = (startTime: string, endTime: string) =>
  Math.max(0, Math.round((new Date(endTime).getTime() - new Date(startTime).getTime()) / 60000));

const QUICK_DATE_COUNT = 5;


const getStartOfToday = () => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return today;
};

const buildDates = (anchorStartTime?: string) => {
  const today = getStartOfToday();

  let startDate = new Date(today);

  if (anchorStartTime) {
    const anchor = new Date(anchorStartTime);
    if (!Number.isNaN(anchor.getTime())) {
      anchor.setHours(0, 0, 0, 0);
      if (anchor.getTime() > today.getTime()) {
        startDate = anchor;
      }
    }
  }

  return Array.from({ length: QUICK_DATE_COUNT }, (_, index) => {
    const nextDate = new Date(startDate);
    nextDate.setDate(startDate.getDate() + index);
    return formatDateKey(nextDate);
  });
};

const isPastDate = (value: string) => {
  const date = new Date(`${value}T00:00:00`);
  const today = getStartOfToday();
  return Number.isNaN(date.getTime()) ? false : date.getTime() < today.getTime();
};

const isPastSlot = (slot: AvailabilitySlot) => {
  const start = new Date(slot.startTime);
  return Number.isNaN(start.getTime()) ? false : start.getTime() < Date.now();
};

const buildCalendarDays = (visibleMonth: Date) => {
  const monthStart = new Date(visibleMonth.getFullYear(), visibleMonth.getMonth(), 1);
  const gridStart = new Date(monthStart);
  gridStart.setDate(monthStart.getDate() - monthStart.getDay());

  return Array.from({ length: 42 }, (_, index) => {
    const day = new Date(gridStart);
    day.setDate(gridStart.getDate() + index);
    const dateKey = formatDateKey(day);
    return {
      dateKey,
      dayNumber: day.getDate(),
      isCurrentMonth: day.getMonth() === visibleMonth.getMonth(),
      isPast: isPastDate(dateKey),
    };
  });
};

const getCalendarWeekdayLabels = (locale: string) => {
  const start = new Date(Date.UTC(2024, 0, 7));

  return Array.from({ length: 7 }, (_, index) =>
    new Intl.DateTimeFormat(locale, { weekday: "short" }).format(
      new Date(start.getTime() + index * 24 * 60 * 60 * 1000),
    ),
  );
};

const buildDurationOptions = (rules?: BookingRules | null) => {
  const minDuration = Math.max(15, rules?.minDurationMinutes ?? DEFAULT_DURATION_OPTIONS[0]);
  const maxDuration = Math.max(
    minDuration,
    rules?.maxDurationMinutes ?? Math.max(DEFAULT_DURATION_OPTIONS[DEFAULT_DURATION_OPTIONS.length - 1], minDuration),
  );
  const step = minDuration % 30 === 0 && maxDuration % 30 === 0 ? 30 : 15;
  const options: number[] = [];

  for (let next = minDuration; next <= maxDuration; next += step) {
    options.push(next);
  }

  return options.length > 0 ? options : [...DEFAULT_DURATION_OPTIONS];
};

const getNearestDurationOption = (value: number, options: number[]) =>
  options.reduce((best, current) => (
    Math.abs(current - value) < Math.abs(best - value) ? current : best
  ), options[0] ?? DEFAULT_DURATION_OPTIONS[0]);

const getSeatFallbackLabel = (id: string) =>
  translate("booking.seatFallback", { id: id.slice(0, 4) });

const getTargetSummaryLabel = (level: BookingLevel) => {
  if (level === "room") {
    return translate("booking.target.room");
  }

  if (level === "venue") {
    return translate("booking.target.venue");
  }

  return translate("booking.target.seat");
};

const getTargetTitle = (target: BookingTargetContext) => {
  if (target.level === "room") {
    return target.roomName;
  }

  if (target.level === "venue") {
    return target.venueName;
  }

  return target.seatLabel ?? getSeatFallbackLabel(target.targetId);
};

const getBookingTargetId = (booking: Booking) => {
  if (booking.level === "room") {
    return booking.roomId;
  }

  if (booking.level === "venue") {
    return booking.venueId;
  }

  return booking.seatId;
};

const buildAvailabilityQuery = (
  target: BookingTargetContext,
  date: string,
  durationMinutes: number,
): AvailabilityQuery => {
  if (target.level === "room") {
    return {
      level: "room",
      roomId: target.roomId,
      date,
      durationMinutes,
    };
  }

  if (target.level === "venue") {
    return {
      level: "venue",
      venueId: target.venueId,
      date,
      durationMinutes,
    };
  }

  return {
    level: "seat",
    seatId: target.seatId,
    date,
    durationMinutes,
  };
};

const buildHoldPayload = (
  target: BookingTargetContext,
  startTime: string,
  endTime: string,
): HoldCreateRequest => {
  if (target.level === "room") {
    return {
      level: "room",
      roomId: target.roomId,
      startTime,
      endTime,
    };
  }

  if (target.level === "venue") {
    return {
      level: "venue",
      venueId: target.venueId,
      startTime,
      endTime,
    };
  }

  return {
    level: "seat",
    seatId: target.seatId,
    startTime,
    endTime,
  };
};

const buildCreateBookingPayload = (
  target: BookingTargetContext,
  holdId: string,
  startTime: string,
  endTime: string,
): BookingCreateRequest => {
  if (target.level === "room") {
    return {
      level: "room",
      roomId: target.roomId,
      holdId,
      startTime,
      endTime,
    };
  }

  if (target.level === "venue") {
    return {
      level: "venue",
      venueId: target.venueId,
      holdId,
      startTime,
      endTime,
    };
  }

  return {
    level: "seat",
    seatId: target.seatId,
    holdId,
    startTime,
    endTime,
  };
};

const buildBookingActionParams = (details: BookingPresentation, action: "reschedule" | "repeat") => {
  const targetId = getBookingTargetId(details.booking);
  if (!targetId) {
    return null;
  }

  return {
    id: targetId,
    mode: "book",
    level: details.booking.level,
    action,
    sourceBookingId: details.booking.id,
    initialStartTime: details.booking.startTime,
    initialEndTime: details.booking.endTime,
    seatId: details.booking.seatId ?? undefined,
    seatLabel: details.seatLabel ?? undefined,
    seatType: details.seatType ?? undefined,
    roomId: details.booking.roomId ?? undefined,
    roomName: details.roomName,
    roomFeatures: details.roomFeatures.length > 0 ? details.roomFeatures.join("|") : undefined,
    venueId: details.booking.venueId,
    venueName: details.venueName,
    venueAddress: details.venueAddress,
    venueTimezone: details.venueTimezone,
  };
};

async function buildBookingPresentation(booking: Booking): Promise<BookingPresentation> {
  let venue: VenueFull | null = null;
  let room: RoomDetails | null = null;
  let seats: SeatBrief[] = [];

  try {
    venue = await fetchVenueById(booking.venueId);
  } catch {
    venue = null;
  }

  if (booking.roomId) {
    try {
      room = await fetchRoomById(booking.roomId);
      seats = room.seats ?? [];
    } catch {
      room = null;
    }

    if (booking.level === "seat" && seats.length === 0) {
      try {
        seats = await fetchRoomSeats(booking.roomId);
      } catch {
        seats = [];
      }
    }
  }

  const seat = booking.level === "seat"
    ? seats.find((item) => item.id === booking.seatId)
    : null;

  return {
    booking,
    venueName: venue?.name ?? room?.venueName ?? booking.venueId,
    venueAddress: venue?.address ?? translate("room.addressUnavailable"),
    venueTimezone: venue?.timezone ?? room?.timezone ?? translate("booking.unknown"),
    roomName: room?.name ?? booking.roomId ?? translate("booking.wholeVenueFallback"),
    seatLabel: booking.level === "seat" ? seat?.label ?? (booking.seatId ? getSeatFallbackLabel(booking.seatId) : translate("booking.seatUnavailable")) : null,
    seatType: booking.level === "seat" ? seat?.seatType ?? translate("booking.workspace") : null,
    roomFeatures: room?.features ?? [],
    allowFullRoomBooking: room?.allowFullRoomBooking ?? false,
  };
}

export default function BookingScreen() {
  const { colors, isDark } = useAppTheme();
  const { locale, t } = useI18n();
  const params = useLocalSearchParams<Params>();
  const id = normalizeParam(params.id);
  const rawMode = normalizeParam(params.mode);
  const level = normalizeBookingLevel(params.level);
  const actionParam = normalizeParam(params.action);
  const sourceBookingId = normalizeParam(params.sourceBookingId);
  const initialStartTime = normalizeParam(params.initialStartTime);
  const initialEndTime = normalizeParam(params.initialEndTime);
  const seatIdParam = normalizeParam(params.seatId);
  const seatLabelParam = normalizeParam(params.seatLabel);
  const seatTypeParam = normalizeParam(params.seatType);
  const roomIdParam = normalizeParam(params.roomId);
  const roomNameParam = normalizeParam(params.roomName);
  const venueIdParam = normalizeParam(params.venueId);
  const venueNameParam = normalizeParam(params.venueName);
  const venueAddressParam = normalizeParam(params.venueAddress);
  const venueTimezoneParam = normalizeParam(params.venueTimezone);
  const roomFeaturesParam = normalizeParam(params.roomFeatures);
  const notice = normalizeParam(params.notice);
  const paymentIdParam = normalizeParam(params.paymentId);
  const mode: ScreenMode = rawMode === "book" ? "book" : "detail";
  const bookingAction: "create" | "reschedule" | "repeat" =
    actionParam === "reschedule" || actionParam === "repeat" ? actionParam : "create";

  const bookingTarget = useMemo<BookingTargetContext | null>(() => {
    if (!id || mode !== "book") {
      return null;
    }

    if (level === "room") {
      const roomId = roomIdParam ?? id;
      return {
        level,
        targetId: roomId,
        seatId: seatIdParam ?? null,
        seatLabel: seatLabelParam ?? null,
        seatType: seatTypeParam ?? null,
        roomId,
        roomName: roomNameParam ?? `${t("booking.target.room")} ${roomId.slice(0, 4)}`,
        venueId: venueIdParam ?? "",
        venueName: venueNameParam ?? t("booking.selectedVenue"),
        venueAddress: venueAddressParam ?? "",
        venueTimezone: venueTimezoneParam ?? "",
        roomFeatures: parseListParam(roomFeaturesParam),
        allowFullRoomBooking: true,
        bookingRules: null,
      };
    }

    if (level === "venue") {
      const venueId = venueIdParam ?? id;
      return {
        level,
        targetId: venueId,
        seatId: null,
        seatLabel: null,
        seatType: null,
        roomId: roomIdParam ?? null,
        roomName: roomNameParam ?? t("booking.wholeVenueFallback"),
        venueId,
        venueName: venueNameParam ?? `${t("booking.target.venue")} ${venueId.slice(0, 4)}`,
        venueAddress: venueAddressParam ?? "",
        venueTimezone: venueTimezoneParam ?? "",
        roomFeatures: parseListParam(roomFeaturesParam),
        allowFullRoomBooking: false,
        bookingRules: null,
      };
    }

    const seatId = seatIdParam ?? id;
    return {
      level: "seat",
      targetId: seatId,
      seatId,
      seatLabel: seatLabelParam ?? getSeatFallbackLabel(seatId),
      seatType: seatTypeParam ?? t("booking.regularSeat"),
      roomId: roomIdParam ?? null,
      roomName: roomNameParam ?? t("booking.selectedRoom"),
      venueId: venueIdParam ?? "",
      venueName: venueNameParam ?? t("booking.selectedVenue"),
      venueAddress: venueAddressParam ?? "",
      venueTimezone: venueTimezoneParam ?? "",
      roomFeatures: parseListParam(roomFeaturesParam),
      allowFullRoomBooking: false,
      bookingRules: null,
    };
  }, [
    id,
    level,
    mode,
    roomFeaturesParam,
    roomIdParam,
    roomNameParam,
    seatIdParam,
    seatLabelParam,
    seatTypeParam,
    venueAddressParam,
    venueIdParam,
    venueNameParam,
    venueTimezoneParam,
    t,
  ]);

  const [resolvedBookingTarget, setResolvedBookingTarget] = useState<BookingTargetContext | null>(null);
  const [isLoadingBookingTarget, setIsLoadingBookingTarget] = useState(false);
  const hydratedBookingTarget = resolvedBookingTarget ?? bookingTarget;

  const [dates] = useState(() => buildDates(initialStartTime));
  const [selectedDate, setSelectedDate] = useState("");
  const [isCalendarOpen, setIsCalendarOpen] = useState(false);
  const [visibleMonth, setVisibleMonth] = useState(() => {
    const anchorDate = initialStartTime ? new Date(initialStartTime) : getStartOfToday();
    const baseDate = Number.isNaN(anchorDate.getTime()) ? getStartOfToday() : anchorDate;
    return new Date(baseDate.getFullYear(), baseDate.getMonth(), 1);
  });
  const [selectedDuration, setSelectedDuration] = useState<number>(60);
  const [slots, setSlots] = useState<AvailabilitySlot[]>([]);
  const [slotsError, setSlotsError] = useState<string | null>(null);
  const [isLoadingSlots, setIsLoadingSlots] = useState(false);
  const [selectedSlotStart, setSelectedSlotStart] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [details, setDetails] = useState<BookingPresentation | null>(null);
  const [detailsError, setDetailsError] = useState<string | null>(null);
  const [isLoadingDetails, setIsLoadingDetails] = useState(false);
  const [isCancelling, setIsCancelling] = useState(false);
  const [isCheckingIn, setIsCheckingIn] = useState(false);
  const [payment, setPayment] = useState<Transaction | null>(null);
  const [paymentError, setPaymentError] = useState<string | null>(null);
  const [isLoadingPayment, setIsLoadingPayment] = useState(false);
  const [isCapturing, setIsCapturing] = useState(false);
  const [isRefunding, setIsRefunding] = useState(false);

  const holdIdRef = useRef<string | null>(null);
  const bookingCreatedRef = useRef(false);
  const selectedSlot = slots.find((slot) => slot.startTime === selectedSlotStart);
  const activePaymentId = payment?.id ?? paymentIdParam ?? null;
  const calendarDays = useMemo(() => buildCalendarDays(visibleMonth), [visibleMonth]);
  const durationOptions = useMemo(
    () => buildDurationOptions(hydratedBookingTarget?.bookingRules),
    [hydratedBookingTarget?.bookingRules],
  );
  const calendarWeekdayLabels = useMemo(() => getCalendarWeekdayLabels(locale), [locale]);
  const calendarMonthLabel = useMemo(
    () => new Intl.DateTimeFormat(locale, { month: "long", year: "numeric" }).format(visibleMonth),
    [locale, visibleMonth],
  );

  const loadBookingTarget = useCallback(async () => {
    if (mode !== "book" || !bookingTarget) {
      setResolvedBookingTarget(bookingTarget);
      return;
    }

    if (bookingTarget.level === "seat") {
      if (!bookingTarget.roomId) {
        setResolvedBookingTarget(bookingTarget);
        return;
      }

      setIsLoadingBookingTarget(true);

      try {
        const [roomResult, venueResult, rulesResult, seatsFallbackResult] = await Promise.allSettled([
          fetchRoomById(bookingTarget.roomId),
          bookingTarget.venueId ? fetchVenueById(bookingTarget.venueId) : Promise.resolve(null),
          fetchBookingRules("room", bookingTarget.roomId),
          fetchRoomSeats(bookingTarget.roomId),
        ]);

        const room = roomResult.status === "fulfilled" ? roomResult.value : null;
        const venue = venueResult.status === "fulfilled" ? venueResult.value : null;
        const roomSeats = room?.seats?.length
          ? room.seats
          : seatsFallbackResult.status === "fulfilled"
            ? seatsFallbackResult.value
            : [];
        const matchedSeat = roomSeats.find((item) => item.id === bookingTarget.seatId);
        const rules = rulesResult.status === "fulfilled" ? rulesResult.value : null;

        setResolvedBookingTarget({
          ...bookingTarget,
          seatLabel: matchedSeat?.label ?? bookingTarget.seatLabel,
          seatType: matchedSeat?.seatType ?? bookingTarget.seatType,
          roomName: room?.name ?? bookingTarget.roomName,
          venueId: room?.venueId ?? bookingTarget.venueId,
          venueName: venue?.name ?? room?.venueName ?? bookingTarget.venueName,
          venueAddress: venue?.address ?? bookingTarget.venueAddress,
          venueTimezone: venue?.timezone ?? room?.timezone ?? bookingTarget.venueTimezone,
          roomFeatures: room?.features ?? bookingTarget.roomFeatures,
          allowFullRoomBooking: room?.allowFullRoomBooking ?? bookingTarget.allowFullRoomBooking,
          bookingRules: rules,
        });
      } catch {
        setResolvedBookingTarget(bookingTarget);
      } finally {
        setIsLoadingBookingTarget(false);
      }

      return;
    }

    if (bookingTarget.level === "room") {
      if (!bookingTarget.roomId) {
        setResolvedBookingTarget(bookingTarget);
        return;
      }

      setIsLoadingBookingTarget(true);

      try {
        const [roomResult, venueResult, rulesResult] = await Promise.allSettled([
          fetchRoomById(bookingTarget.roomId),
          bookingTarget.venueId ? fetchVenueById(bookingTarget.venueId) : Promise.resolve(null),
          fetchBookingRules("room", bookingTarget.roomId),
        ]);

        const room = roomResult.status === "fulfilled" ? roomResult.value : null;
        const venue = venueResult.status === "fulfilled" ? venueResult.value : null;
        const rules = rulesResult.status === "fulfilled" ? rulesResult.value : null;

        setResolvedBookingTarget({
          ...bookingTarget,
          roomName: room?.name ?? bookingTarget.roomName,
          venueId: room?.venueId ?? bookingTarget.venueId,
          venueName: venue?.name ?? room?.venueName ?? bookingTarget.venueName,
          venueAddress: venue?.address ?? bookingTarget.venueAddress,
          venueTimezone: venue?.timezone ?? room?.timezone ?? bookingTarget.venueTimezone,
          roomFeatures: room?.features ?? bookingTarget.roomFeatures,
          allowFullRoomBooking: room?.allowFullRoomBooking ?? bookingTarget.allowFullRoomBooking,
          bookingRules: rules,
        });
      } catch {
        setResolvedBookingTarget(bookingTarget);
      } finally {
        setIsLoadingBookingTarget(false);
      }

      return;
    }

    if (!bookingTarget.venueId) {
      setResolvedBookingTarget(bookingTarget);
      return;
    }

    setIsLoadingBookingTarget(true);

    try {
      const [venueResult, rulesResult] = await Promise.allSettled([
        fetchVenueById(bookingTarget.venueId),
        fetchBookingRules("venue", bookingTarget.venueId),
      ]);

      const venue = venueResult.status === "fulfilled" ? venueResult.value : null;
      const rules = rulesResult.status === "fulfilled" ? rulesResult.value : null;

      setResolvedBookingTarget({
        ...bookingTarget,
        venueName: venue?.name ?? bookingTarget.venueName,
        venueAddress: venue?.address ?? bookingTarget.venueAddress,
        venueTimezone: venue?.timezone ?? bookingTarget.venueTimezone,
        bookingRules: rules,
      });
    } catch {
      setResolvedBookingTarget(bookingTarget);
    } finally {
      setIsLoadingBookingTarget(false);
    }
  }, [bookingTarget, mode]);

  const loadSlots = useCallback(async () => {
    if (mode !== "book" || !hydratedBookingTarget || !selectedDate) {
      return;
    }

    setIsLoadingSlots(true);
    setSlotsError(null);

    try {
      const response = await fetchAvailability(
        buildAvailabilityQuery(hydratedBookingTarget, selectedDate, selectedDuration),
      );

      const availableSlots = response.timeSlots.filter((slot) => !isPastSlot(slot));
      setSlots(availableSlots);
      setSelectedSlotStart((current) => {
        const active = availableSlots.find(
          (slot) => slot.startTime === current && slot.available,
        );
        return active?.startTime ?? availableSlots.find((slot) => slot.available)?.startTime ?? "";
      });
    } catch (error) {
      setSlots([]);
      setSelectedSlotStart("");
      setSlotsError(error instanceof Error ? error.message : "Unable to load availability.");
    } finally {
      setIsLoadingSlots(false);
    }
  }, [hydratedBookingTarget, mode, selectedDate, selectedDuration]);

  const loadDetails = useCallback(async () => {
    if (mode !== "detail" || !id) {
      return;
    }

    setIsLoadingDetails(true);
    setDetailsError(null);

    try {
      const booking = await fetchBookingById(id);
      const presentation = await buildBookingPresentation(booking);
      setDetails(presentation);
    } catch (error) {
      setDetails(null);
      setDetailsError(error instanceof Error ? error.message : "Unable to load booking details.");
    } finally {
      setIsLoadingDetails(false);
    }
  }, [id, mode]);


  const loadPayment = useCallback(async () => {
    if (mode !== "detail") {
      return;
    }

    if (!activePaymentId) {
      setPayment(null);
      setPaymentError(null);
      setIsLoadingPayment(false);
      return;
    }

    setIsLoadingPayment(true);
    setPaymentError(null);

    try {
      const transaction = await fetchPaymentById(activePaymentId);
      setPayment(transaction);
    } catch (error) {
      setPayment(null);
      setPaymentError(error instanceof Error ? error.message : "Unable to load payment details.");
    } finally {
      setIsLoadingPayment(false);
    }
  }, [activePaymentId, mode]);

  useEffect(() => {
    if (mode !== "book" || !dates[0]) {
      return;
    }

    if (bookingAction === "create") {
      if (!selectedDate) {
        setSelectedDate(dates[0]);
      }
      return;
    }

    const initialDate = initialStartTime ? initialStartTime.slice(0, 10) : "";
    setSelectedDate(initialDate && dates.includes(initialDate) ? initialDate : dates[0]);

    const initialDuration =
      initialStartTime && initialEndTime
        ? getDurationMinutes(initialStartTime, initialEndTime)
        : 60;
    setSelectedDuration(getNearestDurationOption(initialDuration, durationOptions));
  }, [bookingAction, dates, durationOptions, initialEndTime, initialStartTime, mode, selectedDate]);

  useEffect(() => {
    if (durationOptions.length === 0) {
      return;
    }

    if (!durationOptions.includes(selectedDuration)) {
      setSelectedDuration(getNearestDurationOption(selectedDuration, durationOptions));
    }
  }, [durationOptions, selectedDuration]);

  useEffect(() => {
    void loadBookingTarget();
  }, [loadBookingTarget]);

  useEffect(() => {
    void loadSlots();
  }, [loadSlots]);

  useEffect(() => {
    void loadDetails();
  }, [loadDetails]);

  useEffect(() => {
    void loadPayment();
  }, [loadPayment]);

  useEffect(() => {
    return () => {
      const holdId = holdIdRef.current;
      if (!holdId || bookingCreatedRef.current) {
        return;
      }
      void releaseHold(holdId).catch(() => {});
    };
  }, []);

  const handleBooking = useCallback(async () => {
    if (!hydratedBookingTarget || !selectedSlot || isSubmitting) {
      return;
    }

    setIsSubmitting(true);

    if (bookingAction !== "create") {
      if (!sourceBookingId) {
        Alert.alert(t("booking.actionUnavailableTitle"), t("booking.actionUnavailableBody"));
        setIsSubmitting(false);
        return;
      }

      try {
        if (bookingAction === "reschedule") {
          await rescheduleBooking(sourceBookingId, {
            startTime: selectedSlot.startTime,
            endTime: selectedSlot.endTime,
          });

          router.replace({
            pathname: "/booking/[id]",
            params: {
              id: sourceBookingId,
              notice: t("booking.rescheduleSuccessNotice"),
            },
          });
        } else {
          const booking = await repeatBooking(sourceBookingId, {
            startTime: selectedSlot.startTime,
            endTime: selectedSlot.endTime,
          });

          router.replace({
            pathname: "/booking/[id]",
            params: {
              id: booking.id,
              notice: t("booking.repeatSuccessNotice"),
            },
          });
        }
      } catch (error) {
        Alert.alert(
          bookingAction === "reschedule" ? t("booking.rescheduleError") : t("booking.repeatError"),
          error instanceof Error ? error.message : t("booking.tryAnotherSlot"),
        );
      } finally {
        setIsSubmitting(false);
      }

      return;
    }

    let holdId: string | null = null;

    try {
      const hold = await createHold(
        buildHoldPayload(hydratedBookingTarget, selectedSlot.startTime, selectedSlot.endTime),
      );
      holdId = hold.id;
      holdIdRef.current = hold.id;

      const booking = await createBooking(
        buildCreateBookingPayload(hydratedBookingTarget, hold.id, selectedSlot.startTime, selectedSlot.endTime),
      );

      holdIdRef.current = null;
      bookingCreatedRef.current = true;

      let nextNotice = t("booking.createSuccessNotice");

      let paymentId: string | undefined;

      if (hydratedBookingTarget.bookingRules?.paymentRequired === true && booking.priceAmountCents > 0) {
        try {
          const transaction = await createPayment({
            bookingId: booking.id,
            amountCents: booking.priceAmountCents,
            currency: booking.priceCurrency,
            provider: "mock",
          });
          paymentId = transaction.id;
        } catch (error) {
          nextNotice = error instanceof Error
            ? t("booking.paymentFailedNoticeWithReason", { message: error.message })
            : t("booking.paymentFailedNotice");
        }
      }

      router.replace({
        pathname: "/booking/[id]",
        params: {
          id: booking.id,
          notice: nextNotice,
          paymentId,
        },
      });
    } catch (error) {
      if (holdId) {
        holdIdRef.current = null;
        void releaseHold(holdId).catch(() => {});
      }

      Alert.alert(
        t("booking.completeError"),
        error instanceof Error ? error.message : t("booking.tryAnotherSlot"),
      );
    } finally {
      setIsSubmitting(false);
    }
  }, [bookingAction, hydratedBookingTarget, isSubmitting, selectedSlot, sourceBookingId, t]);

  const handleCancelBooking = useCallback(() => {
    if (!details || isCancelling) {
      return;
    }

    Alert.alert(t("booking.cancelTitle"), t("booking.cancelBody"), [
      {
        text: t("booking.keep"),
        style: "cancel",
      },
      {
        text: t("booking.cancelAction"),
        style: "destructive",
        onPress: () => {
          void (async () => {
            setIsCancelling(true);
            try {
              await cancelBooking(details.booking.id);
              await loadDetails();
              Alert.alert(t("booking.cancelSuccessTitle"), t("booking.cancelSuccessBody"));
            } catch (error) {
              Alert.alert(
                t("booking.cancelError"),
                error instanceof Error ? error.message : t("common.tryAgain"),
              );
            } finally {
              setIsCancelling(false);
            }
          })();
        },
      },
    ]);
  }, [details, isCancelling, loadDetails, t]);

  const handleCheckIn = useCallback(async () => {
    if (!details || isCheckingIn) {
      return;
    }

    setIsCheckingIn(true);
    try {
      await checkInToBooking(details.booking.id, { method: "manual" });
      await loadDetails();
      Alert.alert(t("booking.checkedInTitle"), t("booking.checkedInBody"));
    } catch (error) {
      Alert.alert(
        t("booking.checkInError"),
        error instanceof Error ? error.message : t("common.tryAgain"),
      );
    } finally {
      setIsCheckingIn(false);
    }
  }, [details, isCheckingIn, loadDetails, t]);

  const refreshDetailsAndPayment = useCallback(async () => {
    await Promise.allSettled([loadDetails(), loadPayment()]);
  }, [loadDetails, loadPayment]);

  const handleCapturePayment = useCallback(() => {
    if (!payment || isCapturing) {
      return;
    }

    Alert.alert(t("booking.captureTitle"), t("booking.captureBody"), [
      {
        text: t("booking.keep"),
        style: "cancel",
      },
      {
        text: t("booking.capture"),
        onPress: () => {
          void (async () => {
            setIsCapturing(true);
            try {
              const nextPayment = await capturePayment(payment.id);
              setPayment(nextPayment);
              await loadDetails();
              Alert.alert(t("booking.captureSuccessTitle"), t("booking.captureSuccessBody"));
            } catch (error) {
              Alert.alert(
                t("booking.captureError"),
                error instanceof Error ? error.message : t("common.tryAgain"),
              );
            } finally {
              setIsCapturing(false);
            }
          })();
        },
      },
    ]);
  }, [isCapturing, loadDetails, payment, t]);

  const handleRefundPayment = useCallback(() => {
    if (!payment || isRefunding) {
      return;
    }

    Alert.alert(t("booking.refundTitle"), t("booking.refundBody"), [
      {
        text: t("booking.keep"),
        style: "cancel",
      },
      {
        text: t("booking.refund"),
        style: "destructive",
        onPress: () => {
          void (async () => {
            setIsRefunding(true);
            try {
              const nextPayment = await refundPayment(payment.id);
              setPayment(nextPayment);
              await loadDetails();
              Alert.alert(t("booking.refundSuccessTitle"), t("booking.refundSuccessBody"));
            } catch (error) {
              Alert.alert(
                t("booking.refundError"),
                error instanceof Error ? error.message : t("common.tryAgain"),
              );
            } finally {
              setIsRefunding(false);
            }
          })();
        },
      },
    ]);
  }, [isRefunding, loadDetails, payment, t]);

  if (mode === "detail") {
    if (isLoadingDetails) {
      return (
        <FallbackScreen
          body={t("booking.loadingDetails")}
          colors={colors}
          isDark={isDark}
          loading
          title={t("booking.detailsTitle")}
        />
      );
    }

    if (detailsError || !details) {
      return (
        <FallbackScreen
          body={detailsError ?? t("booking.detailsUnavailable")}
          colors={colors}
          isDark={isDark}
          title={t("booking.detailsTitle")}
        />
      );
    }

    const durationMinutes = getDurationMinutes(details.booking.startTime, details.booking.endTime);
    const canCancel = ["pending", "confirmed"].includes(details.booking.status);
    const canCheckIn = details.booking.status === "confirmed";
    const hasReusableTarget = Boolean(getBookingTargetId(details.booking));
    const canReschedule = ["pending", "confirmed"].includes(details.booking.status) && hasReusableTarget;
    const canRepeat = ["completed", "cancelled", "expired", "no_show"].includes(details.booking.status) && hasReusableTarget;
    const canCapture = payment ? ["pending", "authorized"].includes(payment.status) : false;
    const canRefund = payment ? payment.status === "captured" && payment.refundedCents < payment.amountCents : false;
    const actionParams = {
      reschedule: buildBookingActionParams(details, "reschedule"),
      repeat: buildBookingActionParams(details, "repeat"),
    };

    return (
      <DetailsShell colors={colors} title={t("booking.detailsTitle")}>
        {notice ? <NoticeCard colors={colors} isDark={isDark} message={notice} /> : null}
        <DetailCard colors={colors} isDark={isDark}>
          <SummaryRow
            colors={colors}
            label={getTargetSummaryLabel(details.booking.level)}
            value={details.booking.level === "room" ? details.roomName : details.booking.level === "venue" ? details.venueName : details.seatLabel ?? t("booking.seatUnavailable")}
          />
          {details.booking.level === "seat" && details.seatType ? (
            <SummaryRow colors={colors} label={t("booking.type")} value={details.seatType} />
          ) : null}
          {details.booking.level === "seat" ? (
            <SummaryRow colors={colors} label={t("booking.room")} value={details.roomName} />
          ) : null}
          <SummaryRow colors={colors} label={t("booking.venue")} value={details.venueName} />
          <SummaryRow colors={colors} label={t("booking.address")} value={details.venueAddress} />
        </DetailCard>
        <DetailCard colors={colors} isDark={isDark}>
          <SummaryRow colors={colors} label={t("booking.bookingId")} value={details.booking.id} />
          <SummaryRow colors={colors} label={t("booking.level")} value={details.booking.level} />
          <SummaryRow colors={colors} label={t("booking.status")} value={details.booking.status} />
          <SummaryRow colors={colors} label={t("booking.start")} value={formatDateTime(details.booking.startTime, locale)} />
          <SummaryRow colors={colors} label={t("booking.end")} value={formatDateTime(details.booking.endTime, locale)} />
          <SummaryRow colors={colors} label={t("room.duration")} value={t("booking.minutes", { count: durationMinutes })} />
          <SummaryRow
            colors={colors}
            label={t("booking.price")}
            value={formatPaymentAmount(details.booking.priceAmountCents, details.booking.priceCurrency)}
          />
        </DetailCard>
        <View style={{ flexDirection: "row", gap: 12, marginBottom: 12 }}>
          <TouchableOpacity
            disabled={!canCheckIn || isCheckingIn}
            onPress={() => void handleCheckIn()}
            style={{
              flex: 1,
              backgroundColor: canCheckIn ? colors.accent : colors.buttonDisabled,
              borderRadius: 999,
              paddingVertical: 16,
              alignItems: "center",
            }}
          >
            {isCheckingIn ? (
              <ActivityIndicator size="small" color={colors.accentContrast} />
            ) : (
              <Text
                style={{
                  fontFamily: "Inter",
                  fontWeight: "700",
                  fontSize: 14,
                  color: colors.accentContrast,
                }}
              >
                {t("booking.checkIn")}
              </Text>
            )}
          </TouchableOpacity>
          <TouchableOpacity
            disabled={!canCancel || isCancelling}
            onPress={handleCancelBooking}
            style={{
              flex: 1,
              backgroundColor: canCancel ? colors.buttonSecondaryBackground : colors.buttonDisabled,
              borderRadius: 999,
              paddingVertical: 16,
              alignItems: "center",
              borderWidth: 1,
              borderColor: canCancel ? colors.buttonSecondaryBorder : colors.buttonDisabled,
            }}
          >
            {isCancelling ? (
              <ActivityIndicator size="small" color={colors.text} />
            ) : (
              <Text
                style={{
                  fontFamily: "Inter",
                  fontWeight: "700",
                  fontSize: 14,
                  color: colors.text,
                }}
              >
                {t("booking.cancelAction")}
              </Text>
            )}
          </TouchableOpacity>
        </View>
        <View style={{ flexDirection: "row", gap: 12, marginBottom: 16 }}>
          <TouchableOpacity
            disabled={!canReschedule || !actionParams.reschedule}
            onPress={() => {
              if (!actionParams.reschedule) {
                return;
              }

              router.push({
                pathname: "/booking/[id]",
                params: actionParams.reschedule,
              });
            }}
            style={{
              flex: 1,
              backgroundColor: canReschedule ? colors.surface : colors.buttonDisabled,
              borderRadius: 999,
              paddingVertical: 16,
              alignItems: "center",
              borderWidth: 1,
              borderColor: canReschedule ? colors.borderSoft : colors.buttonDisabled,
            }}
          >
            <Text
              style={{
                fontFamily: "Inter",
                fontWeight: "700",
                fontSize: 14,
                color: canReschedule ? colors.text : colors.textMuted,
              }}
            >
              {t("booking.rescheduleAction")}
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            disabled={!canRepeat || !actionParams.repeat}
            onPress={() => {
              if (!actionParams.repeat) {
                return;
              }

              router.push({
                pathname: "/booking/[id]",
                params: actionParams.repeat,
              });
            }}
            style={{
              flex: 1,
              backgroundColor: canRepeat ? colors.surface : colors.buttonDisabled,
              borderRadius: 999,
              paddingVertical: 16,
              alignItems: "center",
              borderWidth: 1,
              borderColor: canRepeat ? colors.borderSoft : colors.buttonDisabled,
            }}
          >
            <Text
              style={{
                fontFamily: "Inter",
                fontWeight: "700",
                fontSize: 14,
                color: canRepeat ? colors.text : colors.textMuted,
              }}
            >
              {t("booking.repeatAction")}
            </Text>
          </TouchableOpacity>
        </View>
        <PaymentSection
          canCapture={canCapture}
          canRefund={canRefund}
          colors={colors}
          isCapturing={isCapturing}
          isDark={isDark}
          isLoadingPayment={isLoadingPayment}
          isRefunding={isRefunding}
          onCapture={handleCapturePayment}
          onRefund={handleRefundPayment}
          payment={payment}
          paymentError={paymentError}
          paymentIdParam={paymentIdParam}
        />
        <TouchableOpacity
          onPress={() => {
            void refreshDetailsAndPayment();
          }}
          style={{
            backgroundColor: colors.surface,
            borderRadius: 999,
            paddingVertical: 16,
            alignItems: "center",
            borderWidth: 1,
            borderColor: colors.borderSoft,
          }}
        >
          <Text
            style={{
              fontFamily: "Inter",
              fontWeight: "700",
              fontSize: 14,
              color: colors.text,
            }}
          >
            {t("booking.refreshDetails")}
          </Text>
        </TouchableOpacity>
      </DetailsShell>
    );
  }

  if (!hydratedBookingTarget) {
    return (
      <FallbackScreen
        body={t("booking.contextMissing")}
        colors={colors}
        isDark={isDark}
        title={t("booking.title")}
      />
    );
  }

  return (
    <SafeAreaView edges={["top"]} style={{ flex: 1, backgroundColor: colors.background }}>
      <View style={{ flex: 1 }}>
        <Header colors={colors} title={bookingAction === "reschedule" ? t("booking.rescheduleTitle") : bookingAction === "repeat" ? t("booking.repeatTitle") : getTargetTitle(hydratedBookingTarget)} />
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 180 }}
        >
          <DetailCard colors={colors} isDark={isDark}>
            <SummaryRow colors={colors} label={getTargetSummaryLabel(hydratedBookingTarget.level)} value={hydratedBookingTarget.level === "room" ? hydratedBookingTarget.roomName : hydratedBookingTarget.level === "venue" ? hydratedBookingTarget.venueName : hydratedBookingTarget.seatLabel ?? getSeatFallbackLabel(hydratedBookingTarget.targetId)} />
            {hydratedBookingTarget.level === "seat" && hydratedBookingTarget.seatType ? (
              <SummaryRow colors={colors} label={t("booking.type")} value={hydratedBookingTarget.seatType} />
            ) : null}
            {hydratedBookingTarget.roomId ? (
              <SummaryRow colors={colors} label={t("booking.room")} value={hydratedBookingTarget.roomName} />
            ) : null}
            <SummaryRow colors={colors} label={t("booking.venue")} value={hydratedBookingTarget.venueName} />
            <SummaryRow colors={colors} label={t("booking.address")} value={hydratedBookingTarget.venueAddress} />
            <SummaryRow
              colors={colors}
              label={t("booking.timezone")}
              value={hydratedBookingTarget.venueTimezone || t("booking.unknown")}
            />
          </DetailCard>
          <DetailCard colors={colors} isDark={isDark}>
            <SummaryRow
              colors={colors}
              label={t("booking.roomBooking")}
              value={hydratedBookingTarget.level === "room" ? t("booking.fullRoom") : hydratedBookingTarget.allowFullRoomBooking ? t("booking.fullAndSeat") : t("booking.seatOnly")}
            />
            <SummaryRow
              colors={colors}
              label={t("room.minimumDuration")}
              value={hydratedBookingTarget.bookingRules?.minDurationMinutes ? t("booking.minutes", { count: hydratedBookingTarget.bookingRules.minDurationMinutes }) : t("room.notSpecified")}
            />
            <SummaryRow
              colors={colors}
              label={t("room.maximumDuration")}
              value={hydratedBookingTarget.bookingRules?.maxDurationMinutes ? t("booking.minutes", { count: hydratedBookingTarget.bookingRules.maxDurationMinutes }) : t("room.notSpecified")}
            />
            <SummaryRow
              colors={colors}
              label={t("room.holdTtl")}
              value={hydratedBookingTarget.bookingRules?.holdTtlSeconds ? t("booking.minutes", { count: Math.round(hydratedBookingTarget.bookingRules.holdTtlSeconds / 60) }) : t("room.notSpecified")}
            />
            {hydratedBookingTarget.roomFeatures.length > 0 ? (
              <Text
                style={{
                  fontFamily: "Inter",
                  fontSize: 14,
                  color: colors.textMuted,
                }}
              >
                {t("booking.features")}: <Text style={{ color: colors.text, fontWeight: "600" }}>{hydratedBookingTarget.roomFeatures.join(", ")}</Text>
              </Text>
            ) : null}
            {isLoadingBookingTarget ? (
              <ActivityIndicator size="small" color={colors.accent} />
            ) : null}
          </DetailCard>
          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
              justifyContent: "space-between",
              marginBottom: 12,
            }}
          >
            <Text
              style={{
                fontFamily: "Inter",
                fontWeight: "700",
                fontSize: 24,
                color: colors.heading,
              }}
            >
              {t("booking.selectDate")}
            </Text>
            <TouchableOpacity
              onPress={() => {
                const baseDate = selectedDate ? new Date(`${selectedDate}T00:00:00`) : getStartOfToday();
                if (!Number.isNaN(baseDate.getTime())) {
                  setVisibleMonth(new Date(baseDate.getFullYear(), baseDate.getMonth(), 1));
                }
                setIsCalendarOpen(true);
              }}
              style={{
                width: 46,
                height: 46,
                borderRadius: 23,
                backgroundColor: colors.surface,
                borderWidth: 1,
                borderColor: colors.borderSoft,
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <Calendar size={20} color={colors.text} />
            </TouchableOpacity>
          </View>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={{ gap: 10, paddingBottom: 12 }}
          >
            {dates.map((dateValue) => {
              const isSelected = selectedDate === dateValue;
              return (
                <TouchableOpacity
                  key={dateValue}
                  onPress={() => setSelectedDate(dateValue)}
                  style={{
                    paddingHorizontal: 16,
                    paddingVertical: 14,
                    borderRadius: 999,
                    backgroundColor: isSelected ? colors.surfaceMuted : colors.surface,
                    borderWidth: 1.5,
                    borderColor: isSelected ? colors.selectedOutline : colors.peachBorder,
                  }}
                >
                  <Text
                    style={{
                      fontFamily: "Inter",
                      fontWeight: "600",
                      fontSize: 13,
                      color: isSelected ? colors.accentStrong : colors.heading,
                    }}
                  >
                    {formatDateOnly(dateValue, locale)}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
          <Text
            style={{
              fontFamily: "Inter",
              fontWeight: "700",
              fontSize: 24,
              color: colors.heading,
              marginBottom: 12,
            }}
          >
            {t("booking.selectDuration")}
          </Text>
          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 10, marginBottom: 18 }}>
            {durationOptions.map((minutes) => {
              const isSelected = selectedDuration === minutes;
              return (
                <TouchableOpacity
                  key={minutes}
                  onPress={() => setSelectedDuration(minutes)}
                  style={{
                    paddingHorizontal: 16,
                    paddingVertical: 14,
                    borderRadius: 999,
                    backgroundColor: isSelected ? colors.surfaceMuted : colors.surface,
                    borderWidth: 1.5,
                    borderColor: isSelected ? colors.selectedOutline : colors.peachBorder,
                  }}
                >
                  <Text
                    style={{
                      fontFamily: "Inter",
                      fontWeight: "600",
                      fontSize: 13,
                      color: isSelected ? colors.accentStrong : colors.heading,
                    }}
                  >
                    {t("booking.minutes", { count: minutes })}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
          <DetailCard colors={colors} isDark={isDark}>
            <Text
              style={{
                fontFamily: "Inter",
                fontWeight: "700",
                fontSize: 18,
                color: colors.heading,
                marginBottom: 8,
              }}
            >
              {t("booking.availableSlots")}
            </Text>
            <SummaryRow
              colors={colors}
              label={t("booking.selectedDate")}
              value={selectedDate ? formatDateOnly(selectedDate, locale) : t("booking.chooseDate")}
            />
            <SummaryRow colors={colors} label={t("room.duration")} value={t("booking.minutes", { count: selectedDuration })} />
            {isLoadingSlots ? (
              <View style={{ paddingVertical: 12 }}>
                <ActivityIndicator size="small" color={colors.accent} />
              </View>
            ) : slotsError ? (
              <Text
                style={{
                  fontFamily: "Inter",
                  fontSize: 13,
                  color: colors.error,
                  marginTop: 8,
                }}
              >
                {slotsError}
              </Text>
            ) : slots.length === 0 ? (
              <Text
                style={{
                  fontFamily: "Inter",
                  fontSize: 13,
                  color: colors.textMuted,
                  marginTop: 8,
                }}
              >
                {t("booking.noSlots")}
              </Text>
            ) : (
              <View style={{ gap: 10, marginTop: 8 }}>
                {slots.map((slot) => {
                  const isSelected = selectedSlotStart === slot.startTime;
                  return (
                    <TouchableOpacity
                      key={slot.startTime}
                      disabled={!slot.available}
                      onPress={() => setSelectedSlotStart(slot.startTime)}
                      style={{
                        paddingHorizontal: 14,
                        paddingVertical: 14,
                        borderRadius: 20,
                        backgroundColor: isSelected ? colors.surfaceMuted : colors.surface,
                        borderWidth: 1.5,
                        borderColor: isSelected ? colors.selectedOutline : colors.peachBorder,
                        opacity: slot.available ? 1 : 0.55,
                      }}
                    >
                      <Text
                        style={{
                          fontFamily: "Inter",
                          fontWeight: "700",
                          fontSize: 14,
                          color: colors.heading,
                          marginBottom: 4,
                        }}
                      >
                        {formatSlotLabel(slot, locale)}
                      </Text>
                      <Text
                        style={{
                          fontFamily: "Inter",
                          fontSize: 12,
                          color: colors.textMuted,
                        }}
                      >
                        {slot.available ? t("booking.available") : t("room.unavailable")}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            )}
          </DetailCard>
          <DetailCard colors={colors} isDark={isDark}>
            <SummaryRow colors={colors} label={getTargetSummaryLabel(hydratedBookingTarget.level)} value={hydratedBookingTarget.level === "room" ? hydratedBookingTarget.roomName : hydratedBookingTarget.level === "venue" ? hydratedBookingTarget.venueName : hydratedBookingTarget.seatLabel ?? getSeatFallbackLabel(hydratedBookingTarget.targetId)} />
            <SummaryRow
              colors={colors}
              label={t("booking.time")}
              value={selectedSlot ? formatSlotLabel(selectedSlot, locale) : t("booking.selectSlot")}
            />
            <SummaryRow colors={colors} label={t("room.duration")} value={t("booking.minutes", { count: selectedDuration })} />
          </DetailCard>
        </ScrollView>
        <Modal
          animationType="fade"
          transparent
          visible={isCalendarOpen}
          onRequestClose={() => setIsCalendarOpen(false)}
        >
          <View
            style={{
              flex: 1,
              backgroundColor: "rgba(15, 23, 42, 0.38)",
              justifyContent: "center",
              paddingHorizontal: 16,
            }}
          >
            <View
              style={{
                backgroundColor: colors.surface,
                borderRadius: Radii.card,
                padding: 18,
                gap: 14,
              }}
            >
              <View
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  justifyContent: "space-between",
                }}
              >
                <TouchableOpacity
                  onPress={() => setVisibleMonth((current) => new Date(current.getFullYear(), current.getMonth() - 1, 1))}
                  disabled={visibleMonth.getFullYear() === getStartOfToday().getFullYear() && visibleMonth.getMonth() === getStartOfToday().getMonth()}
                  style={{
                    paddingHorizontal: 12,
                    paddingVertical: 8,
                    borderRadius: 999,
                    backgroundColor: colors.surfaceMuted,
                    opacity: visibleMonth.getFullYear() === getStartOfToday().getFullYear() && visibleMonth.getMonth() === getStartOfToday().getMonth() ? 0.5 : 1,
                  }}
                >
                  <Text style={{ textAlign: "center", fontFamily: "Inter", fontWeight: "700", fontSize: 12, color: colors.text }}>{"<"}</Text>
                </TouchableOpacity>
                <Text style={{ fontFamily: "Inter", fontWeight: "700", fontSize: 18, color: colors.heading }}>
                  {calendarMonthLabel}
                </Text>
                <TouchableOpacity
                  onPress={() => setVisibleMonth((current) => new Date(current.getFullYear(), current.getMonth() + 1, 1))}
                  style={{
                    paddingHorizontal: 12,
                    paddingVertical: 8,
                    borderRadius: 999,
                    backgroundColor: colors.surfaceMuted,
                  }}
                >
                  <Text style={{ textAlign: "center", fontFamily: "Inter", fontWeight: "700", fontSize: 12, color: colors.text }}>{">"}</Text>
                </TouchableOpacity>
              </View>
              <View style={{ flexDirection: "row", flexWrap: "wrap" }}>
                {calendarWeekdayLabels.map((label) => (
                  <View key={label} style={{ width: "14.2857%", paddingVertical: 6 }}>
                    <Text style={{ textAlign: "center", fontFamily: "Inter", fontWeight: "600", fontSize: 12, color: colors.textMuted }}>
                      {label}
                    </Text>
                  </View>
                ))}
                {calendarDays.map((day) => {
                  const isSelected = day.dateKey === selectedDate;
                  const isDisabled = day.isPast;
                  return (
                    <TouchableOpacity
                      key={day.dateKey}
                      disabled={isDisabled}
                      onPress={() => {
                        setSelectedDate(day.dateKey);
                        setIsCalendarOpen(false);
                      }}
                      style={{
                        width: "14.2857%",
                        aspectRatio: 1,
                        padding: 4,
                        opacity: day.isCurrentMonth ? 1 : 0.55,
                      }}
                    >
                      <View
                        style={{
                          flex: 1,
                          borderRadius: 14,
                          alignItems: "center",
                          justifyContent: "center",
                          backgroundColor: isSelected ? colors.accentStrong : colors.surfaceMuted,
                          borderWidth: isSelected ? 0 : 1,
                          borderColor: colors.borderSoft,
                          opacity: isDisabled ? 0.35 : 1,
                        }}
                      >
                        <Text
                          style={{
                            fontFamily: "Inter",
                            fontWeight: isSelected ? "700" : "500",
                            fontSize: 14,
                            color: isSelected ? colors.accentContrast : colors.text,
                          }}
                        >
                          {day.dayNumber}
                        </Text>
                      </View>
                    </TouchableOpacity>
                  );
                })}
              </View>
              <View style={{ flexDirection: "row", gap: 12 }}>
                <TouchableOpacity
                  onPress={() => setIsCalendarOpen(false)}
                  style={{
                    flex: 1,
                    borderRadius: 999,
                    paddingVertical: 14,
                    alignItems: "center",
                    backgroundColor: colors.buttonSecondaryBackground,
                    borderWidth: 1,
                    borderColor: colors.buttonSecondaryBorder,
                  }}
                >
                  <Text style={{ fontFamily: "Inter", fontWeight: "700", fontSize: 14, color: colors.text }}>{t("common.cancel")}</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={() => {
                    setSelectedDate(formatDateKey(getStartOfToday()));
                    setVisibleMonth(new Date(getStartOfToday().getFullYear(), getStartOfToday().getMonth(), 1));
                    setIsCalendarOpen(false);
                  }}
                  style={{
                    flex: 1,
                    borderRadius: 999,
                    paddingVertical: 14,
                    alignItems: "center",
                    backgroundColor: colors.accent,
                  }}
                >
                  <Text style={{ fontFamily: "Inter", fontWeight: "700", fontSize: 14, color: colors.accentContrast }}>{t("booking.today")}</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>
        <View
          style={{
            position: "absolute",
            left: 0,
            right: 0,
            bottom: 0,
            paddingHorizontal: 16,
            paddingTop: 14,
            paddingBottom: 24,
            backgroundColor: colors.background,
            borderTopWidth: 1,
            borderTopColor: colors.footerDivider,
          }}
        >
          <TouchableOpacity
            onPress={() => void handleBooking()}
            disabled={!selectedSlot || isSubmitting || isLoadingSlots}
            style={{
              backgroundColor:
                !selectedSlot || isSubmitting || isLoadingSlots
                  ? colors.buttonDisabled
                  : colors.accentStrong,
              borderRadius: 999,
              paddingVertical: 18,
              alignItems: "center",
            }}
          >
            {isSubmitting ? (
              <ActivityIndicator size="small" color={colors.accentContrast} />
            ) : (
              <Text
                style={{
                  fontFamily: "Inter",
                  fontWeight: "700",
                  fontSize: 16,
                  color: colors.accentContrast,
                }}
              >
                {bookingAction === "reschedule" ? t("booking.confirmNewTime") : bookingAction === "repeat" ? t("booking.createRepeat") : t("booking.confirmTarget", { target: getTargetSummaryLabel(hydratedBookingTarget.level) })}
              </Text>
            )}
          </TouchableOpacity>
        </View>
      </View>
    </SafeAreaView>
  );
}

function PaymentSection({
  canCapture,
  canRefund,
  colors,
  isCapturing,
  isDark,
  isLoadingPayment,
  isRefunding,
  onCapture,
  onRefund,
  payment,
  paymentError,
  paymentIdParam,
}: {
  canCapture: boolean;
  canRefund: boolean;
  colors: ReturnType<typeof useAppTheme>["colors"];
  isCapturing: boolean;
  isDark: boolean;
  isLoadingPayment: boolean;
  isRefunding: boolean;
  onCapture: () => void;
  onRefund: () => void;
  payment: Transaction | null;
  paymentError: string | null;
  paymentIdParam?: string;
}) {
  const locale = getLocaleForLanguage(getI18nLanguage());
  if (isLoadingPayment) {
    return (
      <DetailCard colors={colors} isDark={isDark}>
        <Text
          style={{
            fontFamily: "Inter",
            fontWeight: "700",
            fontSize: 16,
            color: colors.heading,
            marginBottom: 4,
          }}
        >
          {translate("booking.paymentTitle")}
        </Text>
        <ActivityIndicator size="small" color={colors.accent} />
        <Text
          style={{
            fontFamily: "Inter",
            fontSize: 14,
            color: colors.textMuted,
            lineHeight: 21,
          }}
        >
          {translate("booking.paymentLoading")}
        </Text>
      </DetailCard>
    );
  }

  if (paymentError) {
    return (
      <DetailCard colors={colors} isDark={isDark}>
        <Text
          style={{
            fontFamily: "Inter",
            fontWeight: "700",
            fontSize: 16,
            color: colors.heading,
            marginBottom: 4,
          }}
        >
          {translate("booking.paymentTitle")}
        </Text>
        <Text
          style={{
            fontFamily: "Inter",
            fontSize: 14,
            color: colors.textMuted,
            lineHeight: 21,
          }}
        >
          {paymentError}
        </Text>
      </DetailCard>
    );
  }

  if (!payment) {
    return (
      <DetailCard colors={colors} isDark={isDark}>
        <Text
          style={{
            fontFamily: "Inter",
            fontWeight: "700",
            fontSize: 16,
            color: colors.heading,
            marginBottom: 4,
          }}
        >
          {translate("booking.paymentTitle")}
        </Text>
        <Text
          style={{
            fontFamily: "Inter",
            fontSize: 14,
            color: colors.textMuted,
            lineHeight: 21,
          }}
        >
          {paymentIdParam ? translate("booking.paymentUnavailable") : translate("booking.paymentNotLoaded")}
        </Text>
      </DetailCard>
    );
  }

  return (
    <DetailCard colors={colors} isDark={isDark}>
      <Text
        style={{
          fontFamily: "Inter",
          fontWeight: "700",
          fontSize: 16,
          color: colors.heading,
          marginBottom: 4,
        }}
      >{translate("booking.paymentTitle")}</Text>
      <SummaryRow colors={colors} label={translate("booking.paymentId")} value={payment.id} />
      <SummaryRow colors={colors} label={translate("booking.provider")} value={payment.provider} />
      <SummaryRow colors={colors} label={translate("booking.status")} value={payment.status} />
      <SummaryRow colors={colors} label={translate("booking.amount")} value={formatPaymentAmount(payment.amountCents, payment.currency)} />
      <SummaryRow colors={colors} label={translate("booking.refunded")} value={formatPaymentAmount(payment.refundedCents, payment.currency)} />
      <SummaryRow colors={colors} label={translate("booking.created")} value={formatDateTime(payment.createdAt, locale)} />
      <SummaryRow colors={colors} label={translate("booking.authorized")} value={formatNullableDateTime(payment.authorizedAt, locale, translate("common.notAvailable"))} />
      <SummaryRow colors={colors} label={translate("booking.captured")} value={formatNullableDateTime(payment.capturedAt, locale, translate("common.notAvailable"))} />
      <SummaryRow colors={colors} label={translate("booking.refundedAt")} value={formatNullableDateTime(payment.refundedAt, locale, translate("common.notAvailable"))} />
      <View style={{ flexDirection: "row", gap: 12, marginTop: 8 }}>
        <TouchableOpacity
          disabled={!canCapture || isCapturing}
          onPress={onCapture}
          style={{
            flex: 1,
            backgroundColor: canCapture ? colors.accent : colors.buttonDisabled,
            borderRadius: 999,
            paddingVertical: 14,
            alignItems: "center",
          }}
        >
          {isCapturing ? (
            <ActivityIndicator size="small" color={colors.accentContrast} />
          ) : (
            <Text
              style={{
                fontFamily: "Inter",
                fontWeight: "700",
                fontSize: 14,
                color: colors.accentContrast,
              }}
            >
              {translate("booking.capture")}
            </Text>
          )}
        </TouchableOpacity>
        <TouchableOpacity
          disabled={!canRefund || isRefunding}
          onPress={onRefund}
          style={{
            flex: 1,
            backgroundColor: canRefund ? colors.buttonSecondaryBackground : colors.buttonDisabled,
            borderRadius: 999,
            paddingVertical: 14,
            alignItems: "center",
            borderWidth: 1,
            borderColor: canRefund ? colors.buttonSecondaryBorder : colors.buttonDisabled,
          }}
        >
          {isRefunding ? (
            <ActivityIndicator size="small" color={colors.text} />
          ) : (
            <Text
              style={{
                fontFamily: "Inter",
                fontWeight: "700",
                fontSize: 14,
                color: colors.text,
              }}
            >
              {translate("booking.refund")}
            </Text>
          )}
        </TouchableOpacity>
      </View>
    </DetailCard>
  );
}

function DetailsShell({
  children,
  colors,
  title,
}: {
  children: ReactNode;
  colors: ReturnType<typeof useAppTheme>["colors"];
  title: string;
}) {
  return (
    <SafeAreaView edges={["top"]} style={{ flex: 1, backgroundColor: colors.background }}>
      <Header colors={colors} title={title} />
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 32 }}
      >
        {children}
      </ScrollView>
    </SafeAreaView>
  );
}

function Header({
  colors,
  title,
}: {
  colors: ReturnType<typeof useAppTheme>["colors"];
  title: string;
}) {
  return (
    <View
      style={{
        paddingTop: 16,
        paddingBottom: 8,
        paddingHorizontal: 16,
        flexDirection: "row",
        alignItems: "center",
        gap: 12,
      }}
    >
      <TouchableOpacity
        onPress={() => router.back()}
        style={{
          width: 44,
          height: 44,
          borderRadius: 22,
          borderWidth: 1,
          borderColor: colors.borderSoft,
          backgroundColor: colors.surface,
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <ArrowLeft size={20} color={colors.text} />
      </TouchableOpacity>
      <Text
        numberOfLines={1}
        style={{
          flex: 1,
          fontFamily: "Inter",
          fontWeight: "700",
          fontSize: 20,
          color: colors.heading,
        }}
      >
        {title}
      </Text>
    </View>
  );
}

function NoticeCard({
  colors,
  isDark,
  message,
}: {
  colors: ReturnType<typeof useAppTheme>["colors"];
  isDark: boolean;
  message: string;
}) {
  return (
    <DetailCard colors={colors} isDark={isDark}>
      <Text
        style={{
          fontFamily: "Inter",
          fontSize: 14,
          lineHeight: 21,
          color: colors.text,
        }}
      >
        {message}
      </Text>
    </DetailCard>
  );
}

function FallbackScreen({
  body,
  colors,
  isDark,
  loading,
  title,
}: {
  body: string;
  colors: ReturnType<typeof useAppTheme>["colors"];
  isDark: boolean;
  loading?: boolean;
  title: string;
}) {
  return (
    <DetailsShell colors={colors} title={title}>
      <DetailCard colors={colors} isDark={isDark}>
        {loading ? <ActivityIndicator size="small" color={colors.accent} /> : null}
        <Text
          style={{
            fontFamily: "Inter",
            fontSize: 14,
            color: colors.textMuted,
            lineHeight: 21,
            textAlign: "center",
          }}
        >
          {body}
        </Text>
      </DetailCard>
    </DetailsShell>
  );
}

function DetailCard({
  children,
  colors,
  isDark,
}: {
  children: ReactNode;
  colors: ReturnType<typeof useAppTheme>["colors"];
  isDark: boolean;
}) {
  return (
    <View
      style={{
        backgroundColor: colors.surface,
        borderRadius: Radii.card,
        shadowColor: colors.shadow,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: isDark ? 0.22 : 0.05,
        shadowRadius: 12,
        elevation: 3,
        padding: 18,
        marginBottom: 16,
        gap: 8,
      }}
    >
      {children}
    </View>
  );
}

function SummaryRow({
  colors,
  label,
  value,
}: {
  colors: ReturnType<typeof useAppTheme>["colors"];
  label: string;
  value: string;
}) {
  return (
    <Text
      style={{
        fontFamily: "Inter",
        fontSize: 14,
        color: colors.textMuted,
      }}
    >
      {label}: <Text style={{ color: colors.text, fontWeight: "600" }}>{value}</Text>
    </Text>
  );
}























































































