from typing import Dict, Any, Optional
from sqlalchemy.orm import Session
from sqlalchemy.exc import IntegrityError

from app.models.user import User, UserTypeEnum, UserStatusEnum
from app.schemas.user import UserProfile


class UserService:
    """
    Service for managing local user data in sync with Cognito.
    """

    def __init__(self, db: Session):
        self.db = db

    def create_user_from_cognito(
        self,
        cognito_sub: str,
        email: str,
        user_type: str,
        **additional_data
    ) -> User:
        """
        Create a local user record from Cognito registration data.

        Args:
            cognito_sub: User's Cognito sub (unique identifier)
            email: User's email address
            user_type: User type (farmer/wholesaler/admin)
            **additional_data: Additional user data

        Returns:
            Created User instance

        Raises:
            IntegrityError: If user already exists
        """
        try:
            # Create user with basic info
            db_user = User(
                cognito_sub=cognito_sub,
                email=email,
                user_type=UserTypeEnum(user_type),
                status=UserStatusEnum.CONFIRMED,  # Cognito user is already confirmed
                name=additional_data.get("name"),
                phone_number=additional_data.get("phone_number"),
                address=additional_data.get("address"),
                is_active=True
            )

            # Add type-specific fields
            if user_type == "farmer":
                db_user.farm_name = additional_data.get("farm_name")
                db_user.farm_location = additional_data.get("farm_location")
                db_user.farm_size = additional_data.get("farm_size")
            elif user_type == "wholesaler":
                db_user.business_name = additional_data.get("business_name")
                db_user.business_license = additional_data.get("business_license")
                db_user.business_address = additional_data.get("business_address")

            # Store additional profile data as JSON
            profile_data = {
                k: v for k, v in additional_data.items()
                if k not in ["name", "phone_number", "address", "farm_name",
                           "farm_location", "farm_size", "business_name",
                           "business_license", "business_address"]
            }
            if profile_data:
                db_user.profile_data = profile_data

            self.db.add(db_user)
            self.db.commit()
            self.db.refresh(db_user)
            return db_user

        except IntegrityError:
            self.db.rollback()
            raise

    def get_user_by_cognito_sub(self, cognito_sub: str) -> Optional[User]:
        """
        Get user by Cognito sub.

        Args:
            cognito_sub: User's Cognito sub

        Returns:
            User instance or None if not found
        """
        return self.db.query(User).filter(User.cognito_sub == cognito_sub).first()

    def get_user_by_email(self, email: str) -> Optional[User]:
        """
        Get user by email address.

        Args:
            email: User's email address

        Returns:
            User instance or None if not found
        """
        return self.db.query(User).filter(User.email == email).first()

    def update_user_profile(
        self,
        user: User,
        update_data: Dict[str, Any]
    ) -> User:
        """
        Update user profile data.

        Args:
            user: User instance to update
            update_data: Dictionary of fields to update

        Returns:
            Updated User instance
        """
        for field, value in update_data.items():
            if hasattr(user, field) and value is not None:
                setattr(user, field, value)

        self.db.commit()
        self.db.refresh(user)
        return user

    def update_last_login(self, user: User) -> User:
        """
        Update user's last login timestamp and increment login count.

        Args:
            user: User instance

        Returns:
            Updated User instance
        """
        from datetime import datetime

        user.last_login_at = datetime.utcnow()
        user.login_count = str(int(user.login_count or "0") + 1)

        self.db.commit()
        self.db.refresh(user)
        return user

    def to_user_profile(self, user: User) -> UserProfile:
        """
        Convert User model to UserProfile schema.

        Args:
            user: User model instance

        Returns:
            UserProfile schema instance
        """
        return UserProfile(
            user_id=user.email,  # Keep compatibility with Cognito
            user_sub=user.cognito_sub,
            email=user.email,
            user_type=user.user_type.value,
            name=user.name,
            phone_number=user.phone_number,
            address=user.address,
            status=user.status.value.upper()
        )