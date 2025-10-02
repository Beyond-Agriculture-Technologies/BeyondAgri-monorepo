from typing import Dict, Any, Optional, List
from sqlalchemy.orm import Session
from sqlalchemy.exc import IntegrityError
from datetime import datetime

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
            # Create the main account
            account = Account(
                external_auth_id=external_auth_id,
                email=email,
                account_type=AccountTypeEnum(account_type),
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

            # Create type-specific profiles
            if account_type == "farmer":
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

            elif account_type in ["wholesaler", "admin"]:
                business_profile = BusinessProfile(
                    account_id=account.id,
                    business_name=additional_data.get("business_name", f"{additional_data.get('name', email)} Business"),
                    business_license=additional_data.get("business_license"),
                    business_address=additional_data.get("business_address", additional_data.get("address")),
                    business_type=account_type,
                    verification_documents={},
                    business_categories={},
                    service_areas={},
                    capacity={}
                )
                self.db.add(business_profile)

            # Assign default role
            role = self.db.query(Role).filter(Role.name == account_type).first()
            if role:
                account_role = AccountRole(
                    account_id=account.id,
                    role_id=role.id,
                    assigned_by="system",
                    assigned_at=datetime.utcnow()
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

    def get_account_with_profiles(self, account_id: int) -> Optional[Account]:
        """Get account with all associated profiles loaded."""
        return self.db.query(Account).filter(Account.id == account_id).first()

    def update_last_login(self, account: Account, ip_address: str = None, user_agent: str = None) -> Account:
        """
        Update account's last login timestamp.
        """
        account.last_login_at = datetime.utcnow()
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
            for field in ["farm_name", "farm_location", "farm_size"]:
                if field in profile_data:
                    setattr(account.farmer_profile, field, profile_data[field])

        elif account.is_wholesaler and account.business_profile:
            for field in ["business_name", "business_license", "business_address", "business_type"]:
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
            submitted_at=datetime.utcnow()
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

