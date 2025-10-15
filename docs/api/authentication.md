# Authentication API

## Overview

BeyondAgri uses AWS Cognito for authentication with JWT (JSON Web Tokens) for secure API access. All endpoints except authentication-related ones require a valid JWT token.

**Base Path:** `/api/v1/auth`

## Authentication Flow

```
1. Register → Create account (email + password)
2. Login → Receive JWT tokens (access, ID, refresh)
3. Use Access Token → Include in Authorization header for API requests
4. Token Expires → Use Refresh Token to get new Access Token
```

## Endpoints

### 1. Register New User

Create a new user account.

**Endpoint:** `POST /api/v1/auth/register`

**Authentication:** Not required

**Request Body:**

```json
{
  "email": "farmer@example.com",
  "password": "SecurePassword123!",
  "phone_number": "+27821234567",  // Optional, E.164 format
  "user_type": "farmer",            // "farmer" | "wholesaler" | "admin"
  "name": "John Doe",               // Optional
  "address": "123 Farm Road, Cape Town"  // Optional
}
```

**Field Validations:**
- `email`: Valid email format, unique
- `password`: Minimum 8 characters, must contain:
  - At least one uppercase letter
  - At least one lowercase letter
  - At least one number
  - At least one special character
- `phone_number`: Optional, E.164 format (e.g., +27821234567)
- `user_type`: One of: "farmer", "wholesaler", "admin" (default: "farmer")

**Success Response (201 Created):**

```json
{
  "message": "Account registered successfully",
  "data": null
}
```

**Error Responses:**

```json
// 409 Conflict - User already exists
{
  "detail": "An account with the given email already exists."
}

// 400 Bad Request - Invalid password
{
  "detail": "Password must be at least 8 characters long and contain uppercase, lowercase, number, and special character"
}

// 422 Unprocessable Entity - Validation error
{
  "detail": [
    {
      "loc": ["body", "email"],
      "msg": "value is not a valid email address",
      "type": "value_error.email"
    }
  ]
}
```

**cURL Example:**

```bash
curl -X POST "http://localhost:8000/api/v1/auth/register" \
  -H "Content-Type: application/json" \
  -d '{
    "email": "farmer@example.com",
    "password": "SecurePass123!",
    "phone_number": "+27821234567",
    "user_type": "farmer",
    "name": "John Doe"
  }'
```

**JavaScript Example:**

```javascript
const register = async (userData) => {
  const response = await fetch('http://localhost:8000/api/v1/auth/register', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      email: userData.email,
      password: userData.password,
      phone_number: userData.phoneNumber,
      user_type: 'farmer',
      name: userData.name
    })
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.detail);
  }

  return await response.json();
};
```

---

### 2. Login

Authenticate a user and receive JWT tokens.

**Endpoint:** `POST /api/v1/auth/login`

**Authentication:** Not required

**Request Body:**

```json
{
  "username": "farmer@example.com",  // Email address
  "password": "SecurePassword123!"
}
```

**Success Response (200 OK):**

```json
{
  "message": "Login successful",
  "data": {
    "access_token": "eyJraWQiOiJxxx...",
    "id_token": "eyJraWQiOiJCxxx...",
    "refresh_token": "eyJjdHkiOiJKxxx...",
    "user": {
      "user_id": 123,
      "user_sub": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
      "email": "farmer@example.com",
      "user_type": "farmer",
      "phone_number": "+27821234567",
      "status": "CONFIRMED"
    }
  }
}
```

**Token Details:**
- **access_token**: Use this for API authentication (expires in 1 hour)
- **id_token**: Contains user identity information
- **refresh_token**: Use to get new access tokens (expires in 30 days)

**Error Responses:**

```json
// 401 Unauthorized - Invalid credentials
{
  "detail": "Incorrect username or password."
}

// 404 Not Found - User doesn't exist
{
  "detail": "User not found"
}
```

