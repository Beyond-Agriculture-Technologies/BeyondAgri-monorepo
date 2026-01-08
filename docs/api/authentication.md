# Authentication API

## Overview

BeyondAgri uses AWS Cognito for authentication with JWT (JSON Web Tokens) for secure API access. All endpoints except authentication-related ones require a valid JWT token.

**Base Path:** `/api/v1/auth`

## Authentication Flow

```
1. Register → Initiate account creation (email + password + phone)
2. Confirm Registration → Verify SMS code to complete account creation
3. Login → Receive JWT tokens (access, ID, refresh)
4. Use Access Token → Include in Authorization header for API requests
5. Token Expires → Use Refresh Token to get new Access Token
```

## Endpoints

### 1. Register New User

Initiate user registration with phone verification. A 6-digit verification code will be sent via SMS.

**Endpoint:** `POST /api/v1/auth/register`

**Authentication:** Not required

**Request Body:**

```json
{
  "email": "farmer@example.com",
  "password": "SecurePassword123!",
  "phone_number": "+27821234567",   // Required, E.164 or SA format
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
- `phone_number`: Required, E.164 format (+27821234567) or SA format (0821234567)
- `user_type`: One of: "farmer", "wholesaler", "admin" (default: "farmer")

**Success Response (202 Accepted):**

```json
{
  "user_sub": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
  "code_delivery_medium": "SMS",
  "code_delivery_destination": "+27***4567",
  "message": "Verification code sent to your phone. Please confirm to complete registration."
}
```

**Note:** After receiving this response, the user must call `/confirm-registration` with the verification code to complete registration.

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

### 1b. Confirm Registration

Complete user registration by verifying the SMS code.

**Endpoint:** `POST /api/v1/auth/confirm-registration`

**Authentication:** Not required

**Request Body:**

```json
{
  "email": "farmer@example.com",
  "confirmation_code": "123456"
}
```

**Success Response (200 OK):**

```json
{
  "message": "Registration completed. You can now log in.",
  "data": null
}
```

**Error Responses:**

```json
// 400 Bad Request - Invalid code
{
  "detail": "Invalid verification code"
}

// 400 Bad Request - Code expired
{
  "detail": "Verification code expired. Please request a new code or register again."
}
```

**cURL Example:**

```bash
curl -X POST "http://localhost:8000/api/v1/auth/confirm-registration" \
  -H "Content-Type: application/json" \
  -d '{
    "email": "farmer@example.com",
    "confirmation_code": "123456"
  }'
```

---

### 1c. Resend Confirmation Code

Resend the registration verification code if it expired or wasn't received.

**Endpoint:** `POST /api/v1/auth/resend-confirmation`

**Authentication:** Not required

**Query Parameter:**
- `email`: Email address used during registration

**Success Response (200 OK):**

```json
{
  "user_sub": "",
  "code_delivery_medium": "SMS",
  "code_delivery_destination": "+27***4567",
  "message": "Verification code resent to your phone"
}
```

**Error Responses:**

```json
// 404 Not Found - User not found
{
  "detail": "User not found. Please register first."
}

// 429 Too Many Requests - Rate limit
{
  "detail": "Too many requests. Please wait before requesting another code."
}
```

**cURL Example:**

```bash
curl -X POST "http://localhost:8000/api/v1/auth/resend-confirmation?email=farmer@example.com"
```

---

### 2. Login

Authenticate a user with email or phone number and receive JWT tokens.

**Endpoint:** `POST /api/v1/auth/login`

**Authentication:** Not required

**Request Body:**

```json
{
  "username": "farmer@example.com",  // Email OR phone number
  "password": "SecurePassword123!"
}
```

**Username Formats Accepted:**
- **Email**: `farmer@example.com`
- **Phone (E.164)**: `+27821234567`
- **Phone (SA format)**: `0821234567`

**Important:** Phone number must be verified before it can be used for login.

**Request Examples:**

```json
// Login with email
{
  "username": "farmer@example.com",
  "password": "SecurePassword123!"
}

