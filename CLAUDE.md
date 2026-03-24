# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**Nexus Athletics** (NexusIAFitness) is a React Native/Expo fitness mobile app with AI features powered by Gemini. It includes a Node.js backend with Prisma/PostgreSQL. The app features workout tracking, AI coaching, body scanning, step counting, social features, and payment integration.

## Development Commands

### Frontend (Expo/React Native)
```bash
npm start                 # Start Expo development server
npm run android           # Run on Android (requires emulator/device)
npm run ios               # Run on iOS (requires Mac)
npm run web               # Run web version
```

### Backend (Node.js)
```bash
cd Backend
npm install               # Install dependencies
npx prisma generate       # Generate Prisma client
npx prisma db push        # Push schema to database (dev)
npx prisma migrate dev    # Create migration (production)
npm run dev               # Development with nodemon
npm start                 # Production start
```

### Database Admin Scripts
```bash
cd Backend
node scripts/createAdmin.js     # Create admin user
node scripts/resetAdminPassword.js  # Reset admin password
```

### Build (EAS)
```bash
eas build --platform android --profile production
eas build --platform ios --profile production
eas update --branch production   # OTA updates
```

## Architecture

### Frontend Structure
- `App.js` - Navigation setup with Stack + Tab navigators. Main entry point with SplashScreen.
- `screen/` - Screen components (see Key Screens section)
- `components/` - Reusable UI components (SplashScreen, MuscleRanking, NexusAlert, LoadingScreen)
- `constants/Config.js` - Backend URL and API endpoint configuration
- `lib/supabase.js` - Supabase client for realtime features

### Key Screens
- `Home.js` - Main dashboard with Bento grid layout
- `EntrenadorIA.js` - AI chat interface (largest screen ~56KB)
- `Login.js` / `register.js` - Authentication screens
- `TrainingCalendar.js` - Workout calendar (~41KB)
- `StepsHistory.js` - Step counter history
- `VoiceCoach.js` - Voice-based AI training
- `HealthSync.js` - Health data synchronization

### Backend Structure
- `Backend/index.js` - Express server entry point with route mounting
- `Backend/src/config/prisma.js` - Prisma client initialization
- `Backend/src/controllers/` - Request handlers
- `Backend/src/services/` - Business logic
- `Backend/src/routes/` - API route definitions
- `Backend/src/middlewares/authMiddleware.js` - JWT authentication

### Backend Services
- `geminiService.js` - AI chat with retry/fallback models
- `openAIService.js` - Whisper voice transcription
- `cloudinaryService.js` - Image upload (avatars, body scans)
- `stripeService.js` / `paypalService.js` - Payment processing
- `pdfService.js` - PDF generation for workout plans
- `notificationService.js` - Push notifications
- `resendService.js` - Email service

### Backend API Routes
- `/auth/*` - Authentication (login, register, OAuth)
- `/user/*` - User profile, settings, biometrics
- `/chat/*` - AI chat sessions and messages
- `/activities/*` - GPS activities (running, cycling)
- `/voice/*` - Voice coach transcription
- `/admin/*` - Admin dashboard endpoints
- `/payments/*` - Stripe/PayPal payment processing

### Key Data Models (Prisma)
- **User**: Auth, profile, biometrics, plan type (Gratis/Pro/Ultimate), health data, referral system
- **ChatSession/Message**: AI chat history with session management
- **Activity**: GPS activities (running, cycling) with route data
- **Friendship/DirectMessage**: Social features
- **Post/Like/Comment**: Community feed
- **SavedPlan**: Elite workout plans saved by users

## UI/Design System

This app uses a "Cyberpunk Gym" aesthetic defined in `design_guidelines.json`:
- **Primary color**: `#63ff15` (neon green)
- **Background**: `#0A0A0A` (near black)
- **Surface**: `#121212` (dark gray)
- **Typography**: System fonts, uppercase headings, bold weights

