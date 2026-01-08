import pytest
import asyncio
from datetime import datetime
from unittest.mock import patch, MagicMock
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


class TestPhoneNumberLogin:
    """Test phone number login functionality"""

    @pytest.fixture
    def test_user_with_phone(self):
        return {
            "email": "phonetest@beyondagri.com",
            "password": "PhoneTest123!",
            "phone_number": "+27821234567",
            "user_type": "farmer"
        }

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
    async def test_login_with_phone_e164(self, test_user_with_phone, db_session):
        """Test login with E.164 format phone number"""
        # Setup: Register user first
        from app.services.authentication import get_auth_service_with_db
        auth_service = get_auth_service_with_db(db_session)

        # Clean up first
        await self._cleanup_test_user(test_user_with_phone["email"])

        await auth_service.register_user(
            email=test_user_with_phone["email"],
            password=test_user_with_phone["password"],
            phone_number=test_user_with_phone["phone_number"],
            account_type=test_user_with_phone["user_type"]
        )

        # Verify phone (simulate verification)
        from app.services.account_service import AccountService
        account_service = AccountService(db_session)
        account = account_service.get_account_by_email(test_user_with_phone["email"])
        from datetime import datetime
        account.phone_verified_at = datetime.utcnow()
        db_session.commit()

        # Test: Login with phone number (E.164 format)
        result = await auth_service.authenticate_user(
            username="+27821234567",
            password=test_user_with_phone["password"]
        )

        assert "access_token" in result
        assert result["email"] == test_user_with_phone["email"]
        print("✅ Phone login (E.164) test passed")

    @pytest.mark.asyncio
    async def test_login_with_phone_sa_format(self, test_user_with_phone, db_session):
        """Test login with South African format phone number"""
        from app.services.authentication import get_auth_service_with_db
        auth_service = get_auth_service_with_db(db_session)

        # Ensure user exists with verified phone
        try:
            await auth_service.register_user(
                email=test_user_with_phone["email"],
                password=test_user_with_phone["password"],
                phone_number=test_user_with_phone["phone_number"],
                account_type=test_user_with_phone["user_type"]
            )
        except:
            pass

        # Verify phone
        from app.services.account_service import AccountService
        account_service = AccountService(db_session)
        account = account_service.get_account_by_email(test_user_with_phone["email"])
        if account and not account.phone_verified_at:
            from datetime import datetime
            account.phone_verified_at = datetime.utcnow()
            db_session.commit()

        # Test: Login with SA format (0XXXXXXXXX)
        result = await auth_service.authenticate_user(
            username="0821234567",  # SA format
            password=test_user_with_phone["password"]
        )

        assert "access_token" in result
        assert result["email"] == test_user_with_phone["email"]
        print("✅ Phone login (SA format) test passed")

    @pytest.mark.asyncio
    async def test_login_with_unverified_phone(self, test_user_with_phone, db_session):
        """Test login with unverified phone number (should fail)"""
        from app.services.authentication import get_auth_service_with_db, InvalidCredentialsError
        auth_service = get_auth_service_with_db(db_session)

        # Cleanup and register
        await self._cleanup_test_user("unverified@beyondagri.com")
        await auth_service.register_user(
            email="unverified@beyondagri.com",
            password=test_user_with_phone["password"],
            phone_number="+27999888777",
            account_type="farmer"
        )

        # Don't verify the phone - leave phone_verified_at as None

        # Test: Login with unverified phone should fail
        with pytest.raises(InvalidCredentialsError) as exc_info:
            await auth_service.authenticate_user(
                username="+27999888777",
                password=test_user_with_phone["password"]
            )

        assert "verify your phone number" in str(exc_info.value).lower()
        print("✅ Unverified phone login test passed")

    @pytest.mark.asyncio
    async def test_login_with_email_still_works(self, test_user_with_phone, db_session):
        """Test that email login still works (backward compatibility)"""
        from app.services.authentication import get_auth_service_with_db
        auth_service = get_auth_service_with_db(db_session)

        # Ensure user exists
        try:
            await auth_service.register_user(
                email=test_user_with_phone["email"],
                password=test_user_with_phone["password"],
                phone_number=test_user_with_phone["phone_number"],
                account_type=test_user_with_phone["user_type"]
            )
        except:
            pass

        # Test: Login with email (traditional method)
        result = await auth_service.authenticate_user(
            username=test_user_with_phone["email"],
            password=test_user_with_phone["password"]
        )

        assert "access_token" in result
        assert result["email"] == test_user_with_phone["email"]
        print("✅ Email login backward compatibility test passed")

    @pytest.mark.asyncio
    async def test_login_with_unregistered_phone(self, db_session):
        """Test login with phone number not in database"""
        from app.services.authentication import get_auth_service_with_db, UserNotFoundError
        auth_service = get_auth_service_with_db(db_session)

        with pytest.raises(UserNotFoundError):
            await auth_service.authenticate_user(
                username="+27999999999",
                password="SomePassword123!"
            )
        print("✅ Unregistered phone test passed")

    @pytest.mark.asyncio
    async def test_login_with_invalid_phone_format(self, db_session):
        """Test login with invalid phone format"""
        from app.services.authentication import get_auth_service_with_db, InvalidCredentialsError
        auth_service = get_auth_service_with_db(db_session)

        with pytest.raises(InvalidCredentialsError):
            await auth_service.authenticate_user(
                username="123",  # Invalid phone
                password="SomePassword123!"
            )
        print("✅ Invalid phone format test passed")

    async def _cleanup_test_user(self, email: str):
        """Helper method to clean up test users from both Cognito and database"""
        # Clean up Cognito user
        try:
            from app.services.authentication import auth_service
            auth_service.client.admin_delete_user(
                UserPoolId=auth_service.user_pool_id,
                Username=email
            )
        except Exception:
            pass  # User doesn't exist in Cognito, that's fine

        # Clean up local database account
        try:
            from app.db.session import SessionLocal
            from app.models.account import Account
            from app.models.profile import UserProfile, FarmerProfile, BusinessProfile

            db = SessionLocal()
            try:
                # Find account by email
                account = db.query(Account).filter(Account.email == email).first()
                if account:
                    # Delete associated profiles first (cascade should handle this, but being explicit)
                    db.query(UserProfile).filter(UserProfile.account_id == account.id).delete()
                    db.query(FarmerProfile).filter(FarmerProfile.account_id == account.id).delete()
                    db.query(BusinessProfile).filter(BusinessProfile.account_id == account.id).delete()

                    # Delete account
                    db.delete(account)
                    db.commit()
            finally:
                db.close()
        except Exception:
            pass  # Account doesn't exist in database, that's fine


class TestInputDetection:
    """Test the input detection utility"""

    def test_detect_email(self):
        """Test email detection"""
        from app.utils.phone_validation import detect_login_identifier_type

        result_type, result_value = detect_login_identifier_type("test@example.com")
        assert result_type == "email"
        assert result_value == "test@example.com"

        result_type, result_value = detect_login_identifier_type("farmer.user@beyondagri.co.za")
        assert result_type == "email"
        assert result_value == "farmer.user@beyondagri.co.za"
        print("✅ Email detection test passed")

    def test_detect_phone_e164(self):
        """Test E.164 phone detection"""
        from app.utils.phone_validation import detect_login_identifier_type

        result_type, result_value = detect_login_identifier_type("+27821234567")
        assert result_type == "phone"
        assert result_value == "+27821234567"  # Already normalized

        result_type, result_value = detect_login_identifier_type("+1234567890")
        assert result_type == "phone"
        assert result_value == "+1234567890"
        print("✅ E.164 phone detection test passed")

    def test_detect_phone_sa(self):
        """Test South African phone detection"""
        from app.utils.phone_validation import detect_login_identifier_type

        result_type, result_value = detect_login_identifier_type("0821234567")
        assert result_type == "phone"
        assert result_value == "+27821234567"  # Normalized to E.164

        result_type, result_value = detect_login_identifier_type("0123456789")
        assert result_type == "phone"
        assert result_value == "+27123456789"  # Normalized to E.164
        print("✅ SA phone detection test passed")

    def test_detect_unknown(self):
        """Test unknown input detection"""
        from app.utils.phone_validation import detect_login_identifier_type

        result_type, result_value = detect_login_identifier_type("123")
        assert result_type == "unknown"
        assert result_value is None

        result_type, result_value = detect_login_identifier_type("invalid")
        assert result_type == "unknown"
        assert result_value is None

        result_type, result_value = detect_login_identifier_type("")
        assert result_type == "unknown"
        assert result_value is None
        print("✅ Unknown input detection test passed")

    def test_detect_phone_returns_normalized(self):
        """Test that phone detection returns normalized value"""
        from app.utils.phone_validation import detect_login_identifier_type

        # SA format should be normalized to E.164
        result_type, result_value = detect_login_identifier_type("0821234567")
        assert result_type == "phone"
        assert result_value == "+27821234567"

        # Already E.164 should remain unchanged
        result_type, result_value = detect_login_identifier_type("+27821234567")
        assert result_type == "phone"
        assert result_value == "+27821234567"
        print("✅ Phone normalization in detection test passed")


