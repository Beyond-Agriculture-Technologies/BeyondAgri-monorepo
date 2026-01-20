"""
Marketplace API endpoints.

Provides endpoints for:
- Wholesalers: browse and filter farmer product listings
- Farmers: create and manage their product listings
"""
import logging
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session
from sqlalchemy.exc import IntegrityError, SQLAlchemyError
from typing import List, Optional
from decimal import Decimal

from app.schemas.account import AccountProfile
from app.schemas.marketplace import (
    ProductListingCreate, ProductListingUpdate, ProductListingResponse,
    ProductListingBrowseResponse, MarketplaceFilters, PaginatedListingsResponse
)
from app.models.marketplace import ListingStatusEnum, ProductCategoryEnum
from app.services.marketplace_service import MarketplaceService
from app.core.deps import (
    get_current_farmer_account,
    get_current_wholesaler_account,
    get_optional_current_account,
    get_db
)

logger = logging.getLogger(__name__)

router = APIRouter()


# ==================== Public Browse Endpoints (Wholesaler/Guest) ====================

@router.get("/listings", response_model=PaginatedListingsResponse)
async def browse_listings(
    category: Optional[ProductCategoryEnum] = Query(None, description="Filter by category"),
    province: Optional[str] = Query(None, description="Filter by province"),
    min_price: Optional[Decimal] = Query(None, ge=0, description="Minimum price"),
    max_price: Optional[Decimal] = Query(None, ge=0, description="Maximum price"),
    search: Optional[str] = Query(None, description="Search in title/description"),
    featured_only: bool = Query(False, description="Show only featured listings"),
    page: int = Query(1, ge=1, description="Page number"),
    page_size: int = Query(20, ge=1, le=100, description="Items per page"),
    current_account: Optional[AccountProfile] = Depends(get_optional_current_account),
    db: Session = Depends(get_db)
):
    """
    Browse marketplace listings with filters.

    Public endpoint - authentication optional.
    Returns paginated list of active listings from farmers.

    Filters:
    - **category**: HARVEST, MEAT, POULTRY, DAIRY, GRAINS, OTHER
    - **province**: Province name (partial match)
    - **min_price/max_price**: Price range filter
    - **search**: Text search in title and description
    - **featured_only**: Show only featured/promoted listings
    """
    try:
        filters = MarketplaceFilters(
            category=category,
            province=province,
            min_price=min_price,
            max_price=max_price,
            search=search,
            featured_only=featured_only
        )

        skip = (page - 1) * page_size
        listings, total = MarketplaceService.browse_listings(
            db=db,
            filters=filters,
            skip=skip,
            limit=page_size
        )

        # Enrich listings with farmer info
        enriched_listings = [
            MarketplaceService.enrich_listing_with_farmer(listing)
            for listing in listings
        ]

        total_pages = (total + page_size - 1) // page_size if total > 0 else 0

        account_info = f"account_id={current_account.id}" if current_account else "guest"
        logger.info(f"Browse listings: {account_info}, filters={filters}, results={len(enriched_listings)}")

        return PaginatedListingsResponse(
            data=enriched_listings,
            total=total,
            page=page,
            page_size=page_size,
            total_pages=total_pages
        )

    except SQLAlchemyError as e:
        logger.error(f"Database error browsing listings: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Database error occurred. Please try again."
        )


@router.get("/listings/{listing_id}", response_model=ProductListingBrowseResponse)
async def get_listing_detail(
    listing_id: int,
    current_account: Optional[AccountProfile] = Depends(get_optional_current_account),
    db: Session = Depends(get_db)
):
    """
    Get detailed view of a specific marketplace listing.

    Public endpoint - authentication optional.
    Only returns active, non-expired listings.
    """
    listing = MarketplaceService.get_listing_detail(db=db, listing_id=listing_id)

    if not listing:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Listing not found or no longer available"
        )

    return MarketplaceService.enrich_listing_with_farmer(listing)


@router.get("/provinces", response_model=List[str])
async def get_available_provinces(
    db: Session = Depends(get_db)
):
    """
    Get list of provinces with active listings.
    Useful for populating filter dropdowns.
    """
    return MarketplaceService.get_available_provinces(db=db)


@router.get("/categories", response_model=List[str])
async def get_categories():
    """
    Get list of available product categories.
    Useful for populating filter dropdowns.
    """
    return MarketplaceService.get_categories()


# ==================== Farmer Listing Management Endpoints ====================

@router.get("/my-listings", response_model=List[ProductListingResponse])
async def get_my_listings(
    listing_status: Optional[ListingStatusEnum] = Query(None, alias="status", description="Filter by status"),
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=100),
    current_account: AccountProfile = Depends(get_current_farmer_account),
    db: Session = Depends(get_db)
):
    """
    Get all listings for the current farmer.

    Restricted to farmers only.
    Returns all listings including drafts, paused, and archived.
    """
    listings = MarketplaceService.get_farmer_listings(
        db=db,
        farmer_account_id=current_account.id,
        status=listing_status,
        skip=skip,
        limit=limit
    )

    logger.info(f"Farmer {current_account.id} fetched {len(listings)} listings")
    return listings


