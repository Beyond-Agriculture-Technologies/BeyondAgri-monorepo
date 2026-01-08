"""Authentication and Cognito-related constants."""


class CognitoAttributes:
    """AWS Cognito user attribute names."""
    EMAIL = 'email'
    PHONE_NUMBER = 'phone_number'
    NAME = 'name'
    ADDRESS = 'address'
    ZONEINFO = 'zoneinfo'
    PROFILE = 'profile'
    SUB = 'sub'
    GIVEN_NAME = 'given_name'
    FAMILY_NAME = 'family_name'
    MIDDLE_NAME = 'middle_name'
    NICKNAME = 'nickname'
    GENDER = 'gender'
    BIRTHDATE = 'birthdate'
    LOCALE = 'locale'
    WEBSITE = 'website'
    PICTURE = 'picture'


class Defaults:
    """Default values used across authentication."""
    TIMEZONE = 'Africa/Johannesburg'
    ACCOUNT_TYPE = 'farmer'
    UNKNOWN_TYPE = 'unknown'
    ADDRESS_PLACEHOLDER = 'N/A'


class OTPConfig:
    """OTP-related configuration."""
    EXPIRY_MINUTES = 3  # Cognito OTPs expire in 3 minutes
    CODE_LENGTH = 6


class AccountTypes:
    """Valid account types."""
    FARMER = 'farmer'
    WHOLESALER = 'wholesaler'
    ADMIN = 'admin'

    # Standard Cognito attributes that can be passed during registration
    ALLOWED_STANDARD_ATTRIBUTES = frozenset([
        'given_name', 'family_name', 'middle_name', 'nickname',
        'gender', 'birthdate', 'locale', 'website', 'picture'
    ])
