# Mobile App

Expo / React Native client for the Pulse workspace. This package runs outside Docker for best dev-cycle speed, while the API/services can stay inside `docker compose`.

## Requirements

- Node.js 20+
- Xcode (for iOS) or Android Studio (for Android)
- Expo CLI (installed automatically through `npx`)

## Environment Variables

Create a `.env` (or `.env.local`) next to `package.json` with the public values expected by Expo. These are baked into the bundle at build time, so restart Expo after editing them.

```
EXPO_PUBLIC_SUPABASE_URL=<your-supabase-url>
EXPO_PUBLIC_SUPABASE_ANON_KEY=<your-supabase-anon-key>
EXPO_PUBLIC_API_BASE_URL=http://localhost:8080/api/v1
```

## Getting Started

```bash
cd apps/mobile
npm install
npx expo run:ios            # or: npm run android / npm run web
```

### Recommended Workflow

1. Start backend services (FastAPI, etc.) via `docker compose up` from the repo root.
2. Run Expo locally with `npx expo run:ios` (or `npm run android`).
3. Leave Metro running for hot reload, edit files under `apps/mobile`, and watch the simulator update automatically.

### Notes

- Sign-in + forgot-password flows use Supabase; registration uses the FastAPI `/auth/sign-up` endpoint (see `lib/api.ts`).
- If the simulator logs warn about system assets (MobileAsset, MessageSecurity), they’re harmless iOS messages.
- For clean builds, run `npx expo prebuild --clean` and `npx expo run:ios`.
