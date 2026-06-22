# College Election Voting Application

A modern, premium voting application for college elections with smooth animations, responsive design, and a professional glassmorphism UI.

## Features

- ✨ Full-screen hero slideshow with fade transitions
- 🗳️ Multi-position election voting system
- 📱 Fully responsive on mobile, tablet, and desktop
- 🎨 Royal navy, black, and white gradient design with glassmorphism
- ⚡ Smooth hover animations and transitions
- 🔄 Progress tracking (Step X/8)
- 📊 Confirmation screen with vote summary

## Tech Stack

- **Frontend Framework**: React 19 with TypeScript
- **Styling**: Tailwind CSS with custom animations
- **UI Components**: Radix UI components
- **State Management**: Zustand
- **Build Tool**: Vite
- **Code Quality**: Biome for linting and formatting

## Getting Started

### Prerequisites

- Node.js >= 16.0.0
- npm >= 9.0.0

### Installation

```bash
# Install dependencies
npm run install-deps

# Or manually
cd src/frontend
npm install
```

### Development

```bash
# Start development server
npm run dev

# This will start Vite dev server at http://localhost:5173
```

### Building

```bash
# Build for production
npm run build

# The compiled app will be in src/frontend/dist/
```

### Code Quality

```bash
# Type checking
npm run typecheck

# Linting
npm run check

# Fix linting issues
npm run fix
```

## Project Structure

```
src/frontend/
├── src/
│   ├── components/          # React components
│   │   ├── CandidateCard.tsx
│   │   ├── ConfirmationScreen.tsx
│   │   ├── HomePage.tsx
│   │   ├── VotingView.tsx
│   │   ├── SidebarMenu.tsx
│   │   └── ui/              # Radix UI component library
│   ├── data/
│   │   └── electionData.ts  # Election positions and candidates
│   ├── types/
│   │   └── election.ts      # TypeScript types
│   ├── hooks/               # Custom React hooks
│   ├── lib/                 # Utility functions
│   ├── App.tsx              # Main app component
│   ├── main.tsx             # Entry point
│   └── index.css            # Global styles
├── public/                  # Static assets
├── vite.config.js           # Vite configuration
├── tailwind.config.js       # Tailwind CSS configuration
├── tsconfig.json            # TypeScript configuration
└── package.json
```

## Election Data

Voting positions and candidates are defined in [src/frontend/src/data/electionData.ts](src/frontend/src/data/electionData.ts). Update this file to change the election positions and candidates.

Example structure:
```typescript
export const POSITIONS = [
  { id: "president", name: "President", description: "Lead the organization" },
  // ... more positions
];

export const CANDIDATES = [
  { id: "candidate1", name: "John Doe", position: "president", bio: "..." },
  // ... more candidates
];
```

## Customization

### Colors & Theme
Update Tailwind configuration in [tailwind.config.js](src/frontend/tailwind.config.js)

### Fonts & Typography
Modify styles in [src/frontend/src/index.css](src/frontend/src/index.css)

### Election Positions
Edit [src/frontend/src/data/electionData.ts](src/frontend/src/data/electionData.ts)

## Available Scripts

From the project root:

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run typecheck` - Run TypeScript type checking
- `npm run check` - Check code with Biome
- `npm run fix` - Fix code issues with Biome
- `npm run install-deps` - Install all dependencies

## Browser Support

- Chrome (latest)
- Firefox (latest)
- Safari (latest)
- Edge (latest)

## License

MIT License - Feel free to use and modify this project for your needs.

## Support

For issues or questions, please refer to the project documentation or contact the development team.