**cURL Example:**

```bash
curl -X POST "http://localhost:8000/api/v1/auth/login" \
  -H "Content-Type: application/json" \
  -d '{
    "username": "farmer@example.com",
    "password": "SecurePass123!"
  }'
```

**JavaScript Example:**

```javascript
const login = async (email, password) => {
  const response = await fetch('http://localhost:8000/api/v1/auth/login', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      username: email,
      password: password
    })
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.detail);
  }

  const data = await response.json();

  // Store tokens
  localStorage.setItem('access_token', data.data.access_token);
  localStorage.setItem('refresh_token', data.data.refresh_token);
  localStorage.setItem('user', JSON.stringify(data.data.user));

  return data.data;
};
```

---

### 3. Request Password Reset

Initiate the password reset process.

**Endpoint:** `POST /api/v1/auth/password-reset`

**Authentication:** Not required

**Request Body:**

```json
{
  "email": "farmer@example.com"
}
```

**Success Response (200 OK):**

```json
{
  "delivery_medium": "EMAIL",
  "destination": "f***@example.com",
  "message": "Password reset code sent successfully"
}
```

**Error Responses:**

```json
// 404 Not Found
{
  "detail": "User not found"
}
```

**cURL Example:**

```bash
curl -X POST "http://localhost:8000/api/v1/auth/password-reset" \
  -H "Content-Type: application/json" \
  -d '{
    "email": "farmer@example.com"
  }'
```

---

### 4. Confirm Password Reset

Complete the password reset with the verification code.

**Endpoint:** `POST /api/v1/auth/confirm-password-reset`

**Authentication:** Not required

**Request Body:**

```json
{
  "email": "farmer@example.com",
  "confirmation_code": "123456",
  "new_password": "NewSecurePass123!"
}
```

**Success Response (200 OK):**

```json
{
  "message": "Password reset successful",
  "data": null
}
```

**Error Responses:**

```json
// 400 Bad Request - Invalid code
{
  "detail": "Invalid verification code provided"
}
```

---

## Using JWT Tokens

### Including Token in Requests

All authenticated endpoints require the `Authorization` header:

```http
Authorization: Bearer {access_token}
```

**Example Request:**

```bash
curl -X GET "http://localhost:8000/api/v1/inventory/items" \
  -H "Authorization: Bearer eyJraWQiOiJxxx..."
```

**JavaScript with Axios:**

```javascript
import axios from 'axios';

const api = axios.create({
  baseURL: 'http://localhost:8000/api/v1'
});

// Automatically add token to all requests
api.interceptors.request.use(config => {
  const token = localStorage.getItem('access_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Use the API
const getInventory = async () => {
  const response = await api.get('/inventory/items');
  return response.data;
};
```

### Token Expiration

**Access Token:** Expires in 1 hour
**Refresh Token:** Expires in 30 days

When the access token expires (401 Unauthorized), use the refresh token to get a new one.

### Handling Token Expiration

```javascript
api.interceptors.response.use(
  response => response,
  async error => {
    const originalRequest = error.config;

    // If 401 and haven't retried yet
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;

      try {
        // Refresh the token
        const refreshToken = localStorage.getItem('refresh_token');
        const response = await axios.post(
          'http://localhost:8000/api/v1/auth/refresh',
          { refresh_token: refreshToken }
        );

        const { access_token } = response.data;
        localStorage.setItem('access_token', access_token);

        // Retry original request with new token
        originalRequest.headers.Authorization = `Bearer ${access_token}`;
        return api(originalRequest);
      } catch (refreshError) {
        // Refresh failed, redirect to login
        localStorage.clear();
        window.location.href = '/login';
        return Promise.reject(refreshError);
      }
    }

    return Promise.reject(error);
  }
);
```

## JWT Token Structure

The access token is a JWT with the following structure:

**Header:**
```json
{
  "alg": "RS256",
  "typ": "JWT"
}
```

