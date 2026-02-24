# Database Restructure: Users to Accounts

## Overview

This document outlines the completed restructuring of the authentication and user management system from a single `users` table to a more scalable and maintainable account-based structure.

## What Changed

### 1. Database Structure

**Old Structure:**
- Single `users` table with mixed concerns
- Type-specific fields in one table
- Limited verification system
- Basic audit trail

**New Structure:**
- `accounts` - Core authentication and access
- `user_profiles` - Basic profile information
- `farmer_profiles` - Farmer-specific data
- `business_profiles` - Business-specific data
- `verification_records` - KYC and verification tracking
- `account_activity_logs` - Comprehensive audit trail
- `roles` and `account_roles` - Role-based access control

### 2. Key Benefits

1. **Separation of Concerns**: Authentication logic separated from business logic
2. **Type Safety**: Specific tables for specific user types
3. **Scalability**: Easy to add new user types without schema changes
4. **Enhanced Security**: Better audit trails and verification systems
5. **Role-Based Access**: Flexible permission system
6. **Data Integrity**: Better normalization and relationships

## New Models

### Core Account Model (`Account`)
```python
- cognito_sub: str  # Links to AWS Cognito
- email: str
- account_type: AccountTypeEnum (farmer/wholesaler/admin/market_manager)
- status: AccountStatusEnum (active/suspended/disabled/pending_verification)
- is_verified: bool
- is_active: bool
- last_login_at: datetime
- login_count: int
```

### Profile Models
- **UserProfile**: Basic personal information (name, phone, address)
- **FarmerProfile**: Farm-specific data (farm_name, location, size, certifications)
- **BusinessProfile**: Business data (business_name, license, categories, capacity)

### Verification System
- **VerificationRecord**: KYC and document verification tracking
- **VerificationTypeEnum**: identity, business, farm, address, phone, email
- **VerificationStatusEnum**: pending, under_review, approved, rejected, expired

### Audit and Security
- **AccountActivityLog**: Comprehensive activity tracking
- **Role**: Define permissions and access levels
- **AccountRole**: Many-to-many relationship for role assignments

## Migration Strategy

### Phase 1: Structure Creation ✅
- Created all new models and relationships
- Generated migration scripts
- Maintained backward compatibility

### Phase 2: Data Migration ✅
- Migrated existing user data to new structure
- Created default roles (farmer, wholesaler, admin, market_manager)
- Transferred profile information to appropriate tables
- Preserved existing verification data

### Phase 3: Service Layer ✅
- Created `AccountService` for account management
- Updated `AuthServiceV2` for enhanced authentication
- Added support for activity logging and verification

### Phase 4: API Layer ✅
- Created new `/auth/v2/` endpoints with enhanced features
- Added `/accounts/` endpoints for profile management
- Implemented role-based access control
- Added verification and activity tracking endpoints

## New API Endpoints

### Authentication (v2)
- `POST /auth/v2/register` - Enhanced registration with profiles
- `POST /auth/v2/login` - Login with activity tracking
- `GET /auth/v2/me` - Get account with all profiles

### Account Management
- `GET /accounts/profile` - Get complete account profile
- `PUT /accounts/profile` - Update profile information
- `POST /accounts/verification/submit` - Submit verification documents
- `GET /accounts/verification/status` - Check verification status
- `GET /accounts/roles` - Get assigned roles
- `GET /accounts/permissions` - Get effective permissions
- `GET /accounts/activity` - Get activity log
- `DELETE /accounts/deactivate` - Deactivate account

## Usage Examples

### Registration with Enhanced Profiles
```python
# Farmer registration
farmer_data = {
    "email": "farmer@example.com",
    "password": "SecurePass123!",
    "user_type": "farmer",
    "name": "John Farmer",
    "farm_name": "Green Acres",
    "farm_location": "Western Cape",
    "farm_size": "10 hectares"
}
```

### Profile Management
```python
# Update farmer profile
update_data = {
    "name": "John Updated Farmer",
    "farm_name": "Green Acres Organic",
    "phone_number": "+27987654321"
}
```

### Verification Submission
```python
verification_data = {
    "verification_type": "identity",
    "documents": {
        "id_document_url": "https://s3.bucket.com/docs/id123.pdf",
        "document_type": "national_id"
    },
    "metadata": {
        "document_number": "8001015009087"
    }
}
```

## Configuration

### Environment Variables
All existing environment variables remain the same:
- `AUTH_USER_POOL_ID`
- `AUTH_CLIENT_ID`
- `AUTH_REGION`
- `AWS_ACCESS_KEY_ID`
- `AWS_SECRET_ACCESS_KEY`

### Database Migration
To apply the new structure:
```bash
# Apply migrations (when using Alembic)
alembic upgrade head

# Or run the migration files directly:
# 1. 2025_restructure_to_accounts.py
# 2. 2025_migrate_user_data.py
```

## Backward Compatibility

The old `users` table and related endpoints remain functional during the transition period. The system supports both:

1. **Legacy endpoints**: `/auth/` (using old user structure)
2. **New endpoints**: `/auth/v2/` and `/accounts/` (using new account structure)

## Security Enhancements

1. **Enhanced Activity Logging**: All account activities are tracked with IP addresses and user agents
2. **Verification System**: Structured KYC and document verification process
3. **Role-Based Access**: Granular permission control
4. **Account Status Management**: Better control over account access

## Performance Considerations

1. **Optimized Queries**: Proper indexing on foreign keys and lookup fields
2. **Lazy Loading**: Profiles loaded only when needed
3. **Caching Ready**: Structure supports Redis caching for frequently accessed data

## Future Enhancements

1. **Token Blacklisting**: For secure logout functionality
2. **Multi-Factor Authentication**: Easy to integrate with new structure
3. **Advanced Permissions**: More granular permission system
4. **Account Linking**: Support for multiple authentication providers
5. **Data Anonymization**: Better support for GDPR compliance

## Testing

The new structure includes comprehensive test coverage for:
- Account creation and management
- Profile updates
- Verification workflows
- Role and permission checks
- Activity logging
- API endpoint functionality

## Conclusion

This restructure provides a solid foundation for scaling the BeyondAgri platform with:
- Better separation of concerns
- Enhanced security and audit capabilities
- Flexible user type management
- Comprehensive verification system
- Role-based access control

The new structure is production-ready and maintains full backward compatibility during the transition period.