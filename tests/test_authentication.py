import pytest
import asyncio
from unittest.mock import patch
from app.services.authentication import (
    auth_service, 
    AuthenticationError, 
    UserNotFoundError, 
    InvalidCredentialsError,
    UserAlreadyExistsError
)


class TestAuthenticationIntegration:
    """Integration tests for AWS Cognito authentication service"""
    
    @pytest.fixture
    def test_farmer_data(self):
        return {
            "email": "test.farmer@beyondagri.com",
            "password": "TestPassword123!",
            "phone_number": "+27123456789",
            "user_type": "farmer",
            "full_name": "John Farmer",
            "farm_location": "Western Cape, South Africa"
        }
    
    @pytest.fixture
    def test_wholesaler_data(self):
        return {
            "email": "test.wholesaler@beyondagri.com",
            "password": "TestPassword123!",
            "phone_number": "+27987654321",
            "user_type": "wholesaler",
            "company_name": "Fresh Produce Co",
            "business_license": "WC-2024-001"
        }

    @pytest.fixture
    def test_admin_data(self):
        return {
            "email": "test.admin@beyondagri.com",
            "password": "AdminPassword123!",
            "phone_number": "+27111222333",
            "user_type": "admin",
            "name": "System Admin",
            "department": "IT Operations"
        }

    @pytest.mark.asyncio
    async def test_cognito_connection(self):
        """Test basic connection to Cognito User Pool"""
        try:
            # This should not raise an exception if connection works
            assert auth_service.client is not None
            assert auth_service.user_pool_id == "af-south-1_gzGUqBtmo"
            assert auth_service.client_id == "9rhivqs3cjqn978to49pebr0l"
            print("✅ Cognito connection test passed")
        except Exception as e:
            pytest.fail(f"Cognito connection failed: {e}")

    @pytest.mark.asyncio
    async def test_farmer_registration(self, test_farmer_data):
        """Test farmer user registration"""
        # Clean up any existing test user first
        await self._cleanup_test_user(test_farmer_data["email"])
        
        try:
            # Start with minimal attributes to test basic functionality
            result = await auth_service.register_user(
                email=test_farmer_data["email"],
                password=test_farmer_data["password"],
                user_type=test_farmer_data["user_type"]
            )
            
            assert result["email"] == test_farmer_data["email"]
            assert result["user_type"] == "farmer"
            assert "user_id" in result
            assert "user_sub" in result
            print("✅ Farmer registration test passed")
            
        except UserAlreadyExistsError:
            pytest.skip("Test user already exists - skipping registration test")
        except Exception as e:
            pytest.fail(f"Farmer registration failed: {e}")

    @pytest.mark.asyncio
    async def test_wholesaler_registration(self, test_wholesaler_data):
        """Test wholesaler user registration"""
        # Clean up any existing test user first
        await self._cleanup_test_user(test_wholesaler_data["email"])
        
        try:
            result = await auth_service.register_user(
                email=test_wholesaler_data["email"],
                password=test_wholesaler_data["password"],
                phone_number=test_wholesaler_data["phone_number"],
                user_type=test_wholesaler_data["user_type"],
                company_name=test_wholesaler_data["company_name"],
                business_license=test_wholesaler_data["business_license"]
            )
            
            assert result["email"] == test_wholesaler_data["email"]
            assert result["user_type"] == "wholesaler"
            assert "user_id" in result
            assert "user_sub" in result
            print("✅ Wholesaler registration test passed")
            
        except UserAlreadyExistsError:
            pytest.skip("Test user already exists - skipping registration test")
        except Exception as e:
            pytest.fail(f"Wholesaler registration failed: {e}")

    @pytest.mark.asyncio
    async def test_admin_registration(self, test_admin_data):
        """Test admin user registration"""
        # Clean up any existing test user first
        await self._cleanup_test_user(test_admin_data["email"])

        try:
            result = await auth_service.register_user(
                email=test_admin_data["email"],
                password=test_admin_data["password"],
                phone_number=test_admin_data["phone_number"],
                user_type=test_admin_data["user_type"],
                name=test_admin_data["name"],
                department=test_admin_data["department"]
            )

            assert result["email"] == test_admin_data["email"]
            assert result["user_type"] == "admin"
            assert "user_id" in result
            assert "user_sub" in result
            print("✅ Admin registration test passed")

        except UserAlreadyExistsError:
            pytest.skip("Test user already exists - skipping registration test")
        except Exception as e:
            pytest.fail(f"Admin registration failed: {e}")

    @pytest.mark.asyncio
    async def test_admin_authentication(self, test_admin_data):
        """Test admin user authentication"""
        # Ensure user exists first
        try:
            await auth_service.register_user(
                email=test_admin_data["email"],
                password=test_admin_data["password"],
                user_type=test_admin_data["user_type"]
            )
        except UserAlreadyExistsError:
            pass  # User already exists, that's fine

        try:
            result = await auth_service.authenticate_user(
                username=test_admin_data["email"],
                password=test_admin_data["password"]
            )

            assert "access_token" in result
            assert "id_token" in result
            assert "refresh_token" in result
            assert result["email"] == test_admin_data["email"]
            assert result["user_type"] == "admin"
            print("✅ Admin authentication test passed")

        except Exception as e:
            pytest.fail(f"Admin authentication failed: {e}")

    @pytest.mark.asyncio
    async def test_user_authentication(self, test_farmer_data):
        """Test user authentication with email and password"""
        # Ensure user exists first
        try:
            await auth_service.register_user(
                email=test_farmer_data["email"],
                password=test_farmer_data["password"],
                user_type=test_farmer_data["user_type"]
            )
        except UserAlreadyExistsError:
            pass  # User already exists, that's fine
        
        try:
            result = await auth_service.authenticate_user(
                username=test_farmer_data["email"],
                password=test_farmer_data["password"]
            )
            
            assert "access_token" in result
            assert "id_token" in result
            assert "refresh_token" in result
            assert result["email"] == test_farmer_data["email"]
            assert result["user_type"] == "farmer"
            print("✅ User authentication test passed")
            
        except Exception as e:
            pytest.fail(f"User authentication failed: {e}")

    @pytest.mark.asyncio
    async def test_invalid_credentials(self):
        """Test authentication with invalid credentials"""
        with pytest.raises(InvalidCredentialsError):
            await auth_service.authenticate_user(
                username="nonexistent@example.com",
                password="wrongpassword"
            )
        print("✅ Invalid credentials test passed")

    @pytest.mark.asyncio
    async def test_duplicate_user_registration(self, test_farmer_data):
        """Test that registering duplicate user raises error"""
        # Ensure user exists first
        try:
            await auth_service.register_user(
                email=test_farmer_data["email"],
                password=test_farmer_data["password"],
                user_type=test_farmer_data["user_type"]
            )
        except UserAlreadyExistsError:
            pass  # User already exists, that's fine
        
        # Now try to register again - should fail
        with pytest.raises(UserAlreadyExistsError):
            await auth_service.register_user(
                email=test_farmer_data["email"],
                password=test_farmer_data["password"],
                user_type=test_farmer_data["user_type"]
            )
        print("✅ Duplicate user registration test passed")

    @pytest.mark.asyncio
    async def test_token_validation(self, test_farmer_data):
        """Test JWT token validation"""
        # First authenticate to get a token
        try:
            await auth_service.register_user(
                email=test_farmer_data["email"],
                password=test_farmer_data["password"],
                user_type=test_farmer_data["user_type"]
            )
        except UserAlreadyExistsError:
            pass
        
        auth_result = await auth_service.authenticate_user(
            username=test_farmer_data["email"],
            password=test_farmer_data["password"]
        )
        
        # Validate the token
        try:
            token_result = await auth_service.validate_token(
                auth_result["access_token"]
            )
            
            assert token_result["email"] == test_farmer_data["email"]
            assert token_result["user_type"] == "farmer"
            assert "user_sub" in token_result
            print("✅ Token validation test passed")
            
        except Exception as e:
            pytest.fail(f"Token validation failed: {e}")

    @pytest.mark.asyncio
    async def test_password_reset_initiation(self, test_farmer_data):
        """Test password reset initiation"""
        # Ensure user exists first
        try:
            await auth_service.register_user(
                email=test_farmer_data["email"],
                password=test_farmer_data["password"],
                user_type=test_farmer_data["user_type"]
            )
        except UserAlreadyExistsError:
            pass
        
        try:
            result = await auth_service.reset_password(
                username=test_farmer_data["email"]
            )
            
            assert "delivery_medium" in result
            assert "destination" in result
            print("✅ Password reset initiation test passed")
            
        except Exception as e:
            pytest.fail(f"Password reset initiation failed: {e}")

    @pytest.mark.asyncio
    async def test_password_reset_nonexistent_user(self):
        """Test password reset for non-existent user"""
        with pytest.raises(UserNotFoundError):
            await auth_service.reset_password(
                username="nonexistent@example.com"
            )
        print("✅ Password reset non-existent user test passed")

    async def _cleanup_test_user(self, email: str):
        """Helper method to clean up test users"""
        try:
            auth_service.client.admin_delete_user(
                UserPoolId=auth_service.user_pool_id,
                Username=email
            )
        except Exception:
            pass  # User doesn't exist, that's fine


class TestAuthenticationUnit:
    """Unit tests with mocked AWS calls"""
    
    @pytest.mark.asyncio
    @patch('app.services.authentication.auth_service.client')
    async def test_register_user_success_mock(self, mock_client):
        """Test successful user registration with mocked AWS calls"""
        # Mock the AWS response
        mock_client.admin_create_user.return_value = {
            'User': {
                'Username': 'test@example.com',
                'UserStatus': 'CONFIRMED',
                'Attributes': [
                    {'Name': 'sub', 'Value': 'test-sub-123'},
                    {'Name': 'email', 'Value': 'test@example.com'}
                ]
            }
        }
        
        result = await auth_service.register_user(
            email="test@example.com",
            password="TestPassword123!",
            user_type="farmer"
        )
        
        assert result['email'] == 'test@example.com'
        assert result['user_type'] == 'farmer'
        assert mock_client.admin_create_user.called
        assert mock_client.admin_set_user_password.called
        print("✅ Mocked registration test passed")


if __name__ == "__main__":
    pytest.main([__file__, "-v"])