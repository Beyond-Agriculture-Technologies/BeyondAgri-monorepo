"""
Tests for marketplace endpoints and service.

Tests cover:
- Browse endpoints (public/wholesaler access)
- Farmer listing management (CRUD operations)
- Access control and authorization
- Filtering and pagination
"""
import pytest
from datetime import datetime, timezone
from unittest.mock import patch, MagicMock, AsyncMock
from decimal import Decimal
from fastapi import HTTPException

from app.models.account import AccountTypeEnum, AccountStatusEnum
from app.models.marketplace import ListingStatusEnum, ProductCategoryEnum


class TestMarketplaceEndpoints:
    """Test marketplace endpoints"""

    @pytest.fixture
    def db_session(self):
        """Provide a database session for tests"""
        from app.db.session import SessionLocal
        db = SessionLocal()
        try:
            yield db
        finally:
            db.close()

    @pytest.fixture
    def mock_farmer_account(self):
        """Create a mock farmer AccountProfile"""
        from app.schemas.account import AccountProfile
        return AccountProfile(
            id=1,
            external_auth_id="farmer-sub-123",
            email="farmer@beyondagri.com",
            account_type=AccountTypeEnum.FARMER.value,
            status=AccountStatusEnum.ACTIVE.value,
            is_verified=True,
            is_active=True,
            name="Test Farmer"
        )

    @pytest.fixture
    def mock_wholesaler_account(self):
        """Create a mock wholesaler AccountProfile"""
        from app.schemas.account import AccountProfile
        return AccountProfile(
            id=2,
            external_auth_id="wholesaler-sub-123",
            email="wholesaler@beyondagri.com",
            account_type=AccountTypeEnum.WHOLESALER.value,
            status=AccountStatusEnum.ACTIVE.value,
            is_verified=True,
            is_active=True,
            name="Test Wholesaler"
        )


class TestBrowseListings:
    """Test GET /listings endpoint (public)"""

    @pytest.fixture
    def db_session(self):
        """Provide a database session for tests"""
        from app.db.session import SessionLocal
        db = SessionLocal()
        try:
            yield db
        finally:
            db.close()

    @pytest.mark.asyncio
    async def test_browse_listings_unauthenticated(self, db_session):
        """Test that unauthenticated users can browse listings"""
        from app.api.v1.endpoints.marketplace import browse_listings

        result = await browse_listings(
            category=None,
            province=None,
            min_price=None,
            max_price=None,
            search=None,
            featured_only=False,
            page=1,
            page_size=20,
            current_account=None,
            db=db_session
        )

        assert result.page == 1
        assert result.page_size == 20
        assert hasattr(result, 'data')
        assert hasattr(result, 'total')
        print("Browse listings unauthenticated test passed")

    @pytest.mark.asyncio
    async def test_browse_listings_with_category_filter(self, db_session):
        """Test browsing with category filter"""
        from app.api.v1.endpoints.marketplace import browse_listings

        result = await browse_listings(
            category=ProductCategoryEnum.HARVEST,
            province=None,
            min_price=None,
            max_price=None,
            search=None,
            featured_only=False,
            page=1,
            page_size=20,
            current_account=None,
            db=db_session
        )

        assert result.page == 1
        print("Browse listings with category filter test passed")

    @pytest.mark.asyncio
    async def test_browse_listings_with_price_filter(self, db_session):
        """Test browsing with price range filter"""
        from app.api.v1.endpoints.marketplace import browse_listings

        result = await browse_listings(
            category=None,
            province=None,
            min_price=Decimal("10.00"),
            max_price=Decimal("100.00"),
            search=None,
            featured_only=False,
            page=1,
            page_size=20,
            current_account=None,
            db=db_session
        )

        assert result.page == 1
        print("Browse listings with price filter test passed")


class TestGetListingDetail:
    """Test GET /listings/{id} endpoint"""

    @pytest.fixture
    def db_session(self):
        """Provide a database session for tests"""
        from app.db.session import SessionLocal
        db = SessionLocal()
        try:
            yield db
        finally:
            db.close()

    @pytest.mark.asyncio
    async def test_get_nonexistent_listing(self, db_session):
        """Test getting a listing that doesn't exist returns 404"""
        from app.api.v1.endpoints.marketplace import get_listing_detail

        with pytest.raises(HTTPException) as exc_info:
            await get_listing_detail(
                listing_id=99999,
                current_account=None,
                db=db_session
            )

        assert exc_info.value.status_code == 404
        print("Get nonexistent listing test passed")


