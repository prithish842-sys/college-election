# Backend Integration Guide

This document explains how to add a backend service to the college election voting application.

## Current State

The application currently works with mock election data stored in [src/frontend/src/data/electionData.ts](src/frontend/src/data/electionData.ts). There is no backend service.

## Why Add a Backend?

- **Persist votes** to a database
- **Prevent duplicate voting** with user authentication
- **Generate live results** and analytics
- **Secure vote submission** with validation
- **Scale to multiple institutions**

## Option 1: Simple REST API (Recommended)

### Setup Structure
```
project-root/
├── src/
│   ├── frontend/     (React app - existing)
│   └── backend/      (New Node.js/Express server)
└── docker-compose.yml (Optional: for local development)
```

### Step 1: Create Backend Directory
```bash
mkdir src/backend
cd src/backend
npm init -y
```

### Step 2: Install Dependencies
```bash
npm install express cors dotenv
npm install -D typescript @types/express @types/node ts-node nodemon
```

### Step 3: Create Basic Server
```typescript
// src/backend/server.ts
import express from 'express';
import cors from 'cors';

const app = express();
app.use(cors());
app.use(express.json());

// Store votes in memory (replace with database)
const votes: Map<string, string> = new Map();

// Get all votes
app.get('/api/results', (req, res) => {
  res.json(Object.fromEntries(votes));
});

// Submit a vote
app.post('/api/votes', (req, res) => {
  const { userId, positionId, candidateId } = req.body;
  
  // Validation
  if (!userId || !positionId || !candidateId) {
    return res.status(400).json({ error: 'Missing required fields' });
  }
  
  // Store vote
  votes.set(`${userId}-${positionId}`, candidateId);
  
  res.json({ success: true, message: 'Vote recorded' });
});

app.listen(3000, () => {
  console.log('Server running on http://localhost:3000');
});
```

### Step 4: Update Frontend to Use API

**Create API client** [src/frontend/src/lib/api.ts](src/frontend/src/lib/api.ts):
```typescript
const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:3000';

export async function submitVotes(votes: Record<string, string>) {
  const response = await fetch(`${API_BASE}/api/votes`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      userId: 'user-123', // TODO: Use real user ID
      votes,
    }),
  });
  
  if (!response.ok) {
    throw new Error('Failed to submit votes');
  }
  
  return response.json();
}

export async function getResults() {
  const response = await fetch(`${API_BASE}/api/results`);
  return response.json();
}
```

**Update App.tsx** to call the API:
```typescript
// In ConfirmationScreen or after voting
const handleSubmit = async () => {
  try {
    await submitVotes(votes);
    toast.success('Votes submitted successfully!');
    handleReset();
  } catch (error) {
    toast.error('Failed to submit votes');
  }
};
```

### Step 5: Environment Configuration

**.env.local** (frontend):
```
VITE_API_URL=http://localhost:3000
```

**.env** (backend):
```
PORT=3000
NODE_ENV=development
DATABASE_URL=your-database-url
```

### Step 6: Run Both Services

```bash
# Terminal 1: Frontend
cd src/frontend
npm run dev

# Terminal 2: Backend
cd src/backend
npm run dev
```

## Option 2: Database Integration

### PostgreSQL + Prisma (Recommended)

**Install Prisma:**
```bash
cd src/backend
npm install @prisma/client
npm install -D prisma
npx prisma init
```

**Create Schema** (prisma/schema.prisma):
```prisma
datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

generator client {
  provider = "prisma-client-js"
}

model Vote {
  id        Int     @id @default(autoincrement())
  userId    String
  positionId String
  candidateId String
  createdAt DateTime @default(now())
  
  @@unique([userId, positionId])
}

model User {
  id    String @id @default(cuid())
  email String @unique
  votes Vote[]
}
```

**Run migrations:**
```bash
npx prisma migrate dev --name init
```

**Use in Express:**
```typescript
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

app.post('/api/votes', async (req, res) => {
  const { userId, positionId, candidateId } = req.body;
  
  try {
    const vote = await prisma.vote.upsert({
      where: { userId_positionId: { userId, positionId } },
      update: { candidateId },
      create: { userId, positionId, candidateId },
    });
    res.json({ success: true, vote });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});
```

## Option 3: Docker Compose Setup

**docker-compose.yml:**
```yaml
version: '3.8'

services:
  postgres:
    image: postgres:15
    environment:
      POSTGRES_DB: election
      POSTGRES_PASSWORD: postgres
    ports:
      - "5432:5432"
    volumes:
      - postgres_data:/var/lib/postgresql/data

  backend:
    build: ./src/backend
    ports:
      - "3000:3000"
    environment:
      DATABASE_URL: postgresql://postgres:postgres@postgres:5432/election
      NODE_ENV: development
    depends_on:
      - postgres

  frontend:
    build: ./src/frontend
    ports:
      - "5173:5173"
    environment:
      VITE_API_URL: http://localhost:3000

volumes:
  postgres_data:
```

**Run with Docker:**
```bash
docker-compose up
```

## Deployment Options

### Frontend Deployment
- **Vercel** (Recommended - automatic deployments from git)
- **Netlify**
- **GitHub Pages**
- **AWS S3 + CloudFront**

### Backend Deployment
- **Vercel** (Node.js functions)
- **Heroku**
- **Railway.app**
- **AWS EC2** or **Lightsail**
- **DigitalOcean App Platform**

### Database Hosting
- **Vercel Postgres** (recommended with Vercel)
- **Supabase** (PostgreSQL + Auth)
- **PlanetScale** (MySQL)
- **MongoDB Atlas**
- **AWS RDS**

## Security Considerations

1. **CORS Configuration**
   ```typescript
   app.use(cors({
     origin: process.env.FRONTEND_URL,
     credentials: true,
   }));
   ```

2. **Authentication**
   ```typescript
   // Add JWT tokens
   import jwt from 'jsonwebtoken';
   
   const token = jwt.sign({ userId }, process.env.JWT_SECRET);
   ```

3. **Input Validation**
   ```typescript
   import { body, validationResult } from 'express-validator';
   
   app.post('/api/votes', 
     body('userId').isString(),
     body('votes').isObject(),
     (req, res) => {
       const errors = validationResult(req);
       if (!errors.isEmpty()) {
         return res.status(400).json({ errors });
       }
       // Process vote
     }
   );
   ```

4. **Rate Limiting**
   ```typescript
   import rateLimit from 'express-rate-limit';
   
   const limiter = rateLimit({
     windowMs: 15 * 60 * 1000,
     max: 100,
   });
   
   app.use(limiter);
   ```

## Migration Strategy

If you already have an existing backend or data:

1. Export existing data to JSON/CSV
2. Create Prisma schema matching your data
3. Write migration script to import data
4. Update frontend API calls to point to new backend
5. Run parallel systems briefly for validation
6. Cutover to new system

## Monitoring & Logging

```typescript
// Add logging
import morgan from 'morgan';

app.use(morgan('combined'));

// Error handling
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: 'Internal server error' });
});
```

## Performance Optimization

```typescript
// Add caching
import redis from 'redis';

const cache = redis.createClient();

app.get('/api/results', async (req, res) => {
  const cached = await cache.get('results');
  if (cached) return res.json(JSON.parse(cached));
  
  const results = await getResultsFromDB();
  await cache.setEx('results', 60, JSON.stringify(results));
  res.json(results);
});
```

## Recommended Next Steps

1. Start with **Option 1** (Simple REST API)
2. Add **PostgreSQL** for persistence
3. Implement **authentication** if needed
4. Add **rate limiting** for security
5. Deploy to **Vercel** for frontend + backend

For questions, refer to:
- [Express.js Documentation](https://expressjs.com/)
- [Prisma Documentation](https://www.prisma.io/docs/)
- [Vercel Deployment Docs](https://vercel.com/docs)