**Payload:**
```json
{
  "sub": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
  "email": "farmer@example.com",
  "cognito:username": "farmer@example.com",
  "custom:account_type": "farmer",
  "exp": 1696954800,
  "iat": 1696951200
}
```

**Claims:**
- `sub`: User's unique identifier (Cognito user sub)
- `email`: User's email address
- `custom:account_type`: Account type (farmer, wholesaler, admin)
- `exp`: Expiration timestamp (Unix)
- `iat`: Issued at timestamp (Unix)

## Account Types & Permissions

| Account Type | Description | Default Permissions |
|--------------|-------------|---------------------|
| **farmer** | Individual farmers | Manage own inventory, create products |
| **wholesaler** | Bulk buyers/sellers | Advanced inventory, bulk orders |
| **admin** | System administrators | Full system access |

## Security Best Practices

### For Frontend Developers

1. **Never store passwords** - Only store tokens
2. **Use httpOnly cookies** for tokens if possible (more secure than localStorage)
3. **Clear tokens on logout**:
   ```javascript
   const logout = () => {
     localStorage.removeItem('access_token');
     localStorage.removeItem('refresh_token');
     localStorage.removeItem('user');
     window.location.href = '/login';
   };
   ```
4. **Validate tokens client-side** before API calls
5. **Handle 401 errors** gracefully with automatic re-authentication
6. **Use HTTPS** in production
7. **Implement token refresh** before expiration

### Password Requirements

Enforce on the frontend:
- Minimum 8 characters
- At least one uppercase letter (A-Z)
- At least one lowercase letter (a-z)
- At least one number (0-9)
- At least one special character (!@#$%^&*)

### Example Password Validation

```javascript
const validatePassword = (password) => {
  const minLength = password.length >= 8;
  const hasUppercase = /[A-Z]/.test(password);
  const hasLowercase = /[a-z]/.test(password);
  const hasNumber = /\d/.test(password);
  const hasSpecial = /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password);

  return {
    isValid: minLength && hasUppercase && hasLowercase && hasNumber && hasSpecial,
    errors: {
      minLength: !minLength ? 'Password must be at least 8 characters' : null,
      hasUppercase: !hasUppercase ? 'Must contain an uppercase letter' : null,
      hasLowercase: !hasLowercase ? 'Must contain a lowercase letter' : null,
      hasNumber: !hasNumber ? 'Must contain a number' : null,
      hasSpecial: !hasSpecial ? 'Must contain a special character' : null
    }
  };
};
```

## Common Error Scenarios

| Error Code | Scenario | Solution |
|------------|----------|----------|
| 401 | Token expired | Refresh token or re-login |
| 401 | Invalid token | Clear local storage, redirect to login |
| 401 | Missing token | Redirect to login |
| 403 | Insufficient permissions | Show "access denied" message |
| 409 | Email already exists | Prompt user to login instead |
| 422 | Validation errors | Show field-level error messages |

## Testing Authentication

### Using cURL

```bash
# 1. Register
curl -X POST "http://localhost:8000/api/v1/auth/register" \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"TestPass123!","user_type":"farmer"}'

# 2. Login and save token
TOKEN=$(curl -X POST "http://localhost:8000/api/v1/auth/login" \
  -H "Content-Type: application/json" \
  -d '{"username":"test@example.com","password":"TestPass123!"}' \
  | jq -r '.data.access_token')

# 3. Use token for authenticated request
curl -X GET "http://localhost:8000/api/v1/inventory/items" \
  -H "Authorization: Bearer $TOKEN"
```

### Using Postman

1. Create environment variable `access_token`
2. In login request, add test script:
   ```javascript
   pm.environment.set("access_token", pm.response.json().data.access_token);
   ```
3. In other requests, use: `{{access_token}}` in Authorization header

---

**Next:** [Account Management](./accounts.md) | [Inventory API](./inventory/overview.md)