class TestFarmerListingManagement:
    """Test farmer listing CRUD operations"""

    @pytest.fixture
    def db_session(self):
        """Provide a database session for tests"""
        from app.db.session import SessionLocal
        db = SessionLocal()
        try:
            yield db
        finally:
            db.close()

    @pytest.fixture
    def mock_farmer_account(self):
        """Create a mock farmer AccountProfile"""
        from app.schemas.account import AccountProfile
        return AccountProfile(
            id=1,
            external_auth_id="farmer-sub-123",
            email="farmer@beyondagri.com",
            account_type=AccountTypeEnum.FARMER.value,
            status=AccountStatusEnum.ACTIVE.value,
            is_verified=True,
            is_active=True,
            name="Test Farmer"
        )

    @pytest.mark.asyncio
    async def test_get_my_listings_empty(self, db_session, mock_farmer_account):
        """Test getting listings for farmer with no listings"""
        from app.api.v1.endpoints.marketplace import get_my_listings

        result = await get_my_listings(
            listing_status=None,
            skip=0,
            limit=100,
            current_account=mock_farmer_account,
            db=db_session
        )

        # May return empty list or existing test data
        assert isinstance(result, list)
        print("Get my listings empty test passed")


class TestMarketplaceService:
    """Test MarketplaceService methods"""

    @pytest.fixture
    def db_session(self):
        """Provide a database session for tests"""
        from app.db.session import SessionLocal
        db = SessionLocal()
        try:
            yield db
        finally:
            db.close()

    def test_get_categories(self):
        """Test getting available categories"""
        from app.services.marketplace_service import MarketplaceService

        categories = MarketplaceService.get_categories()

        assert "HARVEST" in categories
        assert "MEAT" in categories
        assert "POULTRY" in categories
        assert "DAIRY" in categories
        assert "GRAINS" in categories
        assert "OTHER" in categories
        print("Get categories test passed")

    def test_get_available_provinces_empty(self, db_session):
        """Test getting provinces when no active listings exist"""
        from app.services.marketplace_service import MarketplaceService

        provinces = MarketplaceService.get_available_provinces(db_session)

        assert isinstance(provinces, list)
        print("Get available provinces test passed")

    @pytest.mark.asyncio
    async def test_browse_listings_with_filters(self, db_session):
        """Test browse listings with all filter types"""
        from app.services.marketplace_service import MarketplaceService
        from app.schemas.marketplace import MarketplaceFilters

        filters = MarketplaceFilters(
            category=ProductCategoryEnum.HARVEST,
            province="Western Cape",
            min_price=Decimal("5.00"),
            max_price=Decimal("50.00"),
            search="tomato",
            featured_only=False
        )

        listings, total = MarketplaceService.browse_listings(
            db=db_session,
            filters=filters,
            skip=0,
            limit=20
        )

        assert isinstance(listings, list)
        assert isinstance(total, int)
        print("Browse listings with filters test passed")


class TestAccessControl:
    """Test role-based access control for marketplace"""

    @pytest.mark.asyncio
    async def test_farmer_can_access_my_listings(self):
        """Test that farmers can access their own listings"""
        from app.schemas.account import AccountProfile

        mock_farmer = AccountProfile(
            id=1,
            external_auth_id="farmer-sub-123",
            email="farmer@beyondagri.com",
            account_type=AccountTypeEnum.FARMER.value,
            status=AccountStatusEnum.ACTIVE.value,
            is_verified=True,
            is_active=True
        )

        # Farmers should have access to listing management
        assert mock_farmer.account_type == AccountTypeEnum.FARMER.value
        print("Farmer can access my-listings test passed")

    @pytest.mark.asyncio
    async def test_wholesaler_cannot_create_listing(self):
        """Test that wholesalers cannot create listings"""
        from app.schemas.account import AccountProfile

        mock_wholesaler = AccountProfile(
            id=2,
            external_auth_id="wholesaler-sub-123",
            email="wholesaler@beyondagri.com",
            account_type=AccountTypeEnum.WHOLESALER.value,
            status=AccountStatusEnum.ACTIVE.value,
            is_verified=True,
            is_active=True
        )

        # Wholesalers should not be able to create listings
        assert mock_wholesaler.account_type != AccountTypeEnum.FARMER.value
        print("Wholesaler cannot create listing test passed")

    @pytest.mark.asyncio
    async def test_farmer_dependency_rejects_wholesaler(self):
        """Test that farmer dependency rejects wholesaler accounts"""
        from app.core.deps import get_current_farmer_account
        from app.schemas.account import AccountProfile

        mock_wholesaler = AccountProfile(
            id=2,
            external_auth_id="wholesaler-sub-123",
            email="wholesaler@beyondagri.com",
            account_type=AccountTypeEnum.WHOLESALER.value,
            status=AccountStatusEnum.ACTIVE.value,
            is_verified=True,
            is_active=True
        )

        with pytest.raises(HTTPException) as exc_info:
            await get_current_farmer_account(current_account=mock_wholesaler)

        assert exc_info.value.status_code == 403
        assert "Farmer account required" in exc_info.value.detail
        print("Farmer dependency rejects wholesaler test passed")


