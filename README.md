# Coworkings App

A mobile app for booking workspaces and rooms in coworking spaces, built with Expo, React Native, and Expo Router.

## Quick Start: Run and Test with Expo Go

### Prerequisites

- Node.js 18+
- npm
- `Expo Go` installed on an Android phone or iPhone
- a running backend API reachable from your device over the network

### 1. Install dependencies

```bash
npm install
```

### 2. Set the backend API URL

The app reads the base URL from `EXPO_PUBLIC_API_BASE_URL`.

PowerShell:

```powershell
$env:EXPO_PUBLIC_API_BASE_URL="http://192.168.x.x:8000"
```

Examples:

- Android Emulator: `http://10.0.2.2:8000`
- iOS Simulator / web: `http://localhost:8000`
- physical device with Expo Go: `http://<your-computer-LAN-IP>:8000`

Important: your phone running Expo Go and your computer running the backend must be on the same network.

### 3. Start Expo

```bash
npm run start
```

### 4. Open the app in Expo Go

- Open `Expo Go` on your phone.
- Scan the QR code from the terminal or Expo DevTools.
- If the app does not open over `LAN`, keep the same backend URL but verify that your phone can reach it in a browser.

### 5. Basic smoke test after launch

1. Register or sign in.
2. Open the coworking list on the `Book` tab.
3. Add a venue to favorites and verify that the counter on the `Profile` tab updates immediately.
4. Open a venue, then a room, and create a booking.
5. Check the booking details and the `Active` / `Past` tabs.
6. Run the `Forgot password` -> `Reset password` flow with a real reset token from the backend.

## About the Project

The app covers the main user flows of a coworking booking platform:

- sign up, sign in, sign out, forgot password, and reset password
- browsing venues and venue details
- browsing rooms, seats, booking rules, opening hours, and tariffs
- checking availability and creating bookings
- viewing booking details, cancelling, rescheduling, and repeating bookings
- check-in and a basic payment flow (`create`, `capture`, `refund`)
- favorites
- user profile and notification preferences
- notifications inbox
- theme and language switching

## Current Functionality

### User-facing features

- `login`, `register`, `forgot password`, `reset password`, `logout`
- automatic session restore and token refresh
- venue list with backend-powered filters
- venue, room, and seat screens
- availability loading, hold creation, and booking creation
- booking details screen
- booking cancellation, rescheduling, repetition, and check-in
- payment flow with `capture` and `refund`
- booking tabs: `active` and `past`
- the `past` tab now shows all past bookings returned by backend history
- favorites with shared client state across screens
- profile, profile editing, and notification preferences
- notifications inbox
- legal screens (`privacy policy`, `terms of service`)

### Recent updates

- `reset-password` now sends the payload expected by the backend: `{ token, newPassword }`
- the `forgot-password` flow no longer exposes dev/debug backend token behavior in the UI
- the favorites counter on the profile screen now updates immediately after add/remove actions
- `Past` and `History` booking tabs were merged into a single `Past` tab
- a crash in `PaymentSection` related to locale helpers was fixed

## Tech Stack

- Expo 54
- React 19
- React Native 0.81
- Expo Router 6
- TypeScript
- expo-secure-store
- expo-notifications
- react-native-safe-area-context
- react-native-reanimated
- lucide-react-native

## Project Structure

```text
app/                App routes and screens
  (auth)/           Authentication screens
  (tabs)/           Main tab screens
  booking/          Booking details screen
  room/             Room screen
  venue/            Venue screen
components/         Reusable UI components
constants/          Theme, i18n, API config
hooks/              Custom React hooks
mock/               Local mock API and demo data
providers/          Global state providers
services/           API access layer
types/              API and domain types
docs/               Swagger, handoff docs, and checklists
```

## Scripts

```bash
npm run start
npm run android
npm run ios
npm run web
npm run lint
npm run mock:auth
npm run reset-project
```

## API Configuration

The base URL is resolved in [constants/api.ts](./constants/api.ts).

Priority order:

1. `EXPO_PUBLIC_API_BASE_URL`
2. auto-detected Expo host
3. platform-specific fallback

For stable local development, explicitly setting `EXPO_PUBLIC_API_BASE_URL` is recommended.

## Local Mock API

The project includes a local mock server: [mock/server.mjs](./mock/server.mjs).

Run it with:

```bash
npm run mock:auth
```

By default it starts on `http://localhost:3001`.

If you want the app to use the mock API:

```powershell
$env:EXPO_PUBLIC_API_BASE_URL="http://localhost:3001"
npm run start
```

For Android Emulator, replace `localhost` with `10.0.2.2`.

## Main Routes

### Auth

- `/(auth)/login`
- `/(auth)/register`
- `/(auth)/forgot-password`
- `/(auth)/reset-password`

### Tabs

- `/(tabs)/book`
- `/(tabs)/bookings`
- `/(tabs)/profile`

### Additional screens

- `/venue/[id]`
- `/room/[id]`
- `/booking/[id]`
- `/favorites`
- `/notifications`
- `/profile-edit`
- `/privacy-policy`
- `/terms-of-service`

## Backend Endpoints Used

### Auth and profile

- `POST /auth/login`
- `POST /auth/register`
- `POST /auth/forgot-password`
- `POST /auth/reset-password`
- `POST /auth/refresh`
- `POST /auth/logout`
- `GET /me`
- `PATCH /me`

### Venues and rooms

- `GET /venues`
- `GET /venues/{venueId}`
- `GET /venues/{venueId}/rooms`
- `GET /rooms/{roomId}`
- `GET /rooms/{roomId}/seats`
- `GET /features`
- `GET /room-hours/{roomId}`
- `GET /tariffs`
- `GET /booking-rules/{scope}`

### Bookings

- `GET /availability`
- `POST /holds`
- `DELETE /holds/{holdId}`
- `POST /bookings`
- `GET /bookings/{bookingId}`
- `DELETE /bookings/{bookingId}`
- `PATCH /bookings/{bookingId}/reschedule`
- `POST /bookings/{bookingId}/repeat`
- `POST /bookings/{bookingId}/checkin`
- `GET /me/bookings`
- `GET /bookings/history`

### Payments

- `POST /payments`
- `GET /payments/{paymentId}`
- `POST /payments/{paymentId}/capture`
- `POST /payments/{paymentId}/refund`

### Notifications

- `GET /notifications/preferences`
- `PUT /notifications/preferences`
- `GET /notifications`
- `POST /devices/push-tokens`
- `DELETE /devices/push-tokens/{deviceId}`

### Favorites

- `GET /favorites`
- `POST /favorites`
- `DELETE /favorites/{venueId}`

## Local Data Storage

- session data is stored in `expo-secure-store` on iOS/Android and in `localStorage` on web
- theme and language preferences are stored locally
- favorites include a migration path from legacy local storage into the backend API

## Validation and Debugging

### Lint

```bash
npm run lint
```

### If the app does not work locally, check these first

1. Whether the backend is reachable at `EXPO_PUBLIC_API_BASE_URL`.
2. Whether the phone and computer are on the same network.
3. Whether the Expo dev server is running.
4. Whether the backend returns valid `accessToken` / `refreshToken`.
5. Whether Expo Go or the local API is blocked by network restrictions.

## Related Files

- [app/\_layout.tsx](./app/_layout.tsx)
- [providers/auth-provider.tsx](./providers/auth-provider.tsx)
- [providers/language-provider.tsx](./providers/language-provider.tsx)
- [hooks/use-favorite-venues.ts](./hooks/use-favorite-venues.ts)
- [services/api-client.ts](./services/api-client.ts)
- [services/auth.ts](./services/auth.ts)
- [services/bookings.ts](./services/bookings.ts)
- [services/venues.ts](./services/venues.ts)
- [services/notifications.ts](./services/notifications.ts)
- [constants/api.ts](./constants/api.ts)
- [constants/i18n.ts](./constants/i18n.ts)
