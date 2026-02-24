# BeyondAgri Mobile 🌾📱

> A comprehensive mobile application for agricultural inventory management, connecting farmers, wholesalers, and administrators in the agricultural supply chain.

[![React Native](https://img.shields.io/badge/React%20Native-0.81.4-blue.svg)](https://reactnative.dev/)
[![Expo](https://img.shields.io/badge/Expo-~54.0.7-000020.svg)](https://expo.dev/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.9.2-blue.svg)](https://www.typescriptlang.org/)

## 📱 Overview

BeyondAgri Mobile is an offline-first React Native application designed to streamline agricultural inventory management. Built with Expo and TypeScript, it provides role-based access control for farmers, wholesalers, and administrators.

### Key Features

#### 🌾 For Farmers

- Track farm harvests and produce inventory
- Monitor expiring items with alerts
- View personal inventory reports
- Batch tracking for quality control
- Simple, intuitive interface focused on farm operations

#### 🏢 For Wholesalers

- Manage multiple warehouses and storage facilities
- Track inventory from multiple farmers
- Transfer items between locations
- Advanced batch tracking and traceability
- Aggregated inventory analytics
- Low stock alerts across all locations

#### 🛡️ For Administrators

- Full system access and user management
- System-wide inventory overview
- Audit logs and compliance tracking
- Advanced reporting and analytics
- Configuration management

#### ⚡ Core Capabilities

- **Offline-First**: Full functionality without internet connection
- **Role-Based Access Control**: Tailored experiences for each user type
- **Real-Time Sync**: Automatic data synchronization when online
- **Photo Management**: Capture and store farm/inventory photos
- **Geolocation**: Track farm and warehouse locations
- **Multi-Currency Support**: ZAR and other currencies
- **Alerts & Notifications**: Low stock and expiry warnings

---

## 🛠️ Tech Stack

| Category             | Technology                  |
| -------------------- | --------------------------- |
| **Framework**        | React Native 0.81.4         |
| **Platform**         | Expo SDK 54                 |
| **Language**         | TypeScript 5.9.2            |
| **State Management** | Zustand 5.0.8               |
| **Navigation**       | Expo Router 6.0.5           |
| **Database**         | SQLite (expo-sqlite 16.0.8) |
| **Authentication**   | JWT with Secure Storage     |
| **HTTP Client**      | Native Fetch API            |
| **Offline Support**  | NetInfo + SQLite            |
| **Camera**           | expo-camera 17.0.8          |
| **Location**         | expo-location 19.0.7        |

---

## 📋 Prerequisites

Before you begin, ensure you have the following installed:

- **Node.js**: v18+ or v20+ ([Download](https://nodejs.org/))
- **npm** or **yarn**: Latest version
- **Expo CLI**: `npm install -g @expo/cli`
- **iOS Simulator** (Mac only): Xcode 14+
- **Android Studio**: For Android development
- **Git**: For version control

### Mobile Device Requirements

- **iOS**: iOS 13.4 or later
- **Android**: Android 6.0 (API 23) or later

---

## 🚀 Getting Started

### 1. Clone the Repository

```bash
git clone https://github.com/beyond-agri/BeyondAgri-mobile.git
cd BeyondAgri-mobile
```

### 2. Install Dependencies

```bash
npm install
# or
yarn install
```

### 3. Configure Environment

Create a `.env` file in the root directory:

```env
# API Configuration
EXPO_PUBLIC_API_BASE_URL=https://api.beyondagri.com
EXPO_PUBLIC_API_VERSION=v1

# Development Features
EXPO_PUBLIC_ENABLE_HIDDEN_FEATURES=true

# RBAC Configuration
EXPO_PUBLIC_DISABLE_RBAC=true  # Set to true to disable role-based access control (give all users full access)
```

For local development, use:

```env
EXPO_PUBLIC_API_BASE_URL=http://10.0.2.2:8001  # Android Emulator
# or
EXPO_PUBLIC_API_BASE_URL=http://localhost:8001  # iOS Simulator
```

### 4. Start the Development Server

```bash
npm start
# or
yarn start
```

### 5. Run on Device/Simulator

#### iOS Simulator (Mac only)

```bash
npm run ios
# or
yarn ios
```

#### Android Emulator

```bash
npm run android
# or
yarn android
```

#### Web Browser

```bash
npm run web
# or
yarn web
```

#### Physical Device

1. Install **Expo Go** app on your device
2. Scan the QR code displayed in the terminal

---

## 📁 Project Structure

```
BeyondAgri-mobile/
├── app/                          # Expo Router app directory
│   ├── (auth)/                   # Authentication screens
│   │   ├── index.tsx            # Login screen
│   │   ├── register.tsx         # Registration screen
│   │   ├── password-reset.tsx   # Password reset
│   │   └── _layout.tsx          # Auth layout
│   ├── (tabs)/                   # Main app tabs
│   │   ├── index.tsx            # Dashboard
│   │   ├── farms.tsx            # Farms management
│   │   ├── inventory.tsx        # Inventory dashboard
│   │   ├── photos.tsx           # Photo gallery
│   │   ├── profile.tsx          # User profile
│   │   └── _layout.tsx          # Tab layout
│   ├── _layout.tsx              # Root layout
│   └── index.tsx                # App entry point
│
├── src/
│   ├── components/              # Reusable components
│   ├── hooks/                   # Custom React hooks
│   │   └── useInventoryPermissions.ts
│   ├── services/                # API services
│   │   ├── api.ts              # Main API client
│   │   ├── auth.ts             # Authentication service
│   │   ├── database.ts         # SQLite database service
│   │   └── inventoryApi.ts     # Inventory API client
│   ├── store/                   # Zustand stores
│   │   ├── auth-store.ts       # Authentication state
│   │   ├── app-store.ts        # App state (online/offline)
│   │   └── inventory-store.ts  # Inventory state
│   ├── types/                   # TypeScript types
│   │   ├── index.ts            # General types
│   │   └── inventory.ts        # Inventory types
│   └── utils/                   # Utility functions
│       ├── constants.ts        # App constants & colors
│       └── permissions.ts      # RBAC permissions
│
├── docs/                        # Documentation
│   ├── FRONTEND_INVENTORY_INTEGRATION_GUIDE.md
│   ├── FRONTEND_IMPLEMENTATION_COMMANDS.md
│   └── FRONTEND_QUICK_START.md
│
├── assets/                      # Static assets
├── node_modules/               # Dependencies
├── .env                        # Environment variables (not in git)
├── .gitignore                  # Git ignore rules
├── app.json                    # Expo configuration
├── package.json                # Dependencies & scripts
├── tsconfig.json              # TypeScript configuration
└── README.md                  # This file
```

---

## 🔧 Available Scripts

### Development Scripts

| Command                  | Description                   |
| ------------------------ | ----------------------------- |
| `npm start`              | Start Expo development server |
| `npm run android`        | Run on Android emulator       |
| `npm run ios`            | Run on iOS simulator          |
| `npm run web`            | Run in web browser            |
| `npx expo start --clear` | Clear cache and restart       |

### Code Quality Scripts

| Command                | Description                                        |
| ---------------------- | -------------------------------------------------- |
| `npm run lint`         | Check code for linting errors                      |
| `npm run lint:fix`     | Auto-fix linting errors                            |
| `npm run format`       | Format all files with Prettier                     |
| `npm run format:check` | Check if files are formatted (CI/CD)               |
| `npm run type-check`   | Run TypeScript compiler without emitting files     |
| `npm run validate`     | Run all checks (type-check + lint + format-check)  |

> **Note**: Pre-commit hooks automatically run `lint` and `format` on staged files before each commit.

---

## 🏗️ Architecture Overview

### State Management

- **Zustand**: Lightweight state management for global state
- **React Hooks**: Local component state
- **Stores**:
  - `auth-store`: User authentication & profile
  - `app-store`: App state, online/offline status
  - `inventory-store`: Inventory data, warehouses, alerts

### Data Flow

```
User Action → Component → Zustand Store → API Service → Backend
                ↓                            ↓
          Local State              Offline Queue (SQLite)
                ↓                            ↓
            UI Update                  Sync on Reconnect
```

### Offline Support

1. **SQLite Database**: Local data persistence
2. **Offline Queue**: Stores actions when offline
3. **Auto Sync**: Syncs when connection restored
4. **Conflict Resolution**: Smart merge strategies

### Role-Based Access Control (RBAC)

- **Permissions System**: Fine-grained access control
- **Three Roles**: Farmer, Wholesaler, Admin
- **UI Adaptation**: Shows/hides features based on role
- **Backend Enforcement**: JWT-based security

---

## 🔐 Authentication

### Flow

1. User enters credentials
2. Backend validates and returns JWT tokens
3. Tokens stored in Secure Storage
4. Tokens attached to all API requests
5. Auto-refresh on expiration

### Supported Auth Methods

- Email/Password login
- Registration with email verification
- Password reset via email
- Token refresh

---

## 📊 Inventory Management

### Features

- **Inventory Items**: Create, read, update, delete
- **Warehouses**: Manage storage facilities
- **Storage Bins**: Organize within warehouses
- **Inventory Types**: Categorize items (harvest, meat, poultry, etc.)
- **Transactions**: Track all inventory movements
- **Transfers**: Move items between locations
- **Alerts**: Low stock and expiry notifications
- **Reports**: Valuation, batch tracking, analytics

### Permissions by Role

| Feature            | Farmer | Wholesaler | Admin |
| ------------------ | ------ | ---------- | ----- |
| View Own Inventory | ✅     | ✅         | ✅    |
| Create Inventory   | ✅     | ✅         | ✅    |
| Manage Warehouses  | ❌     | ✅         | ✅    |
| View All Inventory | ❌     | ✅         | ✅    |
| Transfer Items     | ❌     | ✅         | ✅    |
| Manage Types       | ❌     | ✅         | ✅    |
| System Admin       | ❌     | ❌         | ✅    |

---

## 🎨 UI/UX Guidelines

### Design Principles

- **Mobile-First**: Optimized for touch interfaces
- **Offline-Ready**: Works without internet
- **Role-Aware**: Adapts to user type
- **Consistent**: Uniform design language
- **Accessible**: WCAG 2.1 AA compliant

### Color Palette

```typescript
{
  primary: '#22c55e',      // Green
  secondary: '#3b82f6',    // Blue
  background: '#f8fafc',   // Light gray
  surface: '#ffffff',      // White
  error: '#ef4444',        // Red
  warning: '#f59e0b',      // Orange
  success: '#10b981',      // Green
  info: '#3b82f6',         // Blue
  text: '#1f2937',         // Dark gray
  textSecondary: '#6b7280' // Medium gray
}
```

---

## 🧪 Testing

### Test Users

```
Farmer:
  Email: farmer@example.com
  Password: password123

Wholesaler:
  Email: wholesaler@example.com
  Password: password123

Admin:
  Email: admin@example.com
  Password: password123
```

---

## 🐛 Troubleshooting

### Common Issues

#### Metro Bundler Issues

```bash
# Clear cache and restart
npm start -- --clear
```

#### Build Errors

```bash
# Clean and reinstall
rm -rf node_modules
npm install
```

#### iOS Simulator Issues

```bash
# Reset simulator
xcrun simctl erase all
```

#### Android Emulator Issues

- Use Android Studio → AVD Manager → Cold Boot Now

#### API Connection Issues

- Check `EXPO_PUBLIC_API_BASE_URL` in `.env`
- For Android emulator, use `10.0.2.2` instead of `localhost`
- For iOS simulator, use `localhost` or your machine's IP

---

## 📚 Documentation

- [Backend Integration Guide](docs/FRONTEND_INVENTORY_INTEGRATION_GUIDE.md)
- [Implementation Commands](docs/FRONTEND_IMPLEMENTATION_COMMANDS.md)
- [Quick Start Guide](docs/FRONTEND_QUICK_START.md)

---

## 🤝 Contributing

We welcome contributions! Please follow these guidelines:

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

### Code Style

- Use TypeScript for all new code
- Follow existing naming conventions
- Write meaningful commit messages
- Add comments for complex logic
- Update documentation as needed

---

## 📄 License

This project is part of the BeyondAgri agricultural technology platform.

---

## 👥 Team

**BeyondAgri Development Team**

- [Beyond Capital Africa](https://beyondcapital.africa)

---

**Version**: 1.0.0
**Last Updated**: 2025-10-15
**Status**: ✅ Phase 1 Complete - Inventory Management Implemented