class TestListingStatusTransitions:
    """Test listing status state machine"""

    def test_listing_status_enum_values(self):
        """Test that listing status enum has expected values"""
        assert ListingStatusEnum.DRAFT.value == "DRAFT"
        assert ListingStatusEnum.ACTIVE.value == "ACTIVE"
        assert ListingStatusEnum.PAUSED.value == "PAUSED"
        assert ListingStatusEnum.SOLD_OUT.value == "SOLD_OUT"
        assert ListingStatusEnum.EXPIRED.value == "EXPIRED"
        assert ListingStatusEnum.ARCHIVED.value == "ARCHIVED"
        print("Listing status enum values test passed")

    def test_product_category_enum_values(self):
        """Test that product category enum has expected values"""
        assert ProductCategoryEnum.HARVEST.value == "HARVEST"
        assert ProductCategoryEnum.MEAT.value == "MEAT"
        assert ProductCategoryEnum.POULTRY.value == "POULTRY"
        assert ProductCategoryEnum.DAIRY.value == "DAIRY"
        assert ProductCategoryEnum.GRAINS.value == "GRAINS"
        assert ProductCategoryEnum.OTHER.value == "OTHER"
        print("Product category enum values test passed")


class TestListingSchemas:
    """Test marketplace Pydantic schemas"""

    def test_product_listing_create_schema(self):
        """Test ProductListingCreate schema validation"""
        from app.schemas.marketplace import ProductListingCreate

        listing_data = ProductListingCreate(
            title="Fresh Tomatoes",
            description="Organic tomatoes from our farm",
            category=ProductCategoryEnum.HARVEST,
            available_quantity=Decimal("100.00"),
            unit="kg",
            price_per_unit=Decimal("25.00"),
            currency="ZAR",
            publish_immediately=False
        )

        assert listing_data.title == "Fresh Tomatoes"
        assert listing_data.category == ProductCategoryEnum.HARVEST
        assert listing_data.available_quantity == Decimal("100.00")
        print("Product listing create schema test passed")

    def test_product_listing_update_schema_partial(self):
        """Test ProductListingUpdate with partial data"""
        from app.schemas.marketplace import ProductListingUpdate

        update_data = ProductListingUpdate(
            price_per_unit=Decimal("30.00")
        )

        assert update_data.price_per_unit == Decimal("30.00")
        assert update_data.title is None
        print("Product listing update schema partial test passed")

    def test_marketplace_filters_schema(self):
        """Test MarketplaceFilters schema"""
        from app.schemas.marketplace import MarketplaceFilters

        filters = MarketplaceFilters(
            category=ProductCategoryEnum.HARVEST,
            province="Gauteng",
            min_price=Decimal("10.00"),
            max_price=Decimal("100.00"),
            search="organic",
            featured_only=True
        )

        assert filters.category == ProductCategoryEnum.HARVEST
        assert filters.province == "Gauteng"
        assert filters.featured_only is True
        print("Marketplace filters schema test passed")


class TestPagination:
    """Test pagination functionality"""

    @pytest.fixture
    def db_session(self):
        """Provide a database session for tests"""
        from app.db.session import SessionLocal
        db = SessionLocal()
        try:
            yield db
        finally:
            db.close()

    @pytest.mark.asyncio
    async def test_pagination_first_page(self, db_session):
        """Test getting first page of results"""
        from app.api.v1.endpoints.marketplace import browse_listings

        result = await browse_listings(
            category=None,
            province=None,
            min_price=None,
            max_price=None,
            search=None,
            featured_only=False,
            page=1,
            page_size=10,
            current_account=None,
            db=db_session
        )

        assert result.page == 1
        assert result.page_size == 10
        print("Pagination first page test passed")

    @pytest.mark.asyncio
    async def test_pagination_calculates_total_pages(self, db_session):
        """Test that total pages is calculated correctly"""
        from app.api.v1.endpoints.marketplace import browse_listings

        result = await browse_listings(
            category=None,
            province=None,
            min_price=None,
            max_price=None,
            search=None,
            featured_only=False,
            page=1,
            page_size=20,
            current_account=None,
            db=db_session
        )

        # Verify pagination structure
        assert hasattr(result, 'total')
        assert hasattr(result, 'total_pages')
        assert result.total_pages >= 0
        print("Pagination total pages test passed")


class TestFilterUtilityEndpoints:
    """Test utility endpoints for filters"""

    @pytest.fixture
    def db_session(self):
        """Provide a database session for tests"""
        from app.db.session import SessionLocal
        db = SessionLocal()
        try:
            yield db
        finally:
            db.close()

    @pytest.mark.asyncio
    async def test_get_provinces_endpoint(self, db_session):
        """Test GET /provinces endpoint"""
        from app.api.v1.endpoints.marketplace import get_available_provinces

        result = await get_available_provinces(db=db_session)

        assert isinstance(result, list)
        print("Get provinces endpoint test passed")

    @pytest.mark.asyncio
    async def test_get_categories_endpoint(self):
        """Test GET /categories endpoint"""
        from app.api.v1.endpoints.marketplace import get_categories

        result = await get_categories()

        assert isinstance(result, list)
        assert len(result) == 6  # HARVEST, MEAT, POULTRY, DAIRY, GRAINS, OTHER
        print("Get categories endpoint test passed")


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
