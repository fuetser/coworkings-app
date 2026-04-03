export type ApiErrorKind =
  | "network_error"
  | "timeout_error"
  | "unauthorized"
  | "forbidden"
  | "validation_error"
  | "conflict"
  | "unknown_api_error";

type ApiValidationError = {
  field?: unknown;
  message?: unknown;
};

type ApiErrorResponse = {
  detail?: unknown;
  message?: unknown;
  errors?: unknown;
};

function formatValidationErrors(errors: unknown) {
  if (!Array.isArray(errors)) {
    return null;
  }

  const messages = errors
    .map((error) => {
      if (!error || typeof error !== "object") {
        return null;
      }

      const { field, message } = error as ApiValidationError;
      if (typeof message !== "string" || !message.trim()) {
        return null;
      }

      if (typeof field === "string" && field.trim()) {
        return `${field}: ${message}`;
      }

      return message;
    })
    .filter((message): message is string => Boolean(message));

  return messages.length > 0 ? messages.join("\n") : null;
}

function formatDetailList(detail: unknown) {
  if (!Array.isArray(detail)) {
    return null;
  }

  const messages = detail
    .map((item) => {
      if (typeof item === "string" && item.trim()) {
        return item;
      }

      if (!item || typeof item !== "object") {
        return null;
      }

      const candidate = item as ApiValidationError;
      if (typeof candidate.message === "string" && candidate.message.trim()) {
        if (typeof candidate.field === "string" && candidate.field.trim()) {
          return `${candidate.field}: ${candidate.message}`;
        }

        return candidate.message;
      }

      return null;
    })
    .filter((message): message is string => Boolean(message));

  return messages.length > 0 ? messages.join("\n") : null;
}

function isValidationPayload(payload: unknown) {
  if (!payload || typeof payload !== "object") {
    return false;
  }

  const candidate = payload as ApiErrorResponse;

  return Array.isArray(candidate.errors) || Array.isArray(candidate.detail);
}

export function getApiErrorMessage(payload: unknown, fallbackMessage: string) {
  if (typeof payload === "string" && payload.trim()) {
    return payload;
  }

  if (!payload || typeof payload !== "object") {
    return fallbackMessage;
  }

  const candidate = payload as ApiErrorResponse;

  if (typeof candidate.detail === "string" && candidate.detail.trim()) {
    return candidate.detail;
  }

  if (typeof candidate.message === "string" && candidate.message.trim()) {
    return candidate.message;
  }

  const validationMessage =
    formatValidationErrors(candidate.errors) ?? formatDetailList(candidate.detail);

  return validationMessage ?? fallbackMessage;
}

function getErrorKind(status: number, payload: unknown): ApiErrorKind {
  if (status === 401) {
    return "unauthorized";
  }

  if (status === 403) {
    return "forbidden";
  }

  if ((status === 400 || status === 422) && isValidationPayload(payload)) {
    return "validation_error";
  }

  if (status === 409) {
    return "conflict";
  }

  return "unknown_api_error";
}

export class ApiClientError extends Error {
  kind: ApiErrorKind;
  status?: number;
  payload?: unknown;

  constructor({
    kind,
    message,
    payload,
    status,
  }: {
    kind: ApiErrorKind;
    message: string;
    payload?: unknown;
    status?: number;
  }) {
    super(message);
    this.name = "ApiClientError";
    this.kind = kind;
    this.status = status;
    this.payload = payload;
  }
}

export function createApiError(params: {
  status: number;
  payload?: unknown;
  fallbackMessage: string;
}) {
  const { fallbackMessage, payload, status } = params;

  return new ApiClientError({
    kind: getErrorKind(status, payload),
    message: getApiErrorMessage(payload, fallbackMessage),
    payload,
    status,
  });
}
