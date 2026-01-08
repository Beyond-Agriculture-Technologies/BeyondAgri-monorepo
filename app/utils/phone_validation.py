import re
from typing import Optional, Literal, Tuple


def detect_login_identifier_type(identifier: str) -> Tuple[Literal["email", "phone", "unknown"], Optional[str]]:
    """
    Detect if the login identifier is an email or phone number.

    Args:
        identifier: User input (email or phone)

    Returns:
        Tuple of (identifier_type, normalized_value):
        - ("email", "user@example.com") for valid email
        - ("phone", "+27821234567") for valid phone (returns normalized E.164 format)
        - ("unknown", None) if neither valid email nor phone
    """
    if not identifier or not identifier.strip():
        return ("unknown", None)

    identifier = identifier.strip()

    # Check if it's an email (basic pattern matching)
    # Pattern: something@something.domain
    email_pattern = r'^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$'
    if re.match(email_pattern, identifier):
        return ("email", identifier)

    # Check if it could be a phone number
    # Remove common formatting characters
    cleaned = re.sub(r'[\s\-\(\)\.]', '', identifier)

    # Check for phone patterns:
    # - Starts with + (international)
    # - Starts with 0 (South African local)
    # - Just digits (might be phone without formatting)
    if cleaned.startswith('+') or cleaned.startswith('0') or cleaned.isdigit():
        # Validate and normalize
        try:
            normalized = normalize_phone_number(identifier)
            return ("phone", normalized)
        except ValueError:
            pass

    return ("unknown", None)


def normalize_phone_number(phone: str) -> str:
    """
    Normalize phone number to E.164 format for AWS Cognito.

    Args:
        phone: Phone number in various formats

    Returns:
        Phone number in E.164 format (+country_code followed by number)

    Raises:
        ValueError: If phone number format is invalid
    """
    if not phone:
        raise ValueError("Phone number is required")

    # Remove all spaces, dashes, parentheses, and other formatting
    cleaned = re.sub(r'[\s\-\(\)\.]', '', phone.strip())

    # If already in E.164 format (starts with +), validate and return
    if cleaned.startswith('+'):
        if not re.match(r'^\+[1-9]\d{7,14}$', cleaned):  # 8-15 digits total (country code + number)
            raise ValueError("Invalid international phone number format. Use format: +27123456789")
        return cleaned

    # Handle South African numbers (most common for this platform)
    if cleaned.startswith('0'):
        # Convert local SA format (0XX) to international (+27XX)
        if len(cleaned) == 10:  # Standard SA mobile: 0123456789
            sa_number = '+27' + cleaned[1:]
            if not re.match(r'^\+27[1-9]\d{8}$', sa_number):
                raise ValueError("Invalid South African phone number format")
            return sa_number
        else:
            raise ValueError("South African phone numbers should be 10 digits starting with 0")

    # Handle numbers that might be missing country code
    if cleaned.isdigit() and len(cleaned) == 9:
        # Assume South African number without leading 0
        sa_number = '+27' + cleaned
        if not re.match(r'^\+27[1-9]\d{8}$', sa_number):
            raise ValueError("Invalid phone number format")
        return sa_number

    # If none of the above patterns match
    raise ValueError(
        "Invalid phone number format. Please use one of these formats:\n"
        "- International: +27123456789\n"
        "- South African: 0123456789"
    )


def validate_phone_number(phone: str) -> bool:
    """
    Validate if phone number can be normalized to E.164 format.

    Args:
        phone: Phone number to validate

    Returns:
        True if valid, False otherwise
    """
    try:
        normalize_phone_number(phone)
        return True
    except ValueError:
        return False


def get_phone_validation_error(phone: str) -> Optional[str]:
    """
    Get specific validation error message for phone number.

    Args:
        phone: Phone number to validate

    Returns:
        Error message if invalid, None if valid
    """
    try:
        normalize_phone_number(phone)
        return None
    except ValueError as e:
        return str(e)