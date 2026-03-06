from typing import Dict, Any, Optional, List
from sqlalchemy.orm import Session
from sqlalchemy.exc import IntegrityError
from datetime import datetime, timezone

from app.models import (
    Account, AccountTypeEnum, AccountStatusEnum,
    UserProfile, FarmerProfile, BusinessProfile,
    VerificationRecord, VerificationTypeEnum, VerificationStatusEnum,
    Role, AccountRole
)


class AccountService:
    """
    Service for managing accounts and their associated profiles.
    """

    def __init__(self, db: Session):
        self.db = db

    def create_account_from_auth_provider(
        self,
        external_auth_id: str,
        email: str,
        account_type: str,
        **additional_data
    ) -> Account:
        """
        Create a new account with associated profiles from authentication provider registration data.

        Args:
            external_auth_id: User's external auth provider ID (unique identifier)
            email: User's email address
            account_type: Account type (farmer/wholesaler/admin)
            **additional_data: Additional profile data

        Returns:
            Created Account instance

        Raises:
            IntegrityError: If account already exists
        """
        try:
            # Normalize account_type to enum (handles both lowercase and UPPERCASE input)
            account_type_upper = account_type.upper() if isinstance(account_type, str) else account_type
            account_type_enum = AccountTypeEnum(account_type_upper)

            # Create the main account
            account = Account(
                external_auth_id=external_auth_id,
                email=email,
                account_type=account_type_enum,
                status=AccountStatusEnum.ACTIVE,  # Auth provider account is already confirmed
                is_verified=False,  # Requires separate verification process
                is_active=True,
                login_count=0
            )

            self.db.add(account)
            self.db.flush()  # Get the account ID

            # Create user profile
            user_profile = UserProfile(
                account_id=account.id,
                name=additional_data.get("name"),
                phone_number=additional_data.get("phone_number"),
                address=additional_data.get("address"),
                profile_metadata={}
            )
            self.db.add(user_profile)

            # Create type-specific profiles using enum comparison
            if account_type_enum == AccountTypeEnum.FARMER:
                farmer_profile = FarmerProfile(
                    account_id=account.id,
                    farm_name=additional_data.get("farm_name"),
                    farm_location=additional_data.get("farm_location"),
                    farm_size=additional_data.get("farm_size"),
                    certifications={},
                    crop_types={},
                    farming_methods={},
                    equipment={}
                )
                self.db.add(farmer_profile)

            elif account_type_enum in [AccountTypeEnum.WHOLESALER, AccountTypeEnum.ADMIN]:
                business_profile = BusinessProfile(
                    account_id=account.id,
                    business_name=additional_data.get("business_name", f"{additional_data.get('name', email)} Business"),
                    business_license=additional_data.get("business_license"),
                    business_address=additional_data.get("business_address", additional_data.get("address")),
                    business_type=account_type_enum.value,
                    verification_documents={},
                    business_categories={},
                    service_areas={},
                    capacity={}
                )
                self.db.add(business_profile)

            # Assign default role (role names should match enum values)
            role = self.db.query(Role).filter(Role.name == account_type_enum.value).first()
            if role:
                account_role = AccountRole(
                    account_id=account.id,
                    role_id=role.id,
                    assigned_by="system",
                    assigned_at=datetime.now(timezone.utc)
                )
                self.db.add(account_role)


            self.db.commit()
            self.db.refresh(account)
            return account

        except IntegrityError:
            self.db.rollback()
            raise

    def get_account_by_external_auth_id(self, external_auth_id: str) -> Optional[Account]:
        """Get account by external auth provider ID."""
        return self.db.query(Account).filter(Account.external_auth_id == external_auth_id).first()

    def get_account_by_email(self, email: str) -> Optional[Account]:
        """Get account by email address."""
        return self.db.query(Account).filter(Account.email == email).first()

    def get_account_by_phone(self, phone_number: str) -> Optional[Account]:
        """
        Get account by phone number.

        Args:
            phone_number: Phone number (will be normalized internally)

        Returns:
            Account if found, None otherwise
        """
        from app.utils.phone_validation import normalize_phone_number

        try:
            # Normalize phone to E.164 format for consistent lookup
            normalized_phone = normalize_phone_number(phone_number)
        except ValueError:
            # Invalid phone format
            return None

        # Query UserProfile for matching phone, join to Account
        user_profile = self.db.query(UserProfile).filter(
            UserProfile.phone_number == normalized_phone
        ).first()

        if user_profile and user_profile.account:
            return user_profile.account

        return None

    def get_account_with_profiles(self, account_id: int) -> Optional[Account]:
        """Get account with all associated profiles loaded."""
        return self.db.query(Account).filter(Account.id == account_id).first()

    def update_last_login(self, account: Account, ip_address: str = None, user_agent: str = None) -> Account:
        """
        Update account's last login timestamp.
        """
        account.last_login_at = datetime.now(timezone.utc)
        account.login_count += 1

        self.db.commit()
        self.db.refresh(account)
        return account

    def update_profile(self, account: Account, profile_data: Dict[str, Any]) -> Account:
        """
        Update account profile data.
        """
        # Update user profile
        if account.profile:
            for field in ["name", "phone_number", "address"]:
                if field in profile_data:
                    setattr(account.profile, field, profile_data[field])

        # Update type-specific profiles
        if account.is_farmer and account.farmer_profile:
            farmer_fields = [
                "farm_name", "farm_location", "farm_size",
                "farm_address", "farm_street", "farm_city", "farm_province",
                "farm_postal_code", "farm_country", "farm_latitude", "farm_longitude",
                "farm_place_id", "farm_elevation",
            ]
            for field in farmer_fields:
                if field in profile_data:
                    setattr(account.farmer_profile, field, profile_data[field])

            # Sync legacy fields when structured data is provided
            if "farm_address" in profile_data and profile_data["farm_address"]:
                account.farmer_profile.farm_location = profile_data["farm_address"]
            if "farm_latitude" in profile_data and "farm_longitude" in profile_data:
                lat = profile_data.get("farm_latitude")
                lng = profile_data.get("farm_longitude")
                if lat is not None and lng is not None:
                    account.farmer_profile.farm_coordinates = f"{lat},{lng}"

        elif account.is_wholesaler and account.business_profile:
            business_fields = [
                "business_name", "business_license", "business_address", "business_type",
                "business_street", "business_city", "business_province",
                "business_postal_code", "business_country", "business_latitude",
                "business_longitude", "business_place_id",
                "registration_number", "number_of_employees", "years_in_operation",
                "preferred_produce", "business_categories", "capacity",
            ]
            for field in business_fields:
                if field in profile_data:
                    setattr(account.business_profile, field, profile_data[field])

        self.db.commit()
        self.db.refresh(account)
        return account

    def submit_verification(
        self,
        account: Account,
        verification_type: VerificationTypeEnum,
        documents: Dict[str, Any],
        metadata: Dict[str, Any] = None
    ) -> VerificationRecord:
        """
        Submit verification documents for an account.
        """
        verification = VerificationRecord(
            account_id=account.id,
            verification_type=verification_type,
            status=VerificationStatusEnum.PENDING,
            documents=documents,
            verification_metadata=metadata or {},
            submitted_at=datetime.now(timezone.utc)
        )
        self.db.add(verification)

        self.db.commit()
        self.db.refresh(verification)
        return verification

    def get_account_roles(self, account: Account) -> List[Role]:
        """Get all roles assigned to an account."""
        return [ar.role for ar in account.account_roles if ar.role.is_active]

    def get_account_permissions(self, account: Account) -> Dict[str, bool]:
        """Get consolidated permissions for an account."""
        permissions = {}
        roles = self.get_account_roles(account)

        for role in roles:
            if role.permissions:
                permissions.update(role.permissions)

        return permissions

    def get_verification_status(self, account: Account) -> Dict[str, str]:
        """Get verification status for all verification types."""
        verifications = self.db.query(VerificationRecord).filter(
            VerificationRecord.account_id == account.id
        ).all()

        status_map = {}
        for verification in verifications:
            status_map[verification.verification_type.value] = verification.status.value

        return status_map

