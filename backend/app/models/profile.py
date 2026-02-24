from sqlalchemy import Column, String, Text, Integer, ForeignKey, DateTime, Numeric, Enum
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import relationship
import enum

from app.db.base import BaseModel


class LandUnitEnum(str, enum.Enum):
    HECTARES = "hectares"
    ACRES = "acres"
    SQUARE_METERS = "square_meters"


class UserProfile(BaseModel):
    """
    General user profile information applicable to all account types.
    """
    __tablename__ = "user_profiles"

    account_id = Column(Integer, ForeignKey("accounts.id"), nullable=False, unique=True)

    # Basic personal information
    name = Column(String(255), nullable=True)
    phone_number = Column(String(20), nullable=True)
    address = Column(Text, nullable=True)

    # Extended profile data (stored as JSON for flexibility)
    profile_metadata = Column(JSONB, nullable=True)

    # Relationships
    account = relationship("Account", back_populates="profile")

    def __repr__(self):
        return f"<UserProfile(account_id={self.account_id}, name='{self.name}')>"


class FarmerProfile(BaseModel):
    """
    Farmer-specific profile information.
    """
    __tablename__ = "farmer_profiles"

    account_id = Column(Integer, ForeignKey("accounts.id"), nullable=False, unique=True)

    # Farm information
    farm_name = Column(String(255), nullable=True)
    farm_location = Column(String(255), nullable=True)
    farm_size = Column(String(100), nullable=True)  # e.g., "10 hectares" (kept for backward compatibility)

    # Enhanced farm details
    total_land_area = Column(Numeric(10, 2), nullable=True)  # Numeric area
    land_unit = Column(Enum(LandUnitEnum), default=LandUnitEnum.HECTARES, nullable=True)
    farm_coordinates = Column(String(255), nullable=True)  # GPS coordinates as "lat,long" (e.g., "-25.7479,28.2293")
    farm_registration_number = Column(String(100), nullable=True)  # Official farm registration

    # Structured address fields (from Google Maps Geocoding)
    farm_address = Column(String(500), nullable=True)  # Full formatted address
    farm_street = Column(String(255), nullable=True)
    farm_city = Column(String(100), nullable=True)
    farm_province = Column(String(100), nullable=True)
    farm_postal_code = Column(String(20), nullable=True)
    farm_country = Column(String(100), default="South Africa", nullable=True)
    farm_latitude = Column(Numeric(10, 7), nullable=True)
    farm_longitude = Column(Numeric(10, 7), nullable=True)
    farm_place_id = Column(String(255), nullable=True)  # Google Place ID
    farm_elevation = Column(Numeric(8, 2), nullable=True)  # Meters above sea level

    # Farming details (stored as JSON for flexibility)
    certifications = Column(JSONB, nullable=True)  # Organic, Fair Trade, etc.
    crop_types = Column(JSONB, nullable=True)  # What they grow
    farming_methods = Column(JSONB, nullable=True)  # Organic, conventional, etc.
    equipment = Column(JSONB, nullable=True)  # Available equipment

    # Relationships
    account = relationship("Account", back_populates="farmer_profile")

    def __repr__(self):
        return f"<FarmerProfile(account_id={self.account_id}, farm_name='{self.farm_name}')>"


class BusinessProfile(BaseModel):
    """
    Business profile information for wholesalers and other business entities.
    """
    __tablename__ = "business_profiles"

    account_id = Column(Integer, ForeignKey("accounts.id"), nullable=False, unique=True)

    # Business information
    business_name = Column(String(255), nullable=False)
    business_license = Column(String(255), nullable=True)
    business_address = Column(Text, nullable=True)
    business_type = Column(String(100), nullable=True)  # Wholesaler, Distributor, etc.

    # Structured address fields (from Google Maps Geocoding)
    business_street = Column(String(255), nullable=True)
    business_city = Column(String(100), nullable=True)
    business_province = Column(String(100), nullable=True)
    business_postal_code = Column(String(20), nullable=True)
    business_country = Column(String(100), default="South Africa", nullable=True)
    business_latitude = Column(Numeric(10, 7), nullable=True)
    business_longitude = Column(Numeric(10, 7), nullable=True)
    business_place_id = Column(String(255), nullable=True)  # Google Place ID

    # Business details (stored as JSON for flexibility)
    verification_documents = Column(JSONB, nullable=True)
    business_categories = Column(JSONB, nullable=True)  # What products they deal with
    service_areas = Column(JSONB, nullable=True)  # Geographic areas served
    capacity = Column(JSONB, nullable=True)  # Storage, transport capacity

    # Relationships
    account = relationship("Account", back_populates="business_profile")

    def __repr__(self):
        return f"<BusinessProfile(account_id={self.account_id}, business_name='{self.business_name}')>"