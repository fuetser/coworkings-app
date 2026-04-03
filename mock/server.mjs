import { randomUUID } from "node:crypto";
import { App } from "@tinyhttp/app";
import { createApp } from "json-server/lib/app.js";
import { NormalizedAdapter } from "json-server/lib/adapters/normalized-adapter.js";
import { Observer } from "json-server/lib/adapters/observer.js";
import { Low } from "lowdb";
import { JSONFile } from "lowdb/node";
import { json } from "milliparsec";

const PORT = Number.parseInt(process.env.MOCK_API_PORT ?? "3001", 10);
const HOST = process.env.MOCK_API_HOST ?? "0.0.0.0";
const DB_FILE = new URL("./db.json", import.meta.url);
const MAX_FAILED_ATTEMPTS = 5;
const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function buildError(code, message, details) {
  return {
    code,
    message,
    ...(details ? { details } : {}),
  };
}

function toPublicUser(user) {
  return {
    id: user.id,
    email: user.email,
    name: user.name,
  };
}

function createToken(type, user) {
  return `${type}-${user.id}-${randomUUID()}`;
}

function normalizeEmail(email) {
  return email.trim().toLowerCase();
}

function normalizeText(value) {
  return typeof value === "string" ? value.trim().toLowerCase() : "";
}

function toStringArray(value) {
  if (Array.isArray(value)) {
    return value.flatMap((entry) => toStringArray(entry));
  }

  if (typeof value !== "string") {
    return [];
  }

  return value
    .split(",")
    .map((entry) => entry.trim())
    .filter(Boolean);
}

function getVenueListItem(venue) {
  return {
    id: venue.id,
    name: venue.name,
    address: venue.address,
    features: venue.features,
    availableWorkplaces: venue.availableWorkplaces,
  };
}

function validateLoginPayload(payload) {
  const details = {};

  if (typeof payload?.email !== "string" || !payload.email.trim()) {
    details.email = "email is required";
  } else if (!emailPattern.test(payload.email.trim())) {
    details.email = "email must be a valid email";
  }

  if (typeof payload?.password !== "string" || !payload.password) {
    details.password = "password is required";
  } else if (payload.password.length < 6) {
    details.password = "password must be at least 6 characters";
  }

  return details;
}

function validateRegisterPayload(payload) {
  const details = validateLoginPayload(payload);

  if (typeof payload?.name !== "string" || !payload.name.trim()) {
    details.name = "name is required";
  }

  if (
    payload?.phone !== undefined &&
    (typeof payload.phone !== "string" || !payload.phone.trim())
  ) {
    details.phone = "phone must be a non-empty string";
  }

  return details;
}

function validateForgotPasswordPayload(payload) {
  const details = {};

  if (typeof payload?.email !== "string" || !payload.email.trim()) {
    details.email = "email is required";
  } else if (!emailPattern.test(payload.email.trim())) {
    details.email = "email must be a valid email";
  }

  return details;
}

function validateResetPasswordPayload(payload) {
  const details = {};

  if (typeof payload?.resetToken !== "string" || !payload.resetToken.trim()) {
    details.resetToken = "resetToken is required";
  }

  if (typeof payload?.password !== "string" || !payload.password) {
    details.password = "password is required";
  } else if (payload.password.length < 6) {
    details.password = "password must be at least 6 characters";
  }

  return details;
}

function respondWithValidationError(res, details, required) {
  res.status(400).json(
    buildError("bad_request", "invalid request payload", {
      fields: details,
      required,
    }),
  );
}

const adapter = new JSONFile(DB_FILE);
const observer = new Observer(new NormalizedAdapter(adapter));
const db = new Low(observer, {
  users: [],
  loginAttempts: [],
  venues: [],
  sessions: [],
  passwordResetTokens: [],
});

await db.read();
db.data ||= {
  users: [],
  loginAttempts: [],
  venues: [],
  sessions: [],
  passwordResetTokens: [],
};
db.data.users ||= [];
db.data.loginAttempts ||= [];
db.data.venues ||= [];
db.data.sessions ||= [];
db.data.passwordResetTokens ||= [];
const FEATURE_LABELS = {
  wifi: "Wi-Fi",
  coffee: "Coffee",
  "meeting-room": "Meeting Room",
  "phone-booth": "Phone Booth",
  parking: "Parking",
  "event-space": "Event Space",
  "standing-desks": "Standing Desks",
  shower: "Shower",
  tv: "TV",
  whiteboard: "Whiteboard",
  "video-call": "Video Call Ready",
  "acoustic-panels": "Acoustic Panels",
  projector: "Projector",
  "speaker-system": "Speaker System",
  monitor: "Monitor",
};