// Login with E.164 phone
{
  "username": "+27821234567",
  "password": "SecurePassword123!"
}

// Login with SA format phone
{
  "username": "0821234567",
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
  "detail": "Invalid username or password"
}

// 401 Unauthorized - Unverified phone
{
  "detail": "Please verify your phone number before logging in"
}

// 404 Not Found - User doesn't exist
{
  "detail": "No account found. Please check your credentials or register."
}

// 400 Bad Request - Invalid format
{
  "detail": "Username must be a valid email address or phone number. Phone formats: +27XXXXXXXXX (international) or 0XXXXXXXXX (South African)"
}
```

**cURL Examples:**

```bash
# Login with email
curl -X POST "http://localhost:8000/api/v1/auth/login" \
  -H "Content-Type: application/json" \
  -d '{
    "username": "farmer@example.com",
    "password": "SecurePass123!"
  }'

# Login with phone (E.164)
curl -X POST "http://localhost:8000/api/v1/auth/login" \
  -H "Content-Type: application/json" \
  -d '{
    "username": "+27821234567",
    "password": "SecurePass123!"
  }'

# Login with phone (SA format)
curl -X POST "http://localhost:8000/api/v1/auth/login" \
  -H "Content-Type: application/json" \
  -d '{
    "username": "0821234567",
    "password": "SecurePass123!"
  }'
```

**JavaScript Example:**

```javascript
const login = async (username, password) => {
  // username can be email OR phone number
  const response = await fetch('http://localhost:8000/api/v1/auth/login', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      username: username,  // Email: "farmer@example.com" OR Phone: "+27821234567" or "0821234567"
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

// Example usage
await login('farmer@example.com', 'SecurePass123!');  // Email login
await login('+27821234567', 'SecurePass123!');        // Phone login (E.164)
await login('0821234567', 'SecurePass123!');          // Phone login (SA format)
```

---

### 3. Request Password Reset

Initiate the password reset process with email or phone number.

**Endpoint:** `POST /api/v1/auth/password-reset`

**Authentication:** Not required

**Request Body:**

```json
{
  "email": "farmer@example.com"  // Email OR phone number
}
```

**Email/Phone Formats Accepted:**
- **Email**: `farmer@example.com`
- **Phone (E.164)**: `+27821234567`
- **Phone (SA format)**: `0821234567`

**Important:** Phone number must be verified before it can be used for password reset.

**Request Examples:**

```json
// Password reset with email
{
  "email": "farmer@example.com"
}

// Password reset with E.164 phone
{
  "email": "+27821234567"
}

// Password reset with SA format phone
{
  "email": "0821234567"
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
// 404 Not Found - User doesn't exist
{
  "detail": "No account found. Please check your credentials or register."
}

// 400 Bad Request - Unverified phone
{
  "detail": "Please verify your phone number before resetting password"
}

// 400 Bad Request - Invalid format
{
  "detail": "Must be a valid email address or phone number. Phone formats: +27XXXXXXXXX (international) or 0XXXXXXXXX (South African)"
}
```

**cURL Examples:**

```bash
# Password reset with email
curl -X POST "http://localhost:8000/api/v1/auth/password-reset" \
  -H "Content-Type: application/json" \
  -d '{
    "email": "farmer@example.com"
  }'

# Password reset with phone (E.164)
curl -X POST "http://localhost:8000/api/v1/auth/password-reset" \
  -H "Content-Type: application/json" \
  -d '{
    "email": "+27821234567"
  }'

# Password reset with phone (SA format)
curl -X POST "http://localhost:8000/api/v1/auth/password-reset" \
  -H "Content-Type: application/json" \
  -d '{
    "email": "0821234567"
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
  "email": "farmer@example.com",  // Email OR phone number (same as used to request reset)
  "confirmation_code": "123456",
  "new_password": "NewSecurePass123!"
}
```

**Email/Phone Formats Accepted:**
- **Email**: `farmer@example.com`
- **Phone (E.164)**: `+27821234567`
- **Phone (SA format)**: `0821234567`

**Important:** Use the same identifier (email or phone) that you used to request the password reset.

**Request Examples:**

```json
// Confirm with email
{
  "email": "farmer@example.com",
  "confirmation_code": "123456",
  "new_password": "NewSecurePass123!"
}

