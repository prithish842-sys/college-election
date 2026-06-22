# College Election

A production-ready college election platform built with React, Vite, Tailwind CSS, and Firebase. The application supports secure mobile voting with OTP verification, a kiosk voting experience with controlled session resets, and a live admin results dashboard with glassmorphism styling.

## Highlights

- Mobile portal with Student ID + phone verification
- OTP-gated voting flow for authenticated student voters
- Kiosk voting mode with locked success state and spacebar reset logic
- Shared voting dashboard across mobile and kiosk flows
- Live admin results dashboard powered by Firestore snapshots
- Transaction-based ballot submission with candidate vote aggregation
- Offline-safe unit and QA tests using Vitest and React Testing Library

## Tech Stack

- React 19
- Vite 5
- TypeScript
- Tailwind CSS
- Firebase Auth
- Cloud Firestore
- Vitest
- React Testing Library

## Application Routes

- `/` - Mobile voting portal
- `/kiosk` - Kiosk voting portal
- `/results` - Admin results dashboard

## Local Development

### Prerequisites

- Node.js 18+ recommended
- npm 9+

### Install

```bash
npm install
```

### Start the app

```bash
npm run dev
```

### Run tests

```bash
npm run test
```

### Run a one-off test pass

```bash
npm run test -- --run
```

### Typecheck

```bash
npm run typecheck
```

### Production build

```bash
npm run build
```

## Firebase Notes

The app currently uses the Firebase web SDK configuration from `firebase.js`. That client-side config is typically safe to ship for a web app, but you should still lock down your Firebase Authentication and Firestore rules before deployment.

### Local OTP testing

For `localhost` and other local development hosts, the mobile portal now enables Firebase's test-phone mode automatically. That means:

- use phone numbers added under Firebase Authentication test phone numbers
- use the matching test OTP configured in Firebase
- do not expect real SMS delivery from local development origins

For production-like testing, deploy to an authorized HTTPS domain in Firebase Authentication.

Do not commit:

- service account JSON files
- `.env` files with secrets
- local voter seed data such as `students.json`

## Firestore Seed

To seed local voter data:

```bash
npm run seed:firestore
```

Available flags:

- `--dry-run`
- `--reset-votes`

## Firebase Hosting

This repo includes:

- `firebase.json`
- `.firebaserc`

To deploy with the Firebase CLI:

```bash
firebase login
firebase use default
firebase deploy
```

## Quality Gates

Before deployment, this project has been validated with:

- Vitest unit and integration-style UI tests
- Firestore transaction tests with full Firebase mocking
- Vite production build
- TypeScript typecheck
- Biome static checks

## Project Structure

```text
src/
  components/
  data/
  lib/
  test/
  __tests__/
public/
firebase.js
seed-firestore.js
vite.config.js
```

## Deployment Checklist

1. Confirm Firebase project rules are production-safe.
2. Replace placeholder runtime values in `env.json` if your deployment depends on them.
3. Run `npm run test -- --run`.
4. Run `npm run build`.
5. Deploy the generated `dist/` folder through Firebase Hosting.