### Key UI Patterns
- Use `SafeAreaView` from `react-native-safe-area-context`
- Use `expo-linear-gradient` for buttons with neon glow
- Use `expo-blur` (BlurView) for glassmorphism overlays
- Use `StyleSheet` objects, NOT Tailwind classes
- Use View/Text/TouchableOpacity, NOT HTML tags (div/span/h1)
- Bento grid layout with Flexbox (flexWrap: wrap)

## Important Patterns

### API Configuration
- Frontend uses `constants/Config.js` for `BACKEND_URL` - update this for production
- Backend URL for production: `https://nexusathletics.onrender.com`
- All API calls should use Config.API_ENDPOINTS constants

### AI Integration (Gemini)
- Backend `geminiService.js` handles all AI calls with retry/fallback logic
- Models tried in order: `gemini-2.0-flash` → `gemini-2.5-pro` → `gemini-pro-latest`
- Chat limits: Unlimited for all plans
- Routine generation limits: 3/day for Gratis plan, unlimited for Pro/Ultimate

### Authentication Flow
- JWT tokens stored in AsyncStorage (frontend)
- Google OAuth configured (requires Client IDs in .env)
- Backend uses `authenticateToken` middleware for protected routes
- Two-factor authentication (2FA) is enabled by default

### Environment Variables

**Frontend (.env):**
- `EXPO_PUBLIC_GEMINI_API_KEY` - Gemini API key
- `EXPO_PUBLIC_GOOGLE_*_CLIENT_ID` - OAuth client IDs
- `EXPO_PUBLIC_SUPABASE_URL/ANON_KEY` - Supabase config
- `BACKEND_URL` - API server URL

**Backend (Backend/.env):**
- `DATABASE_URL/DIRECT_URL` - PostgreSQL connection (Supabase)
- `GEMINI_API_KEY` - Gemini for AI
- `OPENAI_API_KEY` - Whisper for voice features
- `JWT_SECRET` - Token signing (64+ chars recommended)
- `STRIPE_SECRET_KEY` - Payments (sk_test_ for dev, sk_live_ for prod)
- `PAYPAL_CLIENT_ID/PAYPAL_SECRET` - PayPal payments
- `CLOUDINARY_CLOUD_NAME/CLOUDINARY_API_KEY/CLOUDINARY_API_SECRET` - Image upload
- `RESEND_API_KEY` - Email service

### Step Counter / Health Sync
- Uses `expo-sensors` Pedometer for step counting
- Works in production builds; limited in Expo Go
- Steps stored in User model (`healthSteps`, `healthCalories`)

### Payment Plans
- **Gratis**: Unlimited chat, 3 routines/day
- **Pro**: Premium features unlocked
- **Ultimate**: All features + priority

## Common Tasks

### Adding a new screen
1. Create file in `screen/`
2. Import and add to Stack.Navigator in `App.js`
3. If tab screen, add to TabNavigator instead

### Adding a new API route
1. Create route file in `Backend/src/routes/`
2. Create controller in `Backend/src/controllers/`
3. Import and mount in `Backend/index.js`
4. Add endpoint constant in `constants/Config.js`

### Database schema changes
1. Edit `Backend/prisma/schema.prisma`
2. Run `npx prisma db push` (dev) or `npx prisma migrate dev --name description` (production)

### Running backend locally
1. Ensure PostgreSQL is running or use Supabase DATABASE_URL
2. `cd Backend && npm install && npx prisma generate`
3. `npm run dev` starts on port 3000

## Production Deployment

1. Update `constants/Config.js` BACKEND_URL to production server
2. Change Stripe/PayPal keys from test to live
3. Generate secure JWT_SECRET (64+ characters)
4. Run `eas build --platform android --profile production`
5. Backend deployed to Render with Supabase PostgreSQL

## Known Issues

- Supabase realtime `setAuth` polyfill required (see `lib/supabase.js`)
- Step counter only works in production builds, not Expo Go
- Backend Gemini quota may require fallback models
- Stripe publishable key is hardcoded in `App.js` (should be environment variable)