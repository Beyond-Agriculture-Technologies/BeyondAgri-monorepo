# BeyondAgri Mobile 🌾📱

A React Native mobile application built with Expo for agricultural farm management with offline capabilities.

## Features

- 🔐 **AWS Cognito Authentication** - Secure user authentication
- 📱 **React Native with Expo** - Cross-platform mobile development
- 🗄️ **Offline-First Database** - SQLite with automatic sync
- 📷 **Camera Integration** - Farm photo documentation
- 🌐 **Network-Aware** - Works offline with automatic sync when online
- 👥 **Role-Based Access** - farmer/wholesaler/admin roles
- 📍 **Location Services** - GPS coordinates for farms

## Tech Stack

- **Framework**: Expo SDK 54 with React Native
- **Language**: TypeScript
- **Navigation**: Expo Router (file-based routing)
- **Database**: Expo SQLite for offline storage
- **Authentication**: AWS Amplify with Cognito
- **State Management**: Zustand
- **Icons**: Expo Vector Icons (Ionicons)

## Prerequisites

- Node.js 18+ and npm
- Expo CLI (`npm install -g @expo/cli`)
- iOS Simulator (Xcode) for iOS development
- Android Studio with Android SDK for Android development

## Getting Started

### 1. Install Dependencies

```bash
npm install
```

### 2. Environment Configuration

Copy the environment template and configure your AWS Cognito settings:

```bash
cp .env.example .env
```

Edit `.env` with your configuration:

```env
EXPO_PUBLIC_API_URL=https://your-api-endpoint.com
EXPO_PUBLIC_AWS_REGION=us-east-1
EXPO_PUBLIC_USER_POOL_ID=your_user_pool_id
EXPO_PUBLIC_USER_POOL_CLIENT_ID=your_client_id
```

### 3. Start Development Server

```bash
# Start Expo development server
npm start

# Or start with specific platform
npm run ios      # iOS Simulator
npm run android  # Android Emulator
npm run web      # Web browser
```

## Development Commands

```bash
# Start development server
npm start
npx expo start

# Platform-specific development
npx expo start --ios       # Launch in iOS Simulator
npx expo start --android   # Launch in Android Emulator
npx expo start --web       # Launch in web browser

# Clear cache and restart
npx expo start --clear

# Build for production
npx expo build:ios
npx expo build:android
```

## Project Structure

```
app/                    # Expo Router app directory
├── (auth)/            # Authentication screens
├── (tabs)/            # Main app tabs navigation
└── _layout.tsx        # Root layout with providers

src/
├── components/        # Reusable UI components
├── screens/          # Screen components
├── services/         # API, Auth, and Database services
├── hooks/            # Custom React hooks
├── store/            # Zustand state management
├── types/            # TypeScript type definitions
└── utils/            # Utility functions and constants
```

## Key Features

### Authentication
- AWS Cognito integration with secure token storage
- Role-based access control (farmer/wholesaler/admin)
- Automatic session restoration

### Offline Capabilities
- SQLite database for local data storage
- Offline action queue with automatic sync
- Network status detection and handling
- Conflict resolution for concurrent edits

### Farm Management
- Add, edit, and view farm information
- GPS location integration
- Photo documentation with camera access
- Sync status tracking

### Mobile-Optimized
- Touch-friendly interface design
- Native iOS and Android performance
- Responsive layouts for all screen sizes
- Platform-specific UI adaptations

## Database Schema

Local SQLite tables:
- **farms** - Farm information and coordinates
- **photos** - Farm photos with metadata
- **offline_actions** - Queued actions for sync
- **settings** - App configuration

## API Integration

The app integrates with your existing PostgreSQL backend:
- RESTful API communication
- JWT token authentication
- Automatic retry with exponential backoff
- Network-aware request handling

## Environment Variables

Required environment variables:

| Variable | Description | Example |
|----------|-------------|---------|
| `EXPO_PUBLIC_API_URL` | Backend API base URL | `https://api.beyondagri.com` |
| `EXPO_PUBLIC_AWS_REGION` | AWS region | `us-east-1` |
| `EXPO_PUBLIC_USER_POOL_ID` | Cognito User Pool ID | `us-east-1_xxxxxxxxx` |
| `EXPO_PUBLIC_USER_POOL_CLIENT_ID` | Cognito App Client ID | `xxxxxxxxxxxxxxxxxx` |

## Deployment

### Development Builds
```bash
# Create development build
npx expo install --fix
npx expo run:ios
npx expo run:android
```

### Production Builds
```bash
# Build for app stores
eas build --platform ios
eas build --platform android
```

## Troubleshooting

### Common Issues

1. **Metro bundler cache issues**:
   ```bash
   npx expo start --clear
   ```

2. **iOS Simulator not opening**:
   - Ensure Xcode and iOS Simulator are installed
   - Check simulator selection in Xcode

3. **Android emulator issues**:
   - Verify Android Studio and SDK installation
   - Check that emulator is running

4. **Network requests failing**:
   - Verify API endpoint in environment variables
   - Check network connectivity
   - Ensure CORS is configured on backend

## Contributing

1. Create a feature branch
2. Make your changes with TypeScript
3. Test on both iOS and Android
4. Submit a pull request

## License

This project is part of the BeyondAgri agricultural technology platform.