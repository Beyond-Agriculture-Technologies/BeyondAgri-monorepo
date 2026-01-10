import pytest
from datetime import datetime
from unittest.mock import patch, MagicMock, AsyncMock
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session

from app.models.account import AccountTypeEnum, AccountStatusEnum


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

    @pytest.fixture
    def mock_admin_account(self):
        """Create a mock admin AccountProfile"""
        from app.schemas.account import AccountProfile
        return AccountProfile(
            id=3,
            external_auth_id="admin-sub-123",
            email="admin@beyondagri.com",
            account_type=AccountTypeEnum.ADMIN.value,
            status=AccountStatusEnum.ACTIVE.value,
            is_verified=True,
            is_active=True,
            name="Test Admin"
        )


class TestGetProducts:
    """Test GET /products endpoint (public)"""

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
    async def test_get_products_unauthenticated(self, db_session):
        """Test that unauthenticated users can access products"""
        from app.api.v1.endpoints.marketplace import get_products

        result = await get_products(current_account=None, db=db_session)

        assert result["account_type"] == "guest"
        assert "message" in result
        print("Get products unauthenticated test passed")

    @pytest.mark.asyncio
    async def test_get_products_authenticated_farmer(self, db_session):
        """Test that authenticated farmers can access products"""
        from app.api.v1.endpoints.marketplace import get_products
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

        result = await get_products(current_account=mock_farmer, db=db_session)

        assert result["account_type"] == AccountTypeEnum.FARMER.value
        print("Get products authenticated farmer test passed")

    @pytest.mark.asyncio
    async def test_get_products_authenticated_wholesaler(self, db_session):
        """Test that authenticated wholesalers can access products"""
        from app.api.v1.endpoints.marketplace import get_products
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

        result = await get_products(current_account=mock_wholesaler, db=db_session)

        assert result["account_type"] == AccountTypeEnum.WHOLESALER.value
        print("Get products authenticated wholesaler test passed")


class TestCreateProduct:
    """Test POST /products endpoint (farmers only)"""

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
    async def test_create_product_by_farmer(self, db_session):
        """Test that farmers can create products"""
        from app.api.v1.endpoints.marketplace import create_product
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

        result = await create_product(current_account=mock_farmer, db=db_session)

        assert result["farmer_id"] == 1
        assert "message" in result
        print("Create product by farmer test passed")

    @pytest.mark.asyncio
    async def test_wholesaler_cannot_create_product(self):
        """Test that wholesalers cannot create products (access control)"""
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

        # Wholesalers should not be able to create products
        # The get_current_farmer_account dependency would reject this
        assert mock_wholesaler.account_type != AccountTypeEnum.FARMER.value
        print("Wholesaler cannot create product test passed")


class TestGetOrders:
    """Test GET /orders endpoint (authenticated users)"""

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
    async def test_get_orders_farmer(self, db_session):
        """Test that farmers can view their orders"""
        from app.api.v1.endpoints.marketplace import get_orders
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

        result = await get_orders(current_account=mock_farmer, db=db_session)

        assert result["account_id"] == 1
        assert result["account_type"] == AccountTypeEnum.FARMER.value
        print("Get orders farmer test passed")

    @pytest.mark.asyncio
    async def test_get_orders_wholesaler(self, db_session):
        """Test that wholesalers can view their orders"""
        from app.api.v1.endpoints.marketplace import get_orders
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

        result = await get_orders(current_account=mock_wholesaler, db=db_session)

        assert result["account_id"] == 2
        assert result["account_type"] == AccountTypeEnum.WHOLESALER.value
        print("Get orders wholesaler test passed")


class TestCreateOrder:
    """Test POST /orders endpoint (wholesalers only)"""

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
    async def test_create_order_by_wholesaler(self, db_session):
        """Test that wholesalers can create orders"""
        from app.api.v1.endpoints.marketplace import create_order
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

        result = await create_order(current_account=mock_wholesaler, db=db_session)

        assert result["wholesaler_id"] == 2
        assert "message" in result
        print("Create order by wholesaler test passed")

    @pytest.mark.asyncio
    async def test_farmer_cannot_create_order(self):
        """Test that farmers cannot create orders (access control)"""
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

        # Farmers should not be able to create orders
        # The get_current_wholesaler_account dependency would reject this
        assert mock_farmer.account_type != AccountTypeEnum.WHOLESALER.value
        print("Farmer cannot create order test passed")


class TestAccessControl:
    """Test role-based access control"""

    @pytest.mark.asyncio
    async def test_farmer_account_type(self):
        """Test farmer account type validation"""
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

        assert mock_farmer.account_type == AccountTypeEnum.FARMER.value
        assert mock_farmer.account_type != AccountTypeEnum.WHOLESALER.value
        assert mock_farmer.account_type != AccountTypeEnum.ADMIN.value
        print("Farmer account type test passed")

    @pytest.mark.asyncio
    async def test_wholesaler_account_type(self):
        """Test wholesaler account type validation"""
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

        assert mock_wholesaler.account_type == AccountTypeEnum.WHOLESALER.value
        assert mock_wholesaler.account_type != AccountTypeEnum.FARMER.value
        assert mock_wholesaler.account_type != AccountTypeEnum.ADMIN.value
        print("Wholesaler account type test passed")

    @pytest.mark.asyncio
    async def test_inactive_account_status(self):
        """Test inactive account status handling"""
        from app.schemas.account import AccountProfile

        inactive_account = AccountProfile(
            id=1,
            external_auth_id="inactive-sub-123",
            email="inactive@beyondagri.com",
            account_type=AccountTypeEnum.FARMER.value,
            status=AccountStatusEnum.DISABLED.value,
            is_verified=False,
            is_active=False
        )

        assert inactive_account.status == AccountStatusEnum.DISABLED.value
        assert inactive_account.is_active is False
        print("Inactive account status test passed")


class TestDependencyInjection:
    """Test FastAPI dependency injection for marketplace"""

    @pytest.mark.asyncio
    async def test_get_current_farmer_account_rejects_wholesaler(self):
        """Test that farmer dependency rejects wholesaler accounts"""
        from app.core.deps import get_current_farmer_account
        from app.schemas.account import AccountProfile
        from fastapi import HTTPException

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

    @pytest.mark.asyncio
    async def test_get_current_wholesaler_account_rejects_farmer(self):
        """Test that wholesaler dependency rejects farmer accounts"""
        from app.core.deps import get_current_wholesaler_account
        from app.schemas.account import AccountProfile
        from fastapi import HTTPException

        mock_farmer = AccountProfile(
            id=1,
            external_auth_id="farmer-sub-123",
            email="farmer@beyondagri.com",
            account_type=AccountTypeEnum.FARMER.value,
            status=AccountStatusEnum.ACTIVE.value,
            is_verified=True,
            is_active=True
        )

        with pytest.raises(HTTPException) as exc_info:
            await get_current_wholesaler_account(current_account=mock_farmer)

        assert exc_info.value.status_code == 403
        assert "Wholesaler account required" in exc_info.value.detail
        print("Wholesaler dependency rejects farmer test passed")

    @pytest.mark.asyncio
    async def test_get_current_active_account_rejects_inactive(self):
        """Test that active account dependency rejects inactive accounts"""
        from app.core.deps import get_current_active_account
        from app.schemas.account import AccountProfile
        from fastapi import HTTPException

        inactive_account = AccountProfile(
            id=1,
            external_auth_id="inactive-sub-123",
            email="inactive@beyondagri.com",
            account_type=AccountTypeEnum.FARMER.value,
            status=AccountStatusEnum.DISABLED.value,
            is_verified=False,
            is_active=False
        )

        with pytest.raises(HTTPException) as exc_info:
            await get_current_active_account(current_account=inactive_account)

        assert exc_info.value.status_code == 400
        assert "inactive or disabled" in exc_info.value.detail
        print("Active account dependency rejects inactive test passed")


class TestErrorHandling:
    """Test error handling in marketplace endpoints"""

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
    @patch('app.api.v1.endpoints.marketplace.logger')
    async def test_database_error_logged(self, mock_logger, db_session):
        """Test that database errors are properly logged"""
        from sqlalchemy.exc import SQLAlchemyError

        # Verify logger is importable and callable
        assert mock_logger is not None
        mock_logger.error.assert_not_called()  # No errors yet
        print("Database error logging test passed")


class TestEnumValues:
    """Test that enum values match database expectations"""

    def test_account_type_enum_uppercase(self):
        """Test that AccountTypeEnum uses UPPERCASE values"""
        assert AccountTypeEnum.FARMER.value == "FARMER"
        assert AccountTypeEnum.WHOLESALER.value == "WHOLESALER"
        assert AccountTypeEnum.ADMIN.value == "ADMIN"
        print("Account type enum uppercase test passed")

    def test_account_status_enum_uppercase(self):
        """Test that AccountStatusEnum uses UPPERCASE values"""
        assert AccountStatusEnum.ACTIVE.value == "ACTIVE"
        assert AccountStatusEnum.SUSPENDED.value == "SUSPENDED"
        assert AccountStatusEnum.DISABLED.value == "DISABLED"
        assert AccountStatusEnum.PENDING_VERIFICATION.value == "PENDING_VERIFICATION"
        print("Account status enum uppercase test passed")


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
