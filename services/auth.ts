import { ApiClientError } from "@/services/api-errors";
import { get, patch, post } from "@/services/api-client";
import { translate } from "@/constants/i18n";
import {
  clearSession,
  getRefreshToken,
  updateSessionTokens,
  updateSessionUser,
  writeSession,
} from "@/services/auth-session";
import type {
  AuthUser,
  CurrentUserResponse,
  ForgotPasswordRequest,
  ForgotPasswordResponse,
  LoginRequest,
  LoginResponse,
  LogoutRequest,
  RefreshSessionRequest,
  RefreshSessionResponse,
  RegisterRequest,
  ResetPasswordRequest,
  ResetPasswordResponse,
  UpdateCurrentUserRequest,
} from "@/types/api";

function remapAuthError(error: unknown, fallbackMessage: string) {
  if (!(error instanceof ApiClientError)) {
    throw error;
  }

  if (error.status === 409) {
    throw new ApiClientError({
      kind: error.kind,
      message: translate("service.auth.accountExists"),
      payload: error.payload,
      status: error.status,
    });
  }

  if (error.status === 429) {
    throw new ApiClientError({
      kind: error.kind,
      message: translate("service.auth.tooManyAttempts"),
      payload: error.payload,
      status: error.status,
    });
  }

  if (error.status === 400 || error.status === 401 || error.status === 404) {
    throw new ApiClientError({
      kind: error.kind,
      message: fallbackMessage,
      payload: error.payload,
      status: error.status,
    });
  }

  throw error;
}

export async function login(params: LoginRequest) {
  try {
    const session = await post<LoginResponse>("/auth/login", {
      body: params,
      fallbackMessage: translate("service.auth.invalidCredentials"),
    });

    await writeSession(session);

    return session;
  } catch (error) {
    remapAuthError(error, translate("service.auth.invalidCredentials"));
    throw error;
  }
}

export async function forgotPassword(params: ForgotPasswordRequest) {
  try {
    return await post<ForgotPasswordResponse>("/auth/forgot-password", {
      body: params,
      fallbackMessage: translate("service.auth.forgotPassword"),
    });
  } catch (error) {
    remapAuthError(error, translate("service.auth.forgotPassword"));
    throw error;
  }
}

export async function resetPassword(params: ResetPasswordRequest) {
  try {
    return await post<ResetPasswordResponse>("/auth/reset-password", {
      body: params,
      fallbackMessage: translate("service.auth.resetPassword"),
    });
  } catch (error) {
    remapAuthError(error, translate("service.auth.resetPasswordInvalid"));
    throw error;
  }
}

export async function register(params: RegisterRequest) {
  try {
    return await post<AuthUser>("/auth/register", {
      body: params,
      fallbackMessage: translate("service.auth.register"),
    });
  } catch (error) {
    remapAuthError(error, translate("service.auth.register"));
    throw error;
  }
}

export async function refreshSession(refreshToken: string) {
  const response = await post<RefreshSessionResponse>("/auth/refresh", {
    body: {
      refreshToken,
    } satisfies RefreshSessionRequest,
    fallbackMessage: translate("service.auth.refreshSession"),
  });

  await updateSessionTokens(response);

  return response;
}

export async function logout(refreshToken?: string | null) {
  const effectiveRefreshToken = refreshToken ?? (await getRefreshToken());

  try {
    if (effectiveRefreshToken) {
      await post<{ message?: string }>("/auth/logout", {
        body: {
          refreshToken: effectiveRefreshToken,
        } satisfies LogoutRequest,
        fallbackMessage: translate("service.auth.logoutServer"),
      });
    }
  } finally {
    await clearSession();
  }
}

export async function fetchCurrentUser() {
  const user = await get<CurrentUserResponse>("/me", {
    auth: true,
    fallbackMessage: translate("service.auth.loadProfile"),
  });

  await updateSessionUser(user);

  return user;
}

export async function updateCurrentUser(body: UpdateCurrentUserRequest) {
  const user = await patch<CurrentUserResponse>("/me", {
    auth: true,
    body,
    fallbackMessage: translate("service.auth.updateProfile"),
  });

  await updateSessionUser(user);

  return user;
}
