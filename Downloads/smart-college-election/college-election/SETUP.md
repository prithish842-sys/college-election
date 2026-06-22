# Project Setup Guide

## What Changed

This project has been refactored to remove all blockchain dependencies (Motoko/ICP/DFINITY) and legacy framework code. Now it's a clean, modern React application with a clear separation of concerns, optimized for traditional full-stack development practices.

## Removed Legacy Components

- ❌ Motoko smart contract backend (`src/backend/`)
- ❌ Internet Computer (ICP) blockchain dependencies (@dfinity/*)
- ❌ Caffeine.ai framework and infrastructure packages
- ❌ Motoko compiler and mops package manager build system
- ❌ Auto-generated blockchain contract bindings

## What Remains

✅ Modern React 19 frontend with TypeScript  
✅ Tailwind CSS for styling  
✅ Radix UI component system  
✅ Vite for fast development  
✅ Mock election data system  
✅ Professional UI/UX design  

## Architecture

### Current Stack
```
College Election Voting App
└── Frontend (React + TypeScript)
    ├── Components (React functional components)
    ├── State Management (Zustand + React hooks)
    ├── Styling (Tailwind CSS)
    └── UI Library (Radix UI)
```

### For Adding a Backend Later

If you want to add a backend service in the future, consider:

1. **REST API** (Recommended for simplicity)
   - Use Express.js, Fastify, or similar
   - Create new `src/backend/` folder
   - API endpoints for vote submission, results retrieval

2. **Node.js/Express Backend**
   ```
   src/
   ├── frontend/     (React app - current)
   └── backend/      (New Express server)
   ```

3. **Database**
   - PostgreSQL with Prisma ORM
   - MongoDB with Mongoose
   - SQLite for simple deployments

## Development Workflow

### Quick Start
```bash
# From project root
npm run dev        # Start frontend dev server
npm run typecheck  # Verify types
npm run fix        # Fix linting issues
npm run build      # Build for production
```

### File Organization
```
src/frontend/src/
├── components/    # All React components
├── data/          # Mock data (move to API later)
├── types/         # TypeScript definitions
├── hooks/         # Custom hooks
├── lib/           # Utilities
└── App.tsx        # Main component
```

## Key Files for Customization

1. **Election Data** → [src/frontend/src/data/electionData.ts](../src/frontend/src/data/electionData.ts)
   - Add/remove positions and candidates here

2. **UI Components** → [src/frontend/src/components/](../src/frontend/src/components/)
   - Customize voting UI and flows

3. **Styling** → [src/frontend/tailwind.config.js](../src/frontend/tailwind.config.js)
   - Update colors, fonts, themes

4. **Configuration** → [src/frontend/vite.config.js](../src/frontend/vite.config.js)
   - Build and dev server settings

## Adding Features

### Add a New Position
Edit [src/frontend/src/data/electionData.ts](../src/frontend/src/data/electionData.ts):
```typescript
export const POSITIONS = [
  // ... existing
  { id: "treasurer", name: "Treasurer", description: "Manage finances" },
];
```

### Create a New Component
```typescript
// src/frontend/src/components/MyComponent.tsx
import React from 'react';

export const MyComponent: React.FC<Props> = ({ prop }) => {
  return <div>Component</div>;
};
```

### Add API Integration (Future)
```typescript
// src/frontend/src/hooks/useVotes.ts
export const useVotes = () => {
  const submitVotes = async (votes: Vote) => {
    const response = await fetch('/api/votes', {
      method: 'POST',
      body: JSON.stringify(votes),
    });
    return response.json();
  };
  return { submitVotes };
};
```

## Deployment

### Frontend Only
- Deploy to Vercel, Netlify, or GitHub Pages
- `npm run build` generates static files in `src/frontend/dist/`

### With Backend Later
- Deploy frontend to CDN
- Deploy backend to your preferred hosting
- Update API endpoints in frontend `.env` file

## Dependencies Status

✅ **Active and Used**
- react, react-dom (UI framework)
- typescript (type safety)
- tailwindcss, postcss (styling)
- @radix-ui/* (accessible UI components)
- vite, @vitejs/* (build tooling)
- zustand (state management)
- sonner (notifications)

❌ **Removed (No Longer Needed)**
- @dfinity/agent, @dfinity/auth-client (blockchain)
- @icp-sdk/core (Internet Computer SDK)
- @caffeineai/core-infrastructure (legacy framework)
- @react-three/* (3D rendering - was unused)

## Troubleshooting

### Port Already in Use
```bash
# Vite default is 5173
# Change in vite.config.js if needed
```

### Type Errors
```bash
npm run typecheck  # Find type issues
npm run fix        # Auto-fix where possible
```

### Build Issues
```bash
# Clear cache and reinstall
rm -rf node_modules package-lock.json
npm install
npm run build
```

## Next Steps

1. ✅ Verify the dev server runs: `npm run dev`
2. ✅ Check election data in [electionData.ts](../src/frontend/src/data/electionData.ts)
3. ✅ Customize colors and branding
4. ✅ Deploy to your hosting platform
5. 🔄 Plan backend integration if needed

## Questions?

- Check [README.md](./README.md) for overview
- Review component code in [src/frontend/src/components/](../src/frontend/src/components/)
- Check TypeScript types in [src/frontend/src/types/](../src/frontend/src/types/)