function humanizeFeature(feature) {
  return feature
    .split(/[-_]/g)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function findRoomRecord(roomId) {
  for (const venue of db.data.venues) {
    const room = venue.rooms.find((entry) => entry.id === roomId);
    if (room) {
      return { venue, room };
    }
  }

  return null;
}

function buildSeatLabelPrefix(room) {
  const letters = room.name
    .split(/\s+/)
    .map((part) => part.charAt(0).toUpperCase())
    .filter(Boolean)
    .join("");

  return (letters || room.id.slice(0, 2).toUpperCase()).slice(0, 2);
}

function buildRoomSeats(room) {
  const seatCount = room.allowFullRoomBooking ? 6 : 4;
  const prefix = buildSeatLabelPrefix(room);

  return Array.from({ length: seatCount }, (_, index) => {
    const position = index + 1;
    return {
      id: `${room.id}-seat-${position}`,
      label: `${prefix}-${position}`,
      gridX: (index % 3) + 1,
      gridY: Math.floor(index / 3) + 1,
      seatType: room.allowFullRoomBooking ? "Dedicated Desk" : "Focus Seat",
      attributes: {
        monitor: room.features.includes("monitor") || position % 2 === 0,
        window: position % 3 === 0,
      },
      active: position !== seatCount,
    };
  });
}

function buildRoomDescription(room, venue) {
  return `${room.name} in ${venue.name} with ${room.features.length} configured features and ${room.allowFullRoomBooking ? "full-room booking" : "seat-by-seat access"}.`;
}

function buildRoomDetails(roomId) {
  const record = findRoomRecord(roomId);

  if (!record) {
    return null;
  }

  const { room, venue } = record;
  const seats = buildRoomSeats(room);

  return {
    ...room,
    description: buildRoomDescription(room, venue),
    capacity: seats.length,
    venueId: venue.id,
    venueName: venue.name,
    timezone: venue.timezone,
    seats,
  };
}

function buildFeatureCatalog() {
  const slugs = new Set();

  for (const venue of db.data.venues) {
    for (const feature of venue.features) {
      slugs.add(feature);
    }

    for (const room of venue.rooms) {
      for (const feature of room.features) {
        slugs.add(feature);
      }
    }
  }

  return Array.from(slugs)
    .sort()
    .map((slug) => ({
      id: slug,
      slug,
      name: FEATURE_LABELS[slug] ?? humanizeFeature(slug),
      category: "space",
    }));
}

function buildRoomHours(roomId) {
  const record = findRoomRecord(roomId);

  if (!record) {
    return null;
  }

  return {
    roomId,
    timezone: record.venue.timezone,
    schedule: [1, 2, 3, 4, 5, 6, 7].map((weekday) => ({
      weekday,
      dayLabel: ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"][weekday - 1],
      opensAt: weekday >= 6 ? "10:00" : "09:00",
      closesAt: weekday >= 6 ? "20:00" : "21:00",
      closed: false,
    })),
  };
}

function buildTariffsForRoom(room, venue) {
  const tariffs = [
    {
      id: `${room.id}-seat-hourly`,
      name: `${room.name} Seat Pass`,
      description: `Hourly seat booking for ${room.name}.`,
      priceAmountCents: room.allowFullRoomBooking ? 45000 : 30000,
      currency: "RUB",
      durationMinutes: 60,
      scope: "room",
      scopeId: room.id,
      active: true,
    },
  ];

  if (room.allowFullRoomBooking) {
    tariffs.push({
      id: `${room.id}-full-room`,
      name: `${room.name} Full Room`,
      description: `Private booking for the entire room at ${venue.name}.`,
      priceAmountCents: 180000,
      currency: "RUB",
      durationMinutes: 120,
      scope: "room",
      scopeId: room.id,
      active: true,
    });
  }

  tariffs.push({
    id: `${venue.id}-day-pass`,
    name: `${venue.name} Day Pass`,
    description: `Flexible daily access within ${venue.name}.`,
    priceAmountCents: 120000,
    currency: "RUB",
    durationMinutes: 480,
    scope: "venue",
    scopeId: venue.id,
    active: true,
  });

  return tariffs;
}

function buildRoomRules(record) {
  return {
    scope: "room",
    scopeId: record.room.id,
    minDurationMinutes: record.room.allowFullRoomBooking ? 60 : 30,
    maxDurationMinutes: record.room.allowFullRoomBooking ? 180 : 240,
    holdTtlSeconds: 900,
    paymentRequired: false,
    advanceBookingDays: 14,
    cancellationWindowMinutes: 30,
  };
}

function buildVenueRules(venue) {
  return {
    scope: "venue",
    scopeId: venue.id,
    minDurationMinutes: 30,
    maxDurationMinutes: 480,
    holdTtlSeconds: 900,
    paymentRequired: false,
    advanceBookingDays: 14,
    cancellationWindowMinutes: 30,
  };
}

function issueSession(user) {
  const accessToken = createToken("access", user);
  const refreshToken = createToken("refresh", user);

  db.data.sessions.push({
    id: randomUUID(),
    userId: user.id,
    refreshToken,
    createdAt: new Date().toISOString(),
  });

  return {
    accessToken,
    refreshToken,
    user: toPublicUser(user),
  };
}

function revokeUserSessions(userId) {
  db.data.sessions = db.data.sessions.filter((session) => session.userId !== userId);
}

function clearUserResetTokens(userId) {
  db.data.passwordResetTokens = db.data.passwordResetTokens.filter(
    (entry) => entry.userId !== userId,
  );
}

const jsonServerApp = createApp(db, { logger: false });
const app = new App();

app.use(json());

app.post("/auth/register", async (req, res) => {
  const validationErrors = validateRegisterPayload(req.body ?? {});

  if (Object.keys(validationErrors).length > 0) {
    respondWithValidationError(res, validationErrors, ["email", "password", "name"]);
    return;
  }

  const normalizedEmail = normalizeEmail(req.body.email);
  const existingUser = db.data.users.find(
    (entry) => entry.email.toLowerCase() === normalizedEmail,
  );

  if (existingUser) {
    res.status(409).json(
      buildError("conflict", "user with this email already exists", {
        email: normalizedEmail,
      }),
    );
    return;
  }

  const user = {
    id: randomUUID(),
    email: normalizedEmail,
    password: req.body.password,
    name: req.body.name.trim(),
    ...(typeof req.body.phone === "string" && req.body.phone.trim()
      ? { phone: req.body.phone.trim() }
      : {}),
  };

  db.data.users.push(user);
  await db.write();

  res.status(201).json(toPublicUser(user));
});

app.post("/auth/login", async (req, res) => {
  const validationErrors = validateLoginPayload(req.body ?? {});

  if (Object.keys(validationErrors).length > 0) {
    respondWithValidationError(res, validationErrors, ["email", "password"]);
    return;
  }

  const normalizedEmail = normalizeEmail(req.body.email);
  const attempts = db.data.loginAttempts.filter(
    (attempt) => attempt.email === normalizedEmail,
  );

  if (attempts.length >= MAX_FAILED_ATTEMPTS) {
    res.status(429).json(
      buildError("too_many_requests", "too many failed login attempts", {
        email: normalizedEmail,
        maxFailedAttempts: MAX_FAILED_ATTEMPTS,
      }),
    );
    return;
  }

  const user = db.data.users.find(
    (entry) => entry.email.toLowerCase() === normalizedEmail,
  );

  if (!user || user.password !== req.body.password) {
    db.data.loginAttempts.push({
      id: randomUUID(),
      email: normalizedEmail,
      createdAt: new Date().toISOString(),
    });
    await db.write();
    res
      .status(401)
      .json(buildError("unauthorized", "invalid email or password"));
    return;
  }

  db.data.loginAttempts = db.data.loginAttempts.filter(
    (attempt) => attempt.email !== normalizedEmail,
  );

  const session = issueSession(user);
  await db.write();

  res.json(session);
});

app.post("/auth/forgot-password", async (req, res) => {
  const validationErrors = validateForgotPasswordPayload(req.body ?? {});

  if (Object.keys(validationErrors).length > 0) {
    respondWithValidationError(res, validationErrors, ["email"]);
    return;
  }

  const normalizedEmail = normalizeEmail(req.body.email);
  const user = db.data.users.find(
    (entry) => entry.email.toLowerCase() === normalizedEmail,
  );

  const response = {
    message: "If that email exists, password reset instructions have been generated.",
  };

  if (!user) {
    res.json(response);
    return;
  }

  clearUserResetTokens(user.id);

  const resetToken = createToken("reset", user);
  db.data.passwordResetTokens.push({
    id: randomUUID(),
    userId: user.id,
    token: resetToken,
    createdAt: new Date().toISOString(),
  });
  await db.write();

  res.json({
    ...response,
    resetToken,
  });
});

app.post("/auth/reset-password", async (req, res) => {
  const validationErrors = validateResetPasswordPayload(req.body ?? {});

  if (Object.keys(validationErrors).length > 0) {
    respondWithValidationError(res, validationErrors, ["resetToken", "password"]);
    return;
  }

  const resetToken = req.body.resetToken.trim();
  const tokenRecord = db.data.passwordResetTokens.find(
    (entry) => entry.token === resetToken,
  );

  if (!tokenRecord) {
    res.status(401).json(buildError("unauthorized", "invalid or expired reset token"));
    return;
  }

  const user = db.data.users.find((entry) => entry.id === tokenRecord.userId);

  if (!user) {
    clearUserResetTokens(tokenRecord.userId);
    await db.write();
    res.status(401).json(buildError("unauthorized", "invalid or expired reset token"));
    return;
  }

  user.password = req.body.password;
  revokeUserSessions(user.id);
  clearUserResetTokens(user.id);
  await db.write();

  res.json({
    message: "Password has been reset successfully.",
  });
});

app.post("/auth/refresh", async (req, res) => {
  const refreshToken = req.body?.refreshToken;

  if (typeof refreshToken !== "string" || !refreshToken.trim()) {
    respondWithValidationError(res, { refreshToken: "refreshToken is required" }, [
      "refreshToken",
    ]);
    return;
  }

  const sessionIndex = db.data.sessions.findIndex(
    (entry) => entry.refreshToken === refreshToken.trim(),
  );

  if (sessionIndex < 0) {
    res.status(401).json(buildError("unauthorized", "invalid refresh token"));
    return;
  }

  const session = db.data.sessions[sessionIndex];
  const user = db.data.users.find((entry) => entry.id === session.userId);

  if (!user) {
    db.data.sessions.splice(sessionIndex, 1);
    await db.write();
    res.status(401).json(buildError("unauthorized", "invalid refresh token"));
    return;
  }

  const nextRefreshToken = createToken("refresh", user);
  db.data.sessions[sessionIndex] = {
    ...session,
    refreshToken: nextRefreshToken,
    createdAt: new Date().toISOString(),
  };
  await db.write();

  res.json({
    accessToken: createToken("access", user),
    refreshToken: nextRefreshToken,
  });
});

app.post("/auth/logout", async (req, res) => {
  const refreshToken = req.body?.refreshToken;

  if (typeof refreshToken !== "string" || !refreshToken.trim()) {
    respondWithValidationError(res, { refreshToken: "refreshToken is required" }, [
      "refreshToken",
    ]);
    return;
  }

  db.data.sessions = db.data.sessions.filter(
    (entry) => entry.refreshToken !== refreshToken.trim(),
  );
  await db.write();

  res.json({
    message: "Logged out successfully.",
  });
});

app.get("/venues", (req, res) => {
  const query = normalizeText(req.query?.q);
  const location = normalizeText(req.query?.location);
  const capacityValue = String(req.query?.capacity ?? "");
  const capacity = Number.parseInt(capacityValue, 10);
  const requiredFeatures = toStringArray(req.query?.features).map((feature) =>
    feature.toLowerCase(),
  );

  const venues = db.data.venues.filter((venue) => {
    const matchesQuery =
      !query ||
      venue.name.toLowerCase().includes(query) ||
      venue.address.toLowerCase().includes(query);

    const matchesLocation =
      !location || venue.address.toLowerCase().includes(location);

    const matchesCapacity =
      capacityValue.length === 0 ||
      (!Number.isNaN(capacity) && venue.availableWorkplaces >= capacity);

    const venueFeatures = venue.features.map((feature) => feature.toLowerCase());
    const matchesFeatures = requiredFeatures.every((feature) =>
      venueFeatures.includes(feature),
    );

    return matchesQuery && matchesLocation && matchesCapacity && matchesFeatures;
  });

  res.json(venues.map(getVenueListItem));
});

app.get("/venues/:venueId", (req, res) => {
  const venue = db.data.venues.find((entry) => entry.id === req.params.venueId);

  if (!venue) {
    res.status(404).json(buildError("not_found", "venue not found"));
    return;
  }

  res.json({
    id: venue.id,
    name: venue.name,
    address: venue.address,
    timezone: venue.timezone,
    location: venue.location,
    features: venue.features,
    rooms: venue.rooms,
  });
});

app.get("/venues/:venueId/rooms", (req, res) => {
  const venue = db.data.venues.find((entry) => entry.id === req.params.venueId);

  if (!venue) {
    res.status(404).json(buildError("not_found", "venue not found"));
    return;
  }

  res.json(venue.rooms);
});`r`n`r`napp.get("/rooms/:roomId", (req, res) => {
  const room = buildRoomDetails(req.params.roomId);

  if (!room) {
    res.status(404).json(buildError("not_found", "room not found"));
    return;
  }

  res.json(room);
});

app.get("/rooms/:roomId/seats", (req, res) => {
  const room = buildRoomDetails(req.params.roomId);

  if (!room) {
    res.status(404).json(buildError("not_found", "room not found"));
    return;
  }

  res.json(room.seats);
});

app.get("/features", (_req, res) => {
  res.json(buildFeatureCatalog());
});

app.get("/room-hours/:roomId", (req, res) => {
  const roomHours = buildRoomHours(req.params.roomId);

  if (!roomHours) {
    res.status(404).json(buildError("not_found", "room not found"));
    return;
  }

  res.json(roomHours);
});

app.get("/tariffs", (req, res) => {
  const roomId = toStringArray(req.query?.roomId)[0];
  const venueId = toStringArray(req.query?.venueId)[0];
  const tariffs = db.data.venues.flatMap((venue) =>
    venue.rooms.flatMap((room) => buildTariffsForRoom(room, venue)),
  );

  const filteredTariffs = tariffs.filter((tariff) => {
    if (roomId) {
      return tariff.scopeId === roomId || tariff.scopeId === venueId;
    }

    if (venueId) {
      return tariff.scopeId === venueId;
    }

    return true;
  });

  res.json(filteredTariffs);
});

app.get("/booking-rules/:scope", (req, res) => {
  const scope = String(req.params.scope ?? "");
  const scopeId =
    toStringArray(req.query?.scopeId)[0] ??
    toStringArray(req.query?.roomId)[0] ??
    toStringArray(req.query?.venueId)[0];

  if (scope === "room") {
    const record = scopeId ? findRoomRecord(scopeId) : null;

    if (!record) {
      res.status(404).json(buildError("not_found", "room rules not found"));
      return;
    }

    res.json(buildRoomRules(record));
    return;
  }

  if (scope === "venue") {
    const venue = scopeId
      ? db.data.venues.find((entry) => entry.id === scopeId)
      : db.data.venues[0];

    if (!venue) {
      res.status(404).json(buildError("not_found", "venue rules not found"));
      return;
    }

    res.json(buildVenueRules(venue));
    return;
  }

  if (scope === "global") {
    res.json({
      scope: "global",
      minDurationMinutes: 30,
      maxDurationMinutes: 480,
      holdTtlSeconds: 900,
      paymentRequired: false,
      advanceBookingDays: 14,
      cancellationWindowMinutes: 30,
    });
    return;
  }

  res.status(404).json(buildError("not_found", "booking rules scope not found"));
});

app.use(jsonServerApp);

app.listen(PORT, HOST, () => {
  console.log(`Mock API listening on http://${HOST}:${PORT}`);
  console.log("POST /auth/register");
  console.log("POST /auth/login");
  console.log("POST /auth/forgot-password");
  console.log("POST /auth/reset-password");
  console.log("POST /auth/refresh");
  console.log("POST /auth/logout");
  console.log("GET /venues");
  console.log("GET /venues/:venueId");
  console.log("GET /venues/:venueId/rooms");
  console.log("GET /rooms/:roomId");
  console.log("GET /rooms/:roomId/seats");
  console.log("GET /features");
  console.log("GET /room-hours/:roomId");
  console.log("GET /tariffs");
  console.log("GET /booking-rules/:scope");
});




