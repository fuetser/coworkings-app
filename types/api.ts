export type AuthUser = {
  id: string;
  email: string;
  name: string;
  phone?: string | null;
};

export type CurrentUserResponse = AuthUser;

export type UpdateCurrentUserRequest = {
  name?: string;
  phone?: string | null;
};

export type AuthSession = {
  accessToken: string;
  refreshToken: string;
  user: AuthUser;
};

export type LoginResponse = AuthSession;

export type RefreshSessionRequest = {
  refreshToken: string;
};

export type RefreshSessionResponse = Pick<
  AuthSession,
  "accessToken" | "refreshToken"
>;

export type LogoutRequest = {
  refreshToken: string;
};

export type LoginRequest = {
  email: string;
  password: string;
};

export type ForgotPasswordRequest = {
  email: string;
};

export type ForgotPasswordResponse = {
  message: string;
  resetToken?: string;
};

export type ResetPasswordRequest = {
  token: string;
  newPassword: string;
};

export type ResetPasswordResponse = {
  message?: string;
};

export type RegisterRequest = {
  email: string;
  password: string;
  name: string;
  phone?: string;
};

export type VenueListItem = {
  id: string;
  name: string;
  address: string;
  features: string[];
  availableWorkplaces: number;
};

export type FavoriteVenue = VenueListItem;

export type FavoritesResponse = FavoriteVenue[];

export type RoomBrief = {
  id: string;
  name: string;
  allowFullRoomBooking: boolean;
  features: string[];
};

export type VenueFull = VenueListItem & {
  timezone: string;
  location: {
    lat: number;
    lon: number;
  };
  rooms: RoomBrief[];
};

export type SeatBrief = {
  id: string;
  label: string;
  gridX: number;
  gridY: number;
  seatType: string;
  attributes: Record<string, unknown>;
  active: boolean;
};

export type RoomDetails = RoomBrief & {
  description?: string | null;
  capacity?: number | null;
  venueId?: string | null;
  venueName?: string | null;
  timezone?: string | null;
  seats: SeatBrief[];
};

export type FeatureItem = {
  id: string;
  slug: string;
  name: string;
  description?: string | null;
  category?: string | null;
};

export type RoomHourSlot = {
  weekday: number;
  dayLabel?: string | null;
  opensAt?: string | null;
  closesAt?: string | null;
  closed?: boolean;
};

export type RoomHours = {
  roomId: string;
  timezone?: string | null;
  schedule: RoomHourSlot[];
};

export type TariffScope = "global" | "venue" | "room" | "seat";

export type Tariff = {
  id: string;
  name: string;
  description?: string | null;
  priceAmountCents: number;
  currency: string;
  durationMinutes: number;
  scope: TariffScope;
  scopeId?: string | null;
  active?: boolean;
};

export type BookingRuleScope = "global" | "venue" | "room" | "seat";

export type BookingRules = {
  scope: BookingRuleScope;
  scopeId?: string | null;
  minDurationMinutes?: number | null;
  maxDurationMinutes?: number | null;
  holdTtlSeconds?: number | null;
  paymentRequired?: boolean | null;
  advanceBookingDays?: number | null;
  cancellationWindowMinutes?: number | null;
};

export type AvailabilitySlot = {
  startTime: string;
  endTime: string;
  available: boolean;
  seatId: string | null;
};

export type AvailabilityResponse = {
  date: string;
  timeSlots: AvailabilitySlot[];
};

export type BookingLevel = "seat" | "room" | "venue";

export type HoldCreateRequest = {
  level: BookingLevel;
  seatId?: string | null;
  roomId?: string | null;
  venueId?: string | null;
  startTime: string;
  endTime: string;
};

export type Hold = {
  id: string;
  level: BookingLevel;
  seatId: string | null;
  roomId: string | null;
  venueId: string;
  userId: string;
  startTime: string;
  endTime: string;
  expiresAt: string;
  status: string;
  createdAt: string;
};

export type BookingCreateRequest = {
  level: BookingLevel;
  seatId?: string | null;
  roomId?: string | null;
  venueId?: string | null;
  holdId?: string | null;
  startTime: string;
  endTime: string;
};

export type BookingStatus =
  | "pending"
  | "confirmed"
  | "checked_in"
  | "cancelled"
  | "expired"
  | "no_show"
  | "completed";

export type Booking = {
  id: string;
  level: BookingLevel;
  status: BookingStatus;
  seatId: string | null;
  roomId: string | null;
  venueId: string;
  userId: string;
  holdId: string | null;
  startTime: string;
  endTime: string;
  priceAmountCents: number;
  priceCurrency: string;
  createdAt: string;
  updatedAt: string;
  cancelledAt: string | null;
};

export type BookingListItem = Pick<
  Booking,
  | "id"
  | "level"
  | "status"
  | "seatId"
  | "roomId"
  | "venueId"
  | "startTime"
  | "endTime"
  | "priceAmountCents"
  | "priceCurrency"
>;

export type BookingListResponse = {
  items: BookingListItem[];
  page?: number;
  limit?: number;
  total?: number;
};

export type BookingHistoryResponse = {
  items: BookingListItem[];
};

export type BookingRescheduleRequest = {
  startTime: string;
  endTime: string;
};

export type BookingRepeatRequest = {
  startTime: string;
  endTime: string;
};

export type CheckinRequest = {
  method: "qr" | "manual" | "geo";
  lat?: number | null;
  lon?: number | null;
  qrCode?: string | null;
};

export type PaymentStatus =
  | "pending"
  | "authorized"
  | "captured"
  | "failed"
  | "refunded"
  | "cancelled";

export type PaymentCreateRequest = {
  bookingId: string;
  amountCents: number;
  currency: string;
  provider?: string;
};

export type Transaction = {
  id: string;
  bookingId: string;
  userId: string;
  provider: string;
  externalId: string;
  status: PaymentStatus;
  amountCents: number;
  refundedCents: number;
  currency: string;
  metadata: Record<string, unknown>;
  authorizedAt: string | null;
  capturedAt: string | null;
  refundedAt: string | null;
  createdAt: string;
  updatedAt: string;
};

export type NotificationPrefsUpdate = {
  emailNotifications?: boolean;
  pushNotifications?: boolean;
  reminderBeforeBooking?: boolean;
  promotionalEmails?: boolean;
};

export type NotificationPreferences = Required<NotificationPrefsUpdate>;

export type NotificationChannel = "push" | "email";

export type NotificationInboxItem = {
  id: string;
  type?: string | null;
  channel?: NotificationChannel | string | null;
  title?: string | null;
  message?: string | null;
  body?: string | null;
  createdAt?: string | null;
  readAt?: string | null;
  metadata?: Record<string, unknown> | null;
};

export type NotificationInboxResponse = {
  items: NotificationInboxItem[];
  page: number;
  limit: number;
  total: number;
};

export type PushTokenRegisterRequest = {
  pushToken: string;
  platform: "ios" | "android";
};

export type PushDeviceRegistration = {
  id: string;
  pushToken?: string | null;
  platform?: string | null;
  createdAt?: string | null;
};