class TestPhonePasswordReset:
    """Test phone-based password reset"""

    @pytest.fixture
    def test_user_password_reset(self):
        return {
            "email": "resettest@beyondagri.com",
            "password": "ResetTest123!",
            "phone_number": "+27777888999",
            "user_type": "farmer"
        }

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
    async def test_password_reset_with_phone(self, test_user_password_reset, db_session):
        """Test password reset initiation with phone number"""
        from app.services.authentication import get_auth_service_with_db
        auth_service = get_auth_service_with_db(db_session)

        # Setup: Register and verify phone
        await self._cleanup_test_user(test_user_password_reset["email"])
        await auth_service.register_user(
            email=test_user_password_reset["email"],
            password=test_user_password_reset["password"],
            phone_number=test_user_password_reset["phone_number"],
            account_type=test_user_password_reset["user_type"]
        )

        # Verify phone
        from app.services.account_service import AccountService
        account_service = AccountService(db_session)
        account = account_service.get_account_by_email(test_user_password_reset["email"])
        from datetime import datetime
        account.phone_verified_at = datetime.utcnow()
        db_session.commit()

        # Test: Initiate password reset with phone
        result = await auth_service.reset_password(
            username=test_user_password_reset["phone_number"]
        )

        assert "delivery_medium" in result
        assert "destination" in result
        print("✅ Phone password reset test passed")

    @pytest.mark.asyncio
    async def test_password_reset_with_unverified_phone(self, test_user_password_reset, db_session):
        """Test password reset with unverified phone (should fail)"""
        from app.services.authentication import get_auth_service_with_db, InvalidCredentialsError
        auth_service = get_auth_service_with_db(db_session)

        # Setup: Register but don't verify phone
        await self._cleanup_test_user("unverified_reset@beyondagri.com")
        await auth_service.register_user(
            email="unverified_reset@beyondagri.com",
            password=test_user_password_reset["password"],
            phone_number="+27888999000",
            account_type="farmer"
        )

        # Don't verify phone

        # Test: Should fail
        with pytest.raises(InvalidCredentialsError) as exc_info:
            await auth_service.reset_password(username="+27888999000")

        assert "verify your phone number" in str(exc_info.value).lower()
        print("✅ Unverified phone password reset test passed")

    async def _cleanup_test_user(self, email: str):
        """Helper method to clean up test users from both Cognito and database"""
        # Clean up Cognito user
        try:
            from app.services.authentication import auth_service
            auth_service.client.admin_delete_user(
                UserPoolId=auth_service.user_pool_id,
                Username=email
            )
        except Exception:
            pass  # User doesn't exist in Cognito, that's fine

        # Clean up local database account
        try:
            from app.db.session import SessionLocal
            from app.models.account import Account
            from app.models.profile import UserProfile, FarmerProfile, BusinessProfile

            db = SessionLocal()
            try:
                # Find account by email
                account = db.query(Account).filter(Account.email == email).first()
                if account:
                    # Delete associated profiles first (cascade should handle this, but being explicit)
                    db.query(UserProfile).filter(UserProfile.account_id == account.id).delete()
                    db.query(FarmerProfile).filter(FarmerProfile.account_id == account.id).delete()
                    db.query(BusinessProfile).filter(BusinessProfile.account_id == account.id).delete()

                    # Delete account
                    db.delete(account)
                    db.commit()
            finally:
                db.close()
        except Exception:
            pass  # Account doesn't exist in database, that's fine


class TestSignUpFlow:
    """Test the new sign-up flow with phone verification"""

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
    def test_signup_data(self):
        return {
            "email": "signup.test@beyondagri.com",
            "password": "SignupTest123!",
            "phone_number": "+27555666777",
            "user_type": "farmer"
        }

    @pytest.mark.asyncio
    async def test_sign_up_user_initiates_registration(self, test_signup_data, db_session):
        """Test that sign_up_user sends verification code"""
        from app.services.authentication import get_auth_service_with_db, UserAlreadyExistsError

        auth_service = get_auth_service_with_db(db_session)

        # Cleanup first
        await self._cleanup_test_user(test_signup_data["email"])

        try:
            result = await auth_service.sign_up_user(
                email=test_signup_data["email"],
                password=test_signup_data["password"],
                phone_number=test_signup_data["phone_number"],
                account_type=test_signup_data["user_type"]
            )

            assert "user_sub" in result
            assert "code_delivery_medium" in result
            assert "code_delivery_destination" in result
            assert result["user_confirmed"] is False
            print("✅ Sign up user test passed")

        except UserAlreadyExistsError:
            pytest.skip("Test user already exists")
        finally:
            await self._cleanup_test_user(test_signup_data["email"])

    @pytest.mark.asyncio
    async def test_sign_up_duplicate_email_fails(self, test_signup_data, db_session):
        """Test that duplicate email registration fails"""
        from app.services.authentication import get_auth_service_with_db, UserAlreadyExistsError

        auth_service = get_auth_service_with_db(db_session)

        # First registration
        await self._cleanup_test_user(test_signup_data["email"])
        try:
            await auth_service.sign_up_user(
                email=test_signup_data["email"],
                password=test_signup_data["password"],
                phone_number=test_signup_data["phone_number"],
                account_type=test_signup_data["user_type"]
            )
        except UserAlreadyExistsError:
            pass  # User already exists

        # Second registration should fail
        with pytest.raises(UserAlreadyExistsError):
            await auth_service.sign_up_user(
                email=test_signup_data["email"],
                password=test_signup_data["password"],
                phone_number="+27111222333",
                account_type=test_signup_data["user_type"]
            )
        print("✅ Duplicate email test passed")

    async def _cleanup_test_user(self, email: str):
        """Helper method to clean up test users"""
        try:
            from app.services.authentication import auth_service
            auth_service.client.admin_delete_user(
                UserPoolId=auth_service.user_pool_id,
                Username=email
            )
        except Exception:
            pass