@router.post("/my-listings", response_model=ProductListingResponse, status_code=status.HTTP_201_CREATED)
async def create_listing(
    listing_data: ProductListingCreate,
    current_account: AccountProfile = Depends(get_current_farmer_account),
    db: Session = Depends(get_db)
):
    """
    Create a new product listing.

    Restricted to farmers only.
    Location is auto-populated from farmer profile if not provided.
    Set publish_immediately=true to make listing visible right away.
    """
    try:
        listing = MarketplaceService.create_listing(
            db=db,
            listing_data=listing_data,
            farmer_account_id=current_account.id
        )

        logger.info(f"Farmer {current_account.id} created listing {listing.id}")
        return listing

    except IntegrityError as e:
        logger.error(f"Integrity error creating listing for farmer {current_account.id}: {e}")
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Listing creation failed. Check inventory item ID if provided."
        )
    except SQLAlchemyError as e:
        logger.error(f"Database error creating listing for farmer {current_account.id}: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Database error occurred. Please try again."
        )


@router.get("/my-listings/{listing_id}", response_model=ProductListingResponse)
async def get_my_listing(
    listing_id: int,
    current_account: AccountProfile = Depends(get_current_farmer_account),
    db: Session = Depends(get_db)
):
    """Get a specific listing owned by the current farmer."""
    listing = MarketplaceService.get_listing(
        db=db,
        listing_id=listing_id,
        farmer_account_id=current_account.id
    )

    if not listing:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Listing not found"
        )

    return listing


@router.put("/my-listings/{listing_id}", response_model=ProductListingResponse)
async def update_listing(
    listing_id: int,
    update_data: ProductListingUpdate,
    current_account: AccountProfile = Depends(get_current_farmer_account),
    db: Session = Depends(get_db)
):
    """
    Update a listing.

    Restricted to farmers - can only update own listings.
    """
    try:
        listing = MarketplaceService.update_listing(
            db=db,
            listing_id=listing_id,
            farmer_account_id=current_account.id,
            update_data=update_data
        )

        if not listing:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Listing not found"
            )

        logger.info(f"Farmer {current_account.id} updated listing {listing_id}")
        return listing

    except IntegrityError as e:
        logger.error(f"Integrity error updating listing {listing_id}: {e}")
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Update failed due to a data conflict."
        )
    except SQLAlchemyError as e:
        logger.error(f"Database error updating listing {listing_id}: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Database error occurred. Please try again."
        )


@router.post("/my-listings/{listing_id}/publish", response_model=ProductListingResponse)
async def publish_listing(
    listing_id: int,
    current_account: AccountProfile = Depends(get_current_farmer_account),
    db: Session = Depends(get_db)
):
    """
    Publish a draft listing to the marketplace.

    Only works for listings in DRAFT status.
    """
    listing = MarketplaceService.publish_listing(
        db=db,
        listing_id=listing_id,
        farmer_account_id=current_account.id
    )

    if not listing:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Listing not found or not in draft status"
        )

    logger.info(f"Farmer {current_account.id} published listing {listing_id}")
    return listing


@router.post("/my-listings/{listing_id}/pause", response_model=ProductListingResponse)
async def pause_listing(
    listing_id: int,
    current_account: AccountProfile = Depends(get_current_farmer_account),
    db: Session = Depends(get_db)
):
    """
    Temporarily pause an active listing.

    Listing will be hidden from marketplace but not deleted.
    """
    listing = MarketplaceService.pause_listing(
        db=db,
        listing_id=listing_id,
        farmer_account_id=current_account.id
    )

    if not listing:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Listing not found or not in active status"
        )

    logger.info(f"Farmer {current_account.id} paused listing {listing_id}")
    return listing


@router.post("/my-listings/{listing_id}/resume", response_model=ProductListingResponse)
async def resume_listing(
    listing_id: int,
    current_account: AccountProfile = Depends(get_current_farmer_account),
    db: Session = Depends(get_db)
):
    """
    Resume a paused listing.

    Re-activates a listing that was previously paused.
    """
    # Get the paused listing
    listing = MarketplaceService.get_listing(
        db=db,
        listing_id=listing_id,
        farmer_account_id=current_account.id
    )

    if not listing:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Listing not found"
        )

    if listing.status != ListingStatusEnum.PAUSED:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Listing is not in paused status"
        )

    # Resume by updating status to ACTIVE
    update_data = ProductListingUpdate(status=ListingStatusEnum.ACTIVE)
    updated_listing = MarketplaceService.update_listing(
        db=db,
        listing_id=listing_id,
        farmer_account_id=current_account.id,
        update_data=update_data
    )

    logger.info(f"Farmer {current_account.id} resumed listing {listing_id}")
    return updated_listing


@router.delete("/my-listings/{listing_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_listing(
    listing_id: int,
    current_account: AccountProfile = Depends(get_current_farmer_account),
    db: Session = Depends(get_db)
):
    """
    Delete (archive) a listing.

    Listing is soft-deleted by setting status to ARCHIVED.
    """
    success = MarketplaceService.delete_listing(
        db=db,
        listing_id=listing_id,
        farmer_account_id=current_account.id
    )

    if not success:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Listing not found"
        )

    logger.info(f"Farmer {current_account.id} archived listing {listing_id}")
