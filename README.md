# MangaVerse - Manga Reading Application

A modern manga reading application built with React, TanStack Router, Express.js, Prisma, and PostgreSQL.

## Features

- **User Authentication**: JWT-based auth with Google OAuth integration
- **Manga Discovery**: Search, filters, and fast browsing
- **Community**: Comments, follows, and group/author pages
- **Admin Tools**: User and content management endpoints
- **Media Handling**: Image uploads via Cloudinary
- **Type Safety**: Full TypeScript across frontend and backend
- **Responsive UI**: Mobile-first UI with Tailwind CSS

## Tech Stack

### Frontend
- **React 19** with TypeScript
- **TanStack Router** for routing
- **TanStack Query** for data fetching
- **Jotai** for state management
- **Tailwind CSS v4** for styling
- **Radix UI + shadcn/ui** for components
- **Framer Motion** for animations
- **Lingui** for localization
- **Vite** for build tooling
- **@react-oauth/google** for Google authentication
- **socket.io-client** for realtime features
- **Zod** for validation

### Backend
- **Express.js 5** with TypeScript
- **Prisma ORM** with PostgreSQL
- **Redis** (optional) for caching/rate limiting
- **Google Auth Library** for OAuth verification
- **JWT** for authentication tokens
- **bcryptjs** for password hashing
- **rate-limiter-flexible** for rate limiting
- **Socket.IO** for realtime features
- **Helmet + compression** for security and performance

### Database
- **PostgreSQL** with Prisma migrations
- **User profile and OAuth provider tracking**

## Prerequisites

- **Node.js** 18.x or higher
- **npm** or **yarn**
- **PostgreSQL** database
- **Redis** (optional)
- **Google OAuth 2.0 credentials**

## Quick Start

### 1. Clone the repository
```bash
git clone <repository-url>
cd manga-reading-app
```

### 2. Setup Environment Variables

Copy the example environment files and configure them:

```bash
# Copy and configure root .env
cp .env.example .env

# Copy and configure frontend .env
cp frontend/.env.example frontend/.env
```

#### Root `.env` Configuration:
```env
# Database Configuration
# For Prisma Accelerate (recommended for production)
DATABASE_URL="prisma://accelerate.prisma-data.net/?api_key=your-accelerate-api-key"
# Or for direct PostgreSQL connection (development only)
# DATABASE_URL="postgresql://username:password@localhost:5432/mangaverse_db"
DIRECT_DATABASE_URL="postgresql://username:password@localhost:5432/mangaverse_db"

# JWT Configuration
JWT_SECRET="your-super-secret-jwt-key-here"
JWT_REFRESH_SECRET="your-super-secret-refresh-key-here"
JWT_EXPIRES_IN="15m"
JWT_REFRESH_EXPIRES_IN="7d"

# Google OAuth Configuration
GOOGLE_CLIENT_ID="your-google-client-id"
GOOGLE_CLIENT_SECRET="your-google-client-secret"

# Server Configuration
BACKEND_PORT=5000
NODE_ENV=development
FRONTEND_URL="http://localhost:5173"

# Redis Configuration (optional)
REDIS_HOST="localhost"
REDIS_PORT=6379
REDIS_PASSWORD=""

# MangaDex API Credentials (optional)
MANGADEX_ID="your_mangadex_id"
MANGADEX_SECRET="your_mangadex_secret"
```

#### Frontend `.env` Configuration:
```env
# Google OAuth Configuration
VITE_GOOGLE_CLIENT_ID=your-google-client-id

# API Configuration
VITE_BACKEND_URL=http://localhost:5000
```

### 3. Google OAuth Setup

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select existing one
3. Configure OAuth consent screen
4. Create OAuth 2.0 credentials
5. Add authorized origins:
   - `http://localhost:5173` (frontend)
   - `http://localhost:5000` (backend)
6. Add authorized redirect URIs:
   - `http://localhost:5173/auth/callback`

### 4. Database Setup

Make sure PostgreSQL is running and create your database:

```sql
CREATE DATABASE mangaverse_db;
```

### 5. Install Dependencies & Start Development

#### Manual Setup

```bash
# Install root dependencies
npm install

# Install backend dependencies
cd backend
npm install

# Install frontend dependencies
cd ../frontend
npm install
cd ..

# Generate Prisma client
cd backend
npm run generate

# Run database migrations
npm run migrate
cd ..

# Start development servers
npm run dev
```

### 6. Access the Application

- **Frontend**: http://localhost:5173
- **Backend API**: http://localhost:5000
- **Prisma Studio**: Run `cd backend && npm run studio`

## Project Structure

```
manga-reading-app/
├── backend/                 # Express.js backend
│   ├── docs/               # Documentation and Prisma schema
│   │   └── prisma/         # Prisma schema and migrations
│   │       ├── schema.prisma
│   │       └── migrations/
│   ├── src/                # Source code
│   │   ├── controllers/    # Request handlers
│   │   ├── services/       # Business logic
│   │   ├── middlewares/    # Express middlewares
│   │   ├── routes/         # API routes
│   │   ├── types/          # TypeScript types
│   │   └── utils/          # Utility functions
│   └── server.ts           # Server entry point
├── frontend/               # React frontend
│   ├── src/                # Source code
│   │   ├── components/     # Reusable components
│   │   ├── pages/          # Page components
│   │   ├── contexts/       # React contexts
│   │   ├── services/       # API services
│   │   ├── store/          # Redux store
│   │   ├── routes/         # TanStack Router routes
│   │   └── utils/          # Utility functions
│   └── index.html          # HTML entry point
├── .env                    # Environment variables
├── package.json            # Root package.json
└── README.md              # This file
```

## Authentication Flow

### Google OAuth Flow

1. **Frontend**: User clicks "Sign in with Google"
2. **Google**: User authenticates and grants permissions
3. **Frontend**: Receives access token from Google
4. **Backend**: Verifies token with Google's API
5. **Backend**: Creates/updates user in database
6. **Backend**: Returns JWT tokens
7. **Frontend**: Stores JWT and redirects to dashboard

### JWT Flow

1. **Login**: User receives access & refresh tokens
2. **API Requests**: Access token sent in Authorization header
3. **Token Refresh**: Automatic refresh when access token expires
4. **Logout**: Tokens removed from client storage

## Available Scripts

### Root Scripts
- `npm run dev` - Start both frontend and backend in development mode
- `npm run build` - Build both frontend and backend for production

### Backend Scripts
- `npm run dev` - Start backend development server
- `npm run build` - Build backend for production
- `npm run start` - Start production server
- `npm run migrate` - Run database migrations
- `npm run generate` - Generate Prisma client
- `npm run studio` - Open Prisma Studio

### Frontend Scripts
- `npm run dev` - Start frontend development server
- `npm run build` - Build frontend for production
- `npm run preview` - Preview production build
- `npm run lint` - Run ESLint

## Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## Troubleshooting

### Common Issues

1. **Database Connection Error**
   - Check PostgreSQL is running
   - Verify DATABASE_URL in .env
   - Ensure database exists

2. **Google OAuth Error**
   - Verify Google Client ID in both .env files
   - Check Google Cloud Console configuration
   - Ensure authorized origins are correct

3. **Port Already in Use**
   - Change BACKEND_PORT in .env
   - Update VITE_BACKEND_URL in frontend/.env

4. **Prisma Migration Issues**
   - Run `npm run generate` in backend folder
   - Check database permissions
   - Reset with `npx prisma migrate reset`

### Getting Help

- Create an issue in the repository
- Check existing issues for solutions
- Review the documentation

## Roadmap

- [ ] Analytics: Tracking event + báo cáo admin
- [ ] Chat: 1-1 messaging + inbox admin
- [ ] Recommendations: Trending + đề xuất cá nhân

---