// Confirm with E.164 phone
{
  "email": "+27821234567",
  "confirmation_code": "123456",
  "new_password": "NewSecurePass123!"
}

// Confirm with SA format phone
{
  "email": "0821234567",
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

### 5. Send OTP for Phone Verification

Send a verification code to the authenticated user's phone number via AWS Cognito.

**Endpoint:** `POST /api/v1/auth/send-otp`

**Authentication:** Required (JWT access token)

**Request Body:** None required - phone number is extracted from the authenticated user's Cognito profile.

**Success Response (200 OK):**

```json
{
  "status": "success",
  "message": "Verification code sent successfully",
  "delivery_medium": "SMS",
  "destination": "+27***4567",
  "expires_in_minutes": 3
}
```

**Error Responses:**

```json
// 400 Bad Request - Phone not set
{
  "detail": "Phone number not set for this account"
}

// 429 Too Many Requests - Rate limit
{
  "detail": "Too many OTP requests. Please wait before requesting another code."
}

// 500 Internal Server Error
{
  "detail": "Failed to send verification code. Please try again later."
}
```

**cURL Example:**

```bash
curl -X POST "http://localhost:8000/api/v1/auth/send-otp" \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"
```

**JavaScript Example:**

```javascript
const sendOTP = async (accessToken) => {
  const response = await fetch('http://localhost:8000/api/v1/auth/send-otp', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${accessToken}`
    }
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.detail);
  }

  const data = await response.json();
  console.log(`OTP sent to ${data.destination}, expires in ${data.expires_in_minutes} minutes`);

  return data;
};
```

---

### 6. Verify OTP

Verify the OTP code received via SMS for the authenticated user.

**Endpoint:** `POST /api/v1/auth/verify-otp`

**Authentication:** Required (JWT access token)

**Request Body:**

```json
{
  "otp_code": "123456"
}
```

**Note:** Phone number is extracted from the authenticated user's Cognito profile - only the OTP code is required.

**Success Response (200 OK):**

```json
{
  "status": "success",
  "message": "Phone number verified successfully",
  "phone_number": "+27***4567",
  "account_found": true,
  "account": {
    "email": "farmer@example.com",
    "account_type": "farmer",
    "phone_verified": true,
    "phone_verified_at": "2025-12-05T10:30:00Z"
  }
}
```

**Error Responses:**

```json
// 400 Bad Request - OTP expired
{
  "detail": "Verification code has expired. Please request a new one."
}

// 401 Unauthorized - Invalid OTP
{
  "detail": "Invalid verification code"
}

// 429 Too Many Requests - Too many attempts
{
  "detail": "Too many attempts. Please request a new code."
}

// 500 Internal Server Error
{
  "detail": "Failed to verify code. Please try again later."
}
```

**cURL Example:**

```bash
curl -X POST "http://localhost:8000/api/v1/auth/verify-otp" \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "otp_code": "123456"
  }'
```

**JavaScript Example:**

```javascript
const verifyOTP = async (accessToken, otpCode) => {
  const response = await fetch('http://localhost:8000/api/v1/auth/verify-otp', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      otp_code: otpCode
    })
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.detail);
  }

  const data = await response.json();

  if (data.account_found) {
    console.log(`Phone verified for ${data.account.email}`);
  }

  return data;
};
```

---

### 7. Resend OTP

Resend a new OTP code (invalidates any previous code).

**Endpoint:** `POST /api/v1/auth/resend-otp`

**Authentication:** Required (JWT access token)

**Request Body:** None required - phone number is extracted from the authenticated user's Cognito profile.

**Success Response (200 OK):**

Same as Send OTP response.

**cURL Example:**

```bash
curl -X POST "http://localhost:8000/api/v1/auth/resend-otp" \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"
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
