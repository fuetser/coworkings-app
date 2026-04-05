import * as SecureStore from "expo-secure-store";
import { Platform } from "react-native";

import { translate } from "@/constants/i18n";
import { deleteRequest, get, post } from "@/services/api-client";
import { ApiClientError } from "@/services/api-errors";
import type { FavoriteVenue, FavoritesResponse } from "@/types/api";

type FavoriteVenueIdsByUser = Record<string, string[]>;
type FavoritesMigrationState = Record<string, boolean>;

const FAVORITES_STORAGE_KEY = "favorite-venues";
const FAVORITES_MIGRATED_STORAGE_KEY = "favorites-migrated";

function normalizeVenueIds(venueIds: string[]) {
  return [...new Set(venueIds.filter(Boolean))];
}

async function readStoredValue(key: string) {
  if (Platform.OS === "web") {
    if (typeof window === "undefined") {
      return null;
    }

    return window.localStorage.getItem(key);
  }

  return SecureStore.getItemAsync(key);
}

async function writeStoredValue(key: string, value: string) {
  if (Platform.OS === "web") {
    if (typeof window !== "undefined") {
      window.localStorage.setItem(key, value);
    }
    return;
  }

  await SecureStore.setItemAsync(key, value);
}

async function deleteStoredValue(key: string) {
  if (Platform.OS === "web") {
    if (typeof window !== "undefined") {
      window.localStorage.removeItem(key);
    }
    return;
  }

  await SecureStore.deleteItemAsync(key);
}

async function readFavoritesStore(): Promise<FavoriteVenueIdsByUser> {
  try {
    const raw = await readStoredValue(FAVORITES_STORAGE_KEY);
    if (!raw) {
      return {};
    }

    const parsed = JSON.parse(raw) as unknown;
    if (!parsed || typeof parsed !== "object") {
      return {};
    }

    return Object.fromEntries(
      Object.entries(parsed as Record<string, unknown>).map(([userId, venueIds]) => [
        userId,
        Array.isArray(venueIds)
          ? normalizeVenueIds(venueIds.filter((value): value is string => typeof value === "string"))
          : [],
      ]),
    );
  } catch {
    return {};
  }
}

async function writeFavoritesStore(store: FavoriteVenueIdsByUser) {
  await writeStoredValue(FAVORITES_STORAGE_KEY, JSON.stringify(store));
}

async function readMigrationState(): Promise<FavoritesMigrationState> {
  try {
    const raw = await readStoredValue(FAVORITES_MIGRATED_STORAGE_KEY);
    if (!raw) {
      return {};
    }

    const parsed = JSON.parse(raw) as unknown;
    if (!parsed || typeof parsed !== "object") {
      return {};
    }

    return Object.fromEntries(
      Object.entries(parsed as Record<string, unknown>).map(([userId, value]) => [userId, value === true]),
    );
  } catch {
    return {};
  }
}

export async function fetchFavorites() {
  return get<FavoritesResponse>("/favorites", {
    auth: true,
    fallbackMessage: translate("service.favorites.loadFavorites"),
  });
}

export async function addFavorite(venueId: string) {
  try {
    return await post<FavoriteVenue | void>("/favorites", {
      auth: true,
      body: { venueId },
      fallbackMessage: translate("service.favorites.updateFavorites"),
    });
  } catch (error) {
    if (error instanceof ApiClientError && error.status === 409) {
      return;
    }

    throw error;
  }
}

export async function removeFavorite(venueId: string) {
  return deleteRequest<void>(`/favorites/${venueId}`, {
    auth: true,
    fallbackMessage: translate("service.favorites.updateFavorites"),
  });
}

export async function getLegacyFavoriteVenueIds(userId: string) {
  if (!userId) {
    return [];
  }

  const store = await readFavoritesStore();
  return normalizeVenueIds(store[userId] ?? []);
}

export async function clearLegacyFavoriteVenueIds(userId: string) {
  if (!userId) {
    return;
  }

  const store = await readFavoritesStore();
  if (!(userId in store)) {
    return;
  }

  const { [userId]: _removed, ...rest } = store;
  await writeFavoritesStore(rest);
}

export async function hasCompletedFavoritesMigration(userId: string) {
  if (!userId) {
    return false;
  }

  const state = await readMigrationState();
  return state[userId] === true;
}

export async function markFavoritesMigrationCompleted(userId: string) {
  if (!userId) {
    return;
  }

  const state = await readMigrationState();
  await writeStoredValue(
    FAVORITES_MIGRATED_STORAGE_KEY,
    JSON.stringify({
      ...state,
      [userId]: true,
    }),
  );
}

export async function clearAllLegacyFavorites() {
  await deleteStoredValue(FAVORITES_STORAGE_KEY);
}
