"""
Marketplace service for product listings.

Handles business logic for:
- Farmers: creating and managing product listings
- Wholesalers: browsing and filtering listings
"""
import logging
from typing import List, Optional, Tuple
from datetime import datetime, timezone
from decimal import Decimal
from sqlalchemy.orm import Session, joinedload
from sqlalchemy import and_, or_

from app.models.marketplace import ProductListing, ListingStatusEnum, ProductCategoryEnum
from app.models.profile import FarmerProfile
from app.models.account import Account
from app.schemas.marketplace import (
    ProductListingCreate, ProductListingUpdate,
    ProductListingBrowseResponse, FarmerSummary, MarketplaceFilters
)

logger = logging.getLogger(__name__)


class MarketplaceService:
    """
    Service class for marketplace operations.
    Handles listing management for farmers and browsing for wholesalers.
    """

    # ==================== Farmer Listing Management ====================

    @staticmethod
    def create_listing(
        db: Session,
        listing_data: ProductListingCreate,
        farmer_account_id: int
    ) -> ProductListing:
        """
        Create a new product listing for a farmer.
        Auto-populates location from farmer profile if not provided.
        """
        # Get farmer profile for location info
        farmer_profile = db.query(FarmerProfile).filter(
            FarmerProfile.account_id == farmer_account_id
        ).first()

        listing_dict = listing_data.model_dump(exclude={'publish_immediately'})

        # Auto-fill location from profile if not provided
        if not listing_dict.get('province') and farmer_profile:
            listing_dict['province'] = farmer_profile.farm_location
        if not listing_dict.get('farm_name') and farmer_profile:
            listing_dict['farm_name'] = farmer_profile.farm_name

        # Set status based on publish_immediately flag
        if listing_data.publish_immediately:
            listing_dict['status'] = ListingStatusEnum.ACTIVE
            listing_dict['published_at'] = datetime.now(timezone.utc)
        else:
            listing_dict['status'] = ListingStatusEnum.DRAFT

        listing = ProductListing(
            **listing_dict,
            farmer_account_id=farmer_account_id
        )

        db.add(listing)
        db.commit()
        db.refresh(listing)

        logger.info(f"Created listing id={listing.id} for farmer_account_id={farmer_account_id}")
        return listing

    @staticmethod
    def get_farmer_listings(
        db: Session,
        farmer_account_id: int,
        status: Optional[ListingStatusEnum] = None,
        skip: int = 0,
        limit: int = 100
    ) -> List[ProductListing]:
        """Get all listings for a specific farmer"""
        query = db.query(ProductListing).filter(
            ProductListing.farmer_account_id == farmer_account_id
        )

        if status:
            query = query.filter(ProductListing.status == status)

        return query.order_by(ProductListing.created_at.desc()).offset(skip).limit(limit).all()

    @staticmethod
    def get_listing(
        db: Session,
        listing_id: int,
        farmer_account_id: Optional[int] = None
    ) -> Optional[ProductListing]:
        """
        Get a specific listing.
        If farmer_account_id provided, verifies ownership.
        """
        query = db.query(ProductListing).filter(ProductListing.id == listing_id)

        if farmer_account_id:
            query = query.filter(ProductListing.farmer_account_id == farmer_account_id)

        return query.first()

    @staticmethod
    def update_listing(
        db: Session,
        listing_id: int,
        farmer_account_id: int,
        update_data: ProductListingUpdate
    ) -> Optional[ProductListing]:
        """Update a listing (farmer must own it)"""
        listing = db.query(ProductListing).filter(
            and_(
                ProductListing.id == listing_id,
                ProductListing.farmer_account_id == farmer_account_id
            )
        ).first()

        if not listing:
            return None

        update_dict = update_data.model_dump(exclude_unset=True)

        # Handle status changes
        if 'status' in update_dict and update_dict['status'] == ListingStatusEnum.ACTIVE:
            if listing.status != ListingStatusEnum.ACTIVE:
                listing.published_at = datetime.now(timezone.utc)

        for field, value in update_dict.items():
            setattr(listing, field, value)

        db.commit()
        db.refresh(listing)

        logger.info(f"Updated listing id={listing_id}")
        return listing

    @staticmethod
    def publish_listing(
        db: Session,
        listing_id: int,
        farmer_account_id: int
    ) -> Optional[ProductListing]:
        """Publish a draft listing to the marketplace"""
        listing = db.query(ProductListing).filter(
            and_(
                ProductListing.id == listing_id,
                ProductListing.farmer_account_id == farmer_account_id,
                ProductListing.status == ListingStatusEnum.DRAFT
            )
        ).first()

        if not listing:
            return None

        listing.status = ListingStatusEnum.ACTIVE
        listing.published_at = datetime.now(timezone.utc)

        db.commit()
        db.refresh(listing)

        logger.info(f"Published listing id={listing_id}")
        return listing

    @staticmethod
    def pause_listing(
        db: Session,
        listing_id: int,
        farmer_account_id: int
    ) -> Optional[ProductListing]:
        """Temporarily pause an active listing"""
        listing = db.query(ProductListing).filter(
            and_(
                ProductListing.id == listing_id,
                ProductListing.farmer_account_id == farmer_account_id,
                ProductListing.status == ListingStatusEnum.ACTIVE
            )
        ).first()

        if not listing:
            return None

        listing.status = ListingStatusEnum.PAUSED

        db.commit()
        db.refresh(listing)

        logger.info(f"Paused listing id={listing_id}")
        return listing

    @staticmethod
    def delete_listing(
        db: Session,
        listing_id: int,
        farmer_account_id: int
    ) -> bool:
        """Delete a listing (soft delete by archiving)"""
        listing = db.query(ProductListing).filter(
            and_(
                ProductListing.id == listing_id,
                ProductListing.farmer_account_id == farmer_account_id
            )
        ).first()

        if not listing:
            return False

        listing.status = ListingStatusEnum.ARCHIVED
        db.commit()

        logger.info(f"Archived listing id={listing_id}")
        return True

    # ==================== Marketplace Browsing (Wholesaler) ====================

    @staticmethod
    def browse_listings(
        db: Session,
        filters: MarketplaceFilters,
        skip: int = 0,
        limit: int = 20
    ) -> Tuple[List[ProductListing], int]:
        """
        Browse active marketplace listings with filters.
        Returns (listings, total_count) for pagination.
        """
        query = db.query(ProductListing).options(
            joinedload(ProductListing.farmer_account).joinedload(Account.farmer_profile)
        ).filter(
            ProductListing.status == ListingStatusEnum.ACTIVE
        )

        # Apply filters
        if filters.category:
            query = query.filter(ProductListing.category == filters.category)

        if filters.province:
            query = query.filter(ProductListing.province.ilike(f"%{filters.province}%"))

        if filters.min_price is not None:
            query = query.filter(ProductListing.price_per_unit >= filters.min_price)

        if filters.max_price is not None:
            query = query.filter(ProductListing.price_per_unit <= filters.max_price)

        if filters.search:
            search_term = f"%{filters.search}%"
            query = query.filter(
                or_(
                    ProductListing.title.ilike(search_term),
                    ProductListing.description.ilike(search_term)
                )
            )

        if filters.featured_only:
            query = query.filter(ProductListing.is_featured == True)

        # Filter expired listings
        now = datetime.now(timezone.utc)
        query = query.filter(
            or_(
                ProductListing.expires_at == None,
                ProductListing.expires_at > now
            )
        )

        # Get total count before pagination
        total = query.count()

        # Order by featured first, then by published date
        listings = query.order_by(
            ProductListing.is_featured.desc(),
            ProductListing.published_at.desc()
        ).offset(skip).limit(limit).all()

        return listings, total

    @staticmethod
    def get_listing_detail(
        db: Session,
        listing_id: int
    ) -> Optional[ProductListing]:
        """
        Get detailed listing for public view (wholesaler browsing).
        Only returns active, non-expired listings.
        """
        now = datetime.now(timezone.utc)

        listing = db.query(ProductListing).options(
            joinedload(ProductListing.farmer_account).joinedload(Account.farmer_profile)
        ).filter(
            and_(
                ProductListing.id == listing_id,
                ProductListing.status == ListingStatusEnum.ACTIVE,
                or_(
                    ProductListing.expires_at == None,
                    ProductListing.expires_at > now
                )
            )
        ).first()

        return listing

    @staticmethod
    def enrich_listing_with_farmer(
        listing: ProductListing
    ) -> ProductListingBrowseResponse:
        """
        Convert ProductListing to ProductListingBrowseResponse with farmer info.
        """
        farmer_summary = None
        if listing.farmer_account and hasattr(listing.farmer_account, 'farmer_profile') and listing.farmer_account.farmer_profile:
            fp = listing.farmer_account.farmer_profile
            farmer_summary = FarmerSummary(
                id=listing.farmer_account.id,
                farm_name=fp.farm_name,
                farm_location=fp.farm_location,
                certifications=fp.certifications
            )

        return ProductListingBrowseResponse(
            id=listing.id,
            title=listing.title,
            description=listing.description,
            category=listing.category,
            available_quantity=listing.available_quantity,
            unit=listing.unit,
            price_per_unit=listing.price_per_unit,
            currency=listing.currency,
            minimum_order_quantity=listing.minimum_order_quantity,
            quality_grade=listing.quality_grade,
            certifications=listing.certifications,
            photos=listing.photos,
            province=listing.province,
            city=listing.city,
            farm_name=listing.farm_name,
            is_featured=listing.is_featured,
            published_at=listing.published_at,
            farmer=farmer_summary
        )

    # ==================== Utility Methods ====================

    @staticmethod
    def get_available_provinces(db: Session) -> List[str]:
        """Get list of provinces with active listings (for filter dropdown)"""
        provinces = db.query(ProductListing.province).filter(
            and_(
                ProductListing.status == ListingStatusEnum.ACTIVE,
                ProductListing.province != None
            )
        ).distinct().all()

        return [p[0] for p in provinces if p[0]]

    @staticmethod
    def get_categories() -> List[str]:
        """Get list of available categories"""
        return [category.value for category in ProductCategoryEnum]

    @staticmethod
    def mark_expired_listings(db: Session) -> int:
        """Mark listings past expiry date as expired (for scheduled job)"""
        now = datetime.now(timezone.utc)

        expired_count = db.query(ProductListing).filter(
            and_(
                ProductListing.status == ListingStatusEnum.ACTIVE,
                ProductListing.expires_at != None,
                ProductListing.expires_at < now
            )
        ).update({ProductListing.status: ListingStatusEnum.EXPIRED})

        db.commit()

        if expired_count > 0:
            logger.info(f"Marked {expired_count} listings as expired")

        return expired_count
