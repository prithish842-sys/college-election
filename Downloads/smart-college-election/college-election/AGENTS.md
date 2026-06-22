# Project Guidance

## Project Type
Frontend-only React application (backend removed - ready for full-stack integration)

## Architecture & Stack

✅ **React 19** - Modern UI framework  
✅ **TypeScript** - Full type safety  
✅ **Tailwind CSS** - Utility-first styling  
✅ **Radix UI** - Accessible component library  
✅ **Zustand** - Lightweight state management  
✅ **Vite** - Lightning-fast build tool  
✅ **Biome** - Code formatting and linting  

❌ **Removed**: All blockchain/ICP code, Caffeine.ai framework, Motoko backend

## Quick Start

```bash
npm run install-deps     # Install dependencies
npm run dev              # Start dev server (localhost:5173)
npm run typecheck        # Type checking
npm run check            # Lint code
npm run fix              # Auto-fix linting issues
npm run build            # Production build
```

## File Organization

- **Main App**: `src/frontend/src/App.tsx`
- **Election Data**: `src/frontend/src/data/electionData.ts`
- **Components**: `src/frontend/src/components/`
- **Types**: `src/frontend/src/types/election.ts`
- **Styling**: `src/frontend/tailwind.config.js`, `src/frontend/src/index.css`
- **Configuration**: `src/frontend/vite.config.js`

## Key Customizations

1. **Election Positions & Candidates**: Edit `src/frontend/src/data/electionData.ts`
2. **Colors & Theme**: Update `src/frontend/tailwind.config.js`
3. **UI Components**: Modify files in `src/frontend/src/components/`
4. **API Integration**: Create in `src/frontend/src/lib/api.ts` (see BACKEND_INTEGRATION.md)

## Documentation

- [README.md](README.md) - Project overview and features
- [SETUP.md](SETUP.md) - Development setup and customization guide
- [BACKEND_INTEGRATION.md](BACKEND_INTEGRATION.md) - How to add backend (REST API, PostgreSQL, Docker)
- [DESIGN.md](DESIGN.md) - Design system and component documentation
- [CONVERSION_COMPLETE.md](CONVERSION_COMPLETE.md) - Full refactoring summary

## Verified Commands (Root Directory)

- `npm run dev` - Vite dev server on http://localhost:5173
- `npm run build` - Production build → `src/frontend/dist/`
- `npm run typecheck` - TypeScript validation
- `npm run check` - Code linting
- `npm run fix` - Auto-fix linting issues
- `npm run install-deps` - Install all dependencies

## Full-Stack Integration

### Ready to Add Backend?
See [BACKEND_INTEGRATION.md](BACKEND_INTEGRATION.md) for:
- Express.js REST API setup
- PostgreSQL + Prisma ORM
- Docker Compose for local development
- Security & authentication patterns
- Deployment options (Vercel, Railway, AWS, etc.)

### Key Integration Points
- **Vote Submission**: `ConfirmationScreen.tsx` → API endpoint
- **Results Display**: `VotingView.tsx` or new Results component
- **Authentication**: Add to `App.tsx` before voting
- **Database**: Store votes in PostgreSQL/MongoDB

## Deployment

### Frontend Only
- Vercel (recommended)
- Netlify
- GitHub Pages
- AWS S3 + CloudFront

### Full-Stack
- Vercel (frontend + backend functions)
- Railway.app (frontend + Node.js backend)
- AWS EC2 (frontend + backend + database)

## Notes

- **Backend Removed**: All Motoko/ICP/Caffeine.ai code deleted
- **Frontend Ready**: Production-ready React app, ready for backend integration
- **Mock Data**: Currently using static election data (move to API when backend ready)
- **Environment**: Uses `.env` for API_URL configuration
