export type {
  BookingRuleScope,
  BookingRules,
  FeatureItem,
  RoomBrief,
  RoomDetails,
  RoomHourSlot,
  RoomHours,
  SeatBrief,
  Tariff,
  TariffScope,
  VenueFull,
  VenueListItem,
} from "@/types/api";

export type VenueListFilters = {
  q?: string;
  location?: string;
  date?: string;
  capacity?: number;
  features?: string[];
};
