import { PropsWithChildren, createContext, useContext, useEffect, useState } from "react";

import {
  fetchCurrentUser,
  login as loginUser,
  logout as logoutUser,
  updateCurrentUser,
} from "@/services/auth";
import { readSession, subscribeToSession } from "@/services/auth-session";
import { ApiClientError } from "@/services/api-errors";
import { unregisterCurrentDeviceFromPush } from "@/services/push-registration";
import type {
  AuthSession,
  AuthUser,
  LoginRequest,
  UpdateCurrentUserRequest,
} from "@/types/api";

type AuthStatus = "loading" | "authenticated" | "unauthenticated";

type AuthContextValue = {
  login: (params: LoginRequest) => Promise<void>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
  status: AuthStatus;
  updateProfile: (params: UpdateCurrentUserRequest) => Promise<void>;
  user: AuthUser | null;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: PropsWithChildren) {
  const [status, setStatus] = useState<AuthStatus>("loading");
  const [user, setUser] = useState<AuthUser | null>(null);

  useEffect(() => {
    let isMounted = true;

    const applyUser = (nextUser: AuthUser | null) => {
      if (!isMounted) {
        return;
      }

      setUser(nextUser);
    };

    const bootstrapSession = async () => {
      const session = await readSession();

      if (!isMounted) {
        return;
      }

      if (!session) {
        setUser(null);
        setStatus("unauthenticated");
        return;
      }

      try {
        const currentUser = await fetchCurrentUser();

        if (!isMounted) {
          return;
        }

        setUser(currentUser);
        setStatus("authenticated");
      } catch (error) {
        if (!isMounted) {
          return;
        }

        if (error instanceof ApiClientError && error.status === 401) {
          setUser(null);
          setStatus("unauthenticated");
          return;
        }

        setUser(session.user);
        setStatus("authenticated");
      }
    };

    void bootstrapSession();

    const unsubscribe = subscribeToSession((session: AuthSession | null) => {
      if (!isMounted) {
        return;
      }

      applyUser(session?.user ?? null);

      if (!session) {
        setStatus("unauthenticated");
      }
    });

    return () => {
      isMounted = false;
      unsubscribe();
    };
  }, []);

  const refreshUser = async () => {
    const currentUser = await fetchCurrentUser();
    setUser(currentUser);
    setStatus("authenticated");
  };

  const login = async (params: LoginRequest) => {
    const session = await loginUser(params);
    setUser(session.user);
    setStatus("authenticated");
    await refreshUser();
  };

  const updateProfile = async (params: UpdateCurrentUserRequest) => {
    const nextUser = await updateCurrentUser(params);
    setUser(nextUser);
    setStatus("authenticated");
  };

  const logout = async () => {
    try {
      await unregisterCurrentDeviceFromPush();
    } catch {
      // Continue logout even if push cleanup fails.
    }

    await logoutUser();
    setUser(null);
    setStatus("unauthenticated");
  };

  return (
    <AuthContext.Provider
      value={{
        login,
        logout,
        refreshUser,
        status,
        updateProfile,
        user,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error("useAuth must be used within AuthProvider");
  }

  return context;
}
