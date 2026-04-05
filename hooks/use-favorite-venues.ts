import { PropsWithChildren, createContext, createElement, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";

import { useAuth } from "@/providers/auth-provider";
import {
  addFavorite,
  clearLegacyFavoriteVenueIds,
  fetchFavorites,
  getLegacyFavoriteVenueIds,
  hasCompletedFavoritesMigration,
  markFavoritesMigrationCompleted,
  removeFavorite,
} from "@/services/favorites";
import type { FavoriteVenue } from "@/types/api";

type FavoriteState = {
  favoriteVenueIds: string[];
  favoriteVenues: FavoriteVenue[];
};

type FavoriteVenuesContextValue = {
  error: string | null;
  favoriteVenueIds: string[];
  favoriteVenueIdsSet: Set<string>;
  favoriteVenues: FavoriteVenue[];
  favoriteVenuesCount: number;
  isFavoriteVenueId: (venueId: string) => boolean;
  isLoading: boolean;
  isReady: boolean;
  pendingVenueIds: Set<string>;
  reloadFavorites: () => Promise<void>;
  toggleFavoriteVenueId: (venueId: string) => Promise<void>;
};

const EMPTY_FAVORITES_STATE: FavoriteState = {
  favoriteVenueIds: [],
  favoriteVenues: [],
};

const FavoriteVenuesContext = createContext<FavoriteVenuesContextValue | null>(null);

function buildFavoriteState(favoriteVenues: FavoriteVenue[]): FavoriteState {
  const normalizedVenues = favoriteVenues.filter((venue) => Boolean(venue?.id));

  return {
    favoriteVenueIds: normalizedVenues.map((venue) => venue.id),
    favoriteVenues: normalizedVenues,
  };
}

function toggleFavoriteVenueInState(
  currentState: FavoriteState,
  venueId: string,
): FavoriteState {
  const isFavorite = currentState.favoriteVenueIds.includes(venueId);

  if (isFavorite) {
    return {
      favoriteVenueIds: currentState.favoriteVenueIds.filter((id) => id !== venueId),
      favoriteVenues: currentState.favoriteVenues.filter((venue) => venue.id !== venueId),
    };
  }

  return {
    favoriteVenueIds: [...currentState.favoriteVenueIds, venueId],
    favoriteVenues: currentState.favoriteVenues,
  };
}

function mergeFavoriteVenueIntoState(
  currentState: FavoriteState,
  favoriteVenue: FavoriteVenue,
): FavoriteState {
  if (!favoriteVenue?.id) {
    return currentState;
  }

  const favoriteVenueIds = currentState.favoriteVenueIds.includes(favoriteVenue.id)
    ? currentState.favoriteVenueIds
    : [...currentState.favoriteVenueIds, favoriteVenue.id];

  const favoriteVenues = currentState.favoriteVenues.some((venue) => venue.id === favoriteVenue.id)
    ? currentState.favoriteVenues.map((venue) =>
        venue.id === favoriteVenue.id ? favoriteVenue : venue,
      )
    : [...currentState.favoriteVenues, favoriteVenue];

  return {
    favoriteVenueIds,
    favoriteVenues,
  };
}

export function FavoriteVenuesProvider({ children }: PropsWithChildren) {
  const { user } = useAuth();
  const userId = user?.id ?? null;
  const [favoriteState, setFavoriteState] = useState<FavoriteState>(EMPTY_FAVORITES_STATE);
  const [isReady, setIsReady] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [pendingVenueIds, setPendingVenueIds] = useState<Set<string>>(new Set());
  const [error, setError] = useState<string | null>(null);

  const latestFavoriteStateRef = useRef<FavoriteState>(EMPTY_FAVORITES_STATE);
  const loadRequestIdRef = useRef(0);

  useEffect(() => {
    latestFavoriteStateRef.current = favoriteState;
  }, [favoriteState]);

  const applyFavoriteState = useCallback((nextState: FavoriteState) => {
    latestFavoriteStateRef.current = nextState;
    setFavoriteState(nextState);
  }, []);

  const reloadFavorites = useCallback(async () => {
    if (!userId) {
      applyFavoriteState(EMPTY_FAVORITES_STATE);
      setPendingVenueIds(new Set());
      setError(null);
      setIsLoading(false);
      setIsReady(true);
      return;
    }

    const requestId = ++loadRequestIdRef.current;
    setIsLoading(true);
    setError(null);

    try {
      let favorites = await fetchFavorites();

      if (requestId !== loadRequestIdRef.current) {
        return;
      }

      if (favorites.length === 0 && !(await hasCompletedFavoritesMigration(userId))) {
        const legacyFavoriteVenueIds = await getLegacyFavoriteVenueIds(userId);

        if (legacyFavoriteVenueIds.length > 0) {
          await Promise.all(legacyFavoriteVenueIds.map((venueId) => addFavorite(venueId)));
          favorites = await fetchFavorites();
          await clearLegacyFavoriteVenueIds(userId);
        }

        await markFavoritesMigrationCompleted(userId);
      }

      if (requestId !== loadRequestIdRef.current) {
        return;
      }

      applyFavoriteState(buildFavoriteState(favorites));
      setError(null);
    } catch (nextError) {
      if (requestId !== loadRequestIdRef.current) {
        return;
      }

      applyFavoriteState(EMPTY_FAVORITES_STATE);
      setError(
        nextError instanceof Error
          ? nextError.message
          : "Unable to load favorite locations.",
      );
      throw nextError;
    } finally {
      if (requestId === loadRequestIdRef.current) {
        setIsLoading(false);
        setIsReady(true);
      }
    }
  }, [applyFavoriteState, userId]);

  useEffect(() => {
    if (!userId) {
      loadRequestIdRef.current += 1;
      applyFavoriteState(EMPTY_FAVORITES_STATE);
      setPendingVenueIds(new Set());
      setError(null);
      setIsLoading(false);
      setIsReady(true);
      return;
    }

    setIsReady(false);
    void reloadFavorites().catch(() => {
      // Error state is handled inside reloadFavorites.
    });
  }, [applyFavoriteState, reloadFavorites, userId]);

  const favoriteVenueIdsSet = useMemo(
    () => new Set(favoriteState.favoriteVenueIds),
    [favoriteState.favoriteVenueIds],
  );

  const toggleFavoriteVenueId = useCallback(
    async (venueId: string) => {
      if (!userId || !venueId) {
        return;
      }

      let shouldStartRequest = false;

      setPendingVenueIds((current) => {
        if (current.has(venueId)) {
          return current;
        }

        shouldStartRequest = true;
        const next = new Set(current);
        next.add(venueId);
        return next;
      });

      if (!shouldStartRequest) {
        return;
      }

      const previousState = latestFavoriteStateRef.current;
      const nextState = toggleFavoriteVenueInState(previousState, venueId);
      const shouldRemove = previousState.favoriteVenueIds.includes(venueId);

      applyFavoriteState(nextState);
      setError(null);

      try {
        if (shouldRemove) {
          await removeFavorite(venueId);
        } else {
          const addedFavoriteVenue = await addFavorite(venueId);

          if (addedFavoriteVenue?.id) {
            applyFavoriteState(
              mergeFavoriteVenueIntoState(latestFavoriteStateRef.current, addedFavoriteVenue),
            );
          } else {
            const favorites = await fetchFavorites();
            applyFavoriteState(buildFavoriteState(favorites));
          }
        }
      } catch (nextError) {
        applyFavoriteState(previousState);
        const message =
          nextError instanceof Error
            ? nextError.message
            : "Unable to update favorites. Please try again.";
        setError(message);
        throw new Error(message);
      } finally {
        setPendingVenueIds((current) => {
          const next = new Set(current);
          next.delete(venueId);
          return next;
        });
      }
    },
    [applyFavoriteState, userId],
  );

  const isFavoriteVenueId = useCallback(
    (venueId: string) => favoriteVenueIdsSet.has(venueId),
    [favoriteVenueIdsSet],
  );

  const value = useMemo<FavoriteVenuesContextValue>(
    () => ({
      error,
      favoriteVenueIds: favoriteState.favoriteVenueIds,
      favoriteVenueIdsSet,
      favoriteVenues: favoriteState.favoriteVenues,
      favoriteVenuesCount: favoriteState.favoriteVenueIds.length,
      isFavoriteVenueId,
      isLoading,
      isReady,
      pendingVenueIds,
      reloadFavorites,
      toggleFavoriteVenueId,
    }),
    [
      error,
      favoriteState.favoriteVenueIds,
      favoriteState.favoriteVenues,
      favoriteVenueIdsSet,
      isFavoriteVenueId,
      isLoading,
      isReady,
      pendingVenueIds,
      reloadFavorites,
      toggleFavoriteVenueId,
    ],
  );

  return createElement(FavoriteVenuesContext.Provider, { value }, children);
}

export function useFavoriteVenues() {
  const context = useContext(FavoriteVenuesContext);

  if (!context) {
    throw new Error("useFavoriteVenues must be used within FavoriteVenuesProvider");
  }

  return context;
}