class TestResendConfirmation:
    """Test resend confirmation code functionality"""

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
    async def test_resend_confirmation_user_not_found(self, db_session):
        """Test resend confirmation for non-existent user"""
        from app.services.authentication import get_auth_service_with_db, UserNotFoundError

        auth_service = get_auth_service_with_db(db_session)

        with pytest.raises(UserNotFoundError):
            await auth_service.resend_confirmation_code("nonexistent@example.com")
        print("✅ Resend confirmation user not found test passed")


class TestOTPEndpointsMocked:
    """Test OTP endpoints with mocked services"""

    @pytest.mark.asyncio
    @patch('app.services.phone_verification_service.PhoneVerificationService.send_verification_otp_cognito')
    async def test_send_otp_success_mock(self, mock_send_otp):
        """Test send OTP endpoint with mocked Cognito"""
        mock_send_otp.return_value = {
            'status': 'success',
            'message': 'Verification code sent successfully',
            'delivery_medium': 'SMS',
            'destination': '+27***4567',
            'expires_in_minutes': 3
        }

        # The actual endpoint test would require TestClient setup
        # This tests the service layer
        from app.services.phone_verification_service import PhoneVerificationService
        from app.db.session import SessionLocal

        db = SessionLocal()
        try:
            service = PhoneVerificationService(db)
            result = await service.send_verification_otp_cognito("fake_token")
            assert result['status'] == 'success'
            assert result['expires_in_minutes'] == 3
            print("✅ Send OTP mock test passed")
        finally:
            db.close()

    @pytest.mark.asyncio
    @patch('app.services.phone_verification_service.PhoneVerificationService.verify_otp_cognito')
    async def test_verify_otp_success_mock(self, mock_verify_otp):
        """Test verify OTP endpoint with mocked Cognito"""
        mock_verify_otp.return_value = {
            'status': 'success',
            'message': 'Phone number verified successfully',
            'phone_number': '+27***4567',
            'account_found': True
        }

        from app.services.phone_verification_service import PhoneVerificationService
        from app.db.session import SessionLocal

        db = SessionLocal()
        try:
            service = PhoneVerificationService(db)
            result = await service.verify_otp_cognito("fake_token", "123456")
            assert result['status'] == 'success'
            assert result['account_found'] is True
            print("✅ Verify OTP mock test passed")
        finally:
            db.close()


class TestMeAndLogout:
    """Test /me and /logout endpoints"""

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
    def test_user_data(self):
        return {
            "email": "metest@beyondagri.com",
            "password": "MeTest123!",
            "phone_number": "+27444555666",
            "user_type": "farmer"
        }

    @pytest.mark.asyncio
    async def test_validate_token_returns_user_info(self, test_user_data, db_session):
        """Test that validate_token returns user information"""
        from app.services.authentication import get_auth_service_with_db, UserAlreadyExistsError

        auth_service = get_auth_service_with_db(db_session)

        # Setup: Register and login
        try:
            await auth_service.register_user(
                email=test_user_data["email"],
                password=test_user_data["password"],
                phone_number=test_user_data["phone_number"],
                account_type=test_user_data["user_type"]
            )
        except UserAlreadyExistsError:
            pass

        # Login to get token
        auth_result = await auth_service.authenticate_user(
            username=test_user_data["email"],
            password=test_user_data["password"]
        )

        # Validate token
        token_result = await auth_service.validate_token(auth_result["access_token"])

        assert token_result["email"] == test_user_data["email"]
        assert "user_sub" in token_result
        print("✅ Validate token test passed")


if __name__ == "__main__":
    pytest.main([__file__, "-v"])