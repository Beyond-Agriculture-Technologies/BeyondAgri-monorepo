# Frontend Implementation Commands - Phase 1 Inventory

**Quick command reference for implementing Phase 1 Inventory Management APIs in your frontend application.**

---

## 🎯 Prerequisites

```bash
# Ensure you have these installed
node --version  # Should be v16+ or v18+
npm --version   # or yarn --version

# Install axios if not already installed
npm install axios
# or
yarn add axios
```

---

## 📋 Step-by-Step Implementation Commands

### Step 1: Create Directory Structure

```bash
# Navigate to your frontend repository
cd /path/to/your/frontend/repo

# Create necessary directories
mkdir -p src/types
mkdir -p src/services
mkdir -p src/components/inventory
mkdir -p src/pages/inventory
```

### Step 2: Copy Type Definitions

```bash
# Create the inventory types file
touch src/types/inventory.ts

# Open and copy contents from:
# BeyondAgri/docs/FRONTEND_INVENTORY_INTEGRATION_GUIDE.md
# Section: "TypeScript Type Definitions"
```

Or use this one-liner (from the backend repo):

```bash
# If you're in the backend repo, copy to frontend repo
cp docs/typescript-types-inventory.ts /path/to/frontend/src/types/inventory.ts
```

### Step 3: Create API Client

```bash
# Create the API client file
touch src/services/inventoryApi.ts

# Open and copy contents from:
# BeyondAgri/docs/FRONTEND_INVENTORY_INTEGRATION_GUIDE.md
# Section: "API Client Implementation"
```

### Step 4: Update API Client Configuration

Edit `src/services/inventoryApi.ts`:

```typescript
// Line 6-9: Update baseURL to match your environment
constructor(baseURL: string = process.env.REACT_APP_API_URL || '/api/v1') {
  // For development:
  // baseURL: 'http://localhost:8000/api/v1'
  // For production:
  // baseURL: 'https://api.beyondagri.com/api/v1'
}

// Line 16-20: Update auth token retrieval to match your auth system
const token = localStorage.getItem('authToken');
// Change to:
// const token = useAuthStore().getToken(); // Zustand
// const token = store.getState().auth.token; // Redux
// const token = await AsyncStorage.getItem('authToken'); // React Native
```

### Step 5: Create Environment Variables

Create or update `.env` file:

```bash
# Create .env file
touch .env

# Add these variables
echo "REACT_APP_API_URL=http://localhost:8000/api/v1" >> .env
echo "REACT_APP_ENV=development" >> .env
```

For production (`.env.production`):

```bash
touch .env.production
echo "REACT_APP_API_URL=https://api.beyondagri.com/api/v1" >> .env.production
echo "REACT_APP_ENV=production" >> .env.production
```

---

## 🧪 Testing Commands

### Test API Connection

```bash
# Start your frontend dev server
npm run dev
# or
yarn dev

# Open browser console and run:
```

```javascript
// In browser console
import { inventoryApi } from './services/inventoryApi'

// Test connection
inventoryApi
  .listInventoryItems({ limit: 5 })
  .then(data => console.log('✅ API Connected:', data))
  .catch(error => console.error('❌ Connection Failed:', error))
```

### Quick Test Script

Create `src/utils/testInventoryApi.ts`:

```typescript
import { inventoryApi } from '../services/inventoryApi'

export async function testInventoryApi() {
  console.log('🧪 Testing Inventory API...')

  try {
    // Test 1: List items
    console.log('Test 1: Listing items...')
    const items = await inventoryApi.listInventoryItems({ limit: 5 })
    console.log('✅ Items:', items.length)

    // Test 2: Get valuation
    console.log('Test 2: Getting valuation...')
    const valuation = await inventoryApi.getInventoryValuation()
    console.log('✅ Total Value:', valuation.total_value)

    // Test 3: Low stock alerts
    console.log('Test 3: Getting low stock alerts...')
    const lowStock = await inventoryApi.getLowStockAlerts()
    console.log('✅ Low Stock Items:', lowStock.length)

    // Test 4: Expiring items
    console.log('Test 4: Getting expiring items...')
    const expiring = await inventoryApi.getExpiringItems(7)
    console.log('✅ Expiring Items:', expiring.length)

    console.log('🎉 All tests passed!')
    return true
  } catch (error) {
    console.error('❌ Test failed:', error)
    return false
  }
}
```

Run test from any component:

```typescript
import { testInventoryApi } from '../utils/testInventoryApi'

// In component
useEffect(() => {
  testInventoryApi()
}, [])
```

---

## 🏗️ Component Generation Commands

### Generate Component Scaffolds

#### React (JavaScript/TypeScript)

```bash
# Dashboard
touch src/pages/inventory/Dashboard.tsx

# Inventory List
touch src/pages/inventory/InventoryList.tsx

# Item Form
touch src/pages/inventory/ItemForm.tsx

# Warehouse Management
touch src/pages/inventory/Warehouses.tsx

# Alerts
touch src/pages/inventory/LowStockAlerts.tsx
touch src/pages/inventory/ExpiryAlerts.tsx

# Reports
touch src/pages/inventory/ValuationReport.tsx
touch src/pages/inventory/BatchTracking.tsx
```

#### React Native

```bash
# Create screens
touch src/screens/InventoryDashboard.tsx
touch src/screens/InventoryList.tsx
touch src/screens/AddInventoryItem.tsx
touch src/screens/WarehouseManagement.tsx
touch src/screens/LowStockAlerts.tsx
```

#### Vue.js

```bash
# Create views
touch src/views/InventoryDashboard.vue
touch src/views/InventoryList.vue
touch src/views/InventoryForm.vue
touch src/views/WarehouseManagement.vue
```

---

## 🎨 Styling Setup

### Tailwind CSS

```bash
# Install Tailwind (if not already installed)
npm install -D tailwindcss postcss autoprefixer
npx tailwindcss init -p
```

Add to `tailwind.config.js`:

```javascript
module.exports = {
  content: ['./src/**/*.{js,jsx,ts,tsx}'],
  theme: {
    extend: {
      colors: {
        'inventory-warning': '#f59e0b',
        'inventory-danger': '#ef4444',
        'inventory-success': '#10b981',
      },
    },
  },
  plugins: [],
}
```

### Material-UI

```bash
# Install MUI (if not already installed)
npm install @mui/material @emotion/react @emotion/styled
npm install @mui/icons-material
```

### Ant Design

```bash
# Install Ant Design (if not already installed)
npm install antd
```

---

## 📊 State Management Setup

### Zustand (Recommended - Lightweight)

```bash
npm install zustand
```

Create store:

```bash
touch src/stores/inventoryStore.ts
```

```typescript
import create from 'zustand'
import { InventoryItemResponse } from '../types/inventory'
import { inventoryApi } from '../services/inventoryApi'

interface InventoryStore {
  items: InventoryItemResponse[]
  loading: boolean
  error: string | null
  fetchItems: () => Promise<void>
  addItem: (item: InventoryItemResponse) => void
  updateItem: (id: number, updates: Partial<InventoryItemResponse>) => void
  deleteItem: (id: number) => void
}

export const useInventoryStore = create<InventoryStore>(set => ({
  items: [],
  loading: false,
  error: null,

  fetchItems: async () => {
    set({ loading: true, error: null })
    try {
      const items = await inventoryApi.listInventoryItems()
      set({ items, loading: false })
    } catch (error) {
      set({ error: error.message, loading: false })
    }
  },

  addItem: item => set(state => ({ items: [...state.items, item] })),

  updateItem: (id, updates) =>
    set(state => ({
      items: state.items.map(item => (item.id === id ? { ...item, ...updates } : item)),
    })),

  deleteItem: id =>
    set(state => ({
      items: state.items.filter(item => item.id !== id),
    })),
}))
```

### Redux Toolkit

```bash
npm install @reduxjs/toolkit react-redux
```

Create slice:

```bash
touch src/store/inventorySlice.ts
```

---

## 🔄 React Query Setup (Recommended for API Caching)

```bash
npm install @tanstack/react-query
```

Setup provider in `src/App.tsx`:

```typescript
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      retry: 1,
      staleTime: 5 * 60 * 1000, // 5 minutes
    },
  },
});

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      {/* Your app */}
    </QueryClientProvider>
  );
}
```

Create hooks:

```bash
touch src/hooks/useInventory.ts
```

```typescript
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { inventoryApi } from '../services/inventoryApi'

export function useInventoryItems(filters = {}) {
  return useQuery({
    queryKey: ['inventory-items', filters],
    queryFn: () => inventoryApi.listInventoryItems(filters),
  })
}

export function useCreateInventoryItem() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: inventoryApi.createInventoryItem,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['inventory-items'] })
    },
  })
}

export function useLowStockAlerts() {
  return useQuery({
    queryKey: ['low-stock-alerts'],
    queryFn: inventoryApi.getLowStockAlerts,
    refetchInterval: 60000, // Refetch every minute
  })
}

export function useInventoryValuation() {
  return useQuery({
    queryKey: ['inventory-valuation'],
    queryFn: inventoryApi.getInventoryValuation,
  })
}
```

Usage in component:

```typescript
import { useInventoryItems, useCreateInventoryItem } from '../hooks/useInventory';

function InventoryList() {
  const { data: items, isLoading, error } = useInventoryItems();
  const createItem = useCreateInventoryItem();

  if (isLoading) return <div>Loading...</div>;
  if (error) return <div>Error: {error.message}</div>;

  return (
    <div>
      {items.map(item => (
        <div key={item.id}>{item.item_name}</div>
      ))}
    </div>
  );
}
```

---

## 🚀 Deployment Commands

### Build for Production

```bash
# Build production bundle
npm run build
# or
yarn build

# Test production build locally
npm run preview
# or
npx serve -s build
```

### Docker (Optional)

Create `Dockerfile`:

```bash
touch Dockerfile
```

```dockerfile
FROM node:18-alpine as build

WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

FROM nginx:alpine
COPY --from=build /app/build /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
```

Build and run:

```bash
docker build -t beyondagri-frontend .
docker run -p 3000:80 beyondagri-frontend
```

---

## 📱 Mobile Commands (React Native)

### Install Dependencies

```bash
npm install axios @react-navigation/native
npm install react-native-screens react-native-safe-area-context
```

### Create Screens

```bash
mkdir -p src/screens/inventory
touch src/screens/inventory/DashboardScreen.tsx
touch src/screens/inventory/InventoryListScreen.tsx
touch src/screens/inventory/AddItemScreen.tsx
touch src/screens/inventory/AlertsScreen.tsx
```

### Setup Navigation

```bash
touch src/navigation/InventoryNavigator.tsx
```

```typescript
import { createStackNavigator } from '@react-navigation/stack';
import DashboardScreen from '../screens/inventory/DashboardScreen';
import InventoryListScreen from '../screens/inventory/InventoryListScreen';
import AddItemScreen from '../screens/inventory/AddItemScreen';

const Stack = createStackNavigator();

export function InventoryNavigator() {
  return (
    <Stack.Navigator>
      <Stack.Screen name="Dashboard" component={DashboardScreen} />
      <Stack.Screen name="InventoryList" component={InventoryListScreen} />
      <Stack.Screen name="AddItem" component={AddItemScreen} />
    </Stack.Navigator>
  );
}
```

---

## 🔍 Debugging Commands

### Check API Endpoints

```bash
# Check if backend is running
curl http://localhost:8000/api/v1/docs

# Test specific endpoint
curl -H "Authorization: Bearer YOUR_TOKEN" \
     http://localhost:8000/api/v1/inventory/items
```

### Network Debugging

In browser DevTools:

1. Open Network tab
2. Filter by "inventory"
3. Check request headers (Authorization should be present)
4. Check response status and body

### React DevTools

```bash
# Install React DevTools extension for Chrome/Firefox
# Then in your app:
npm install --save-dev @welldone-software/why-did-you-render

# Add to src/wdyr.js:
import React from 'react';

if (process.env.NODE_ENV === 'development') {
  const whyDidYouRender = require('@welldone-software/why-did-you-render');
  whyDidYouRender(React, {
    trackAllPureComponents: true,
  });
}
```

---

## 📚 Documentation Commands

### Generate Component Documentation

```bash
# Install Storybook (optional)
npx sb init

# Create stories
touch src/components/inventory/InventoryCard.stories.tsx
```

### API Documentation

```bash
# Generate TypeScript docs
npm install --save-dev typedoc
npx typedoc --out docs src/services/inventoryApi.ts
```

---

## ✅ Verification Checklist Commands

```bash
# Run these to verify your setup

# 1. Check TypeScript compilation
npx tsc --noEmit

# 2. Run linter
npm run lint

# 3. Run tests (if you have them)
npm test

# 4. Check bundle size
npm run build
du -sh build/

# 5. Test API connectivity
node -e "
  import('./src/services/inventoryApi.js').then(({ inventoryApi }) => {
    inventoryApi.listInventoryItems({ limit: 1 })
      .then(() => console.log('✅ API works'))
      .catch(() => console.log('❌ API failed'));
  });
"
```

---

## 🎯 Quick Implementation Roadmap

### Week 1: Setup & Core

```bash
✅ Day 1-2: Setup types, API client, test connection
✅ Day 3-4: Build inventory dashboard
✅ Day 5: Build inventory list with basic filtering
```

### Week 2: Forms & Management

```bash
✅ Day 1-2: Create/edit inventory item forms
✅ Day 3: Warehouse management
✅ Day 4-5: Low stock and expiry alerts
```

### Week 3: Advanced Features

```bash
✅ Day 1-2: Transaction history viewer
✅ Day 3: Batch tracking
✅ Day 4: Valuation reports with charts
✅ Day 5: Polish, testing, bug fixes
```

---

## 🆘 Troubleshooting Commands

### Clear Cache

```bash
# React
rm -rf node_modules/.cache

# React Native
cd ios && pod install && cd ..
npx react-native start --reset-cache

# Next.js
rm -rf .next
```

### Fix Dependencies

```bash
# Clear and reinstall
rm -rf node_modules package-lock.json
npm install
```

### Check CORS Issues

```bash
# Test API with curl
curl -v -H "Authorization: Bearer TOKEN" \
     -H "Origin: http://localhost:3000" \
     http://localhost:8000/api/v1/inventory/items
```

---

## 📞 Support

If you encounter issues:

1. Check backend API docs: `http://localhost:8000/api/v1/docs`
2. Review full guide: `docs/FRONTEND_INVENTORY_INTEGRATION_GUIDE.md`
3. Check quick start: `docs/FRONTEND_QUICK_START.md`
4. Contact backend team

---

**All commands ready! Start implementing! 🚀**
