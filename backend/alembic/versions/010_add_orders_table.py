"""Add orders table

Revision ID: 010_add_orders
Revises: 009_farm_elevation
Create Date: 2026-02-26

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '010_add_orders'
down_revision: Union[str, Sequence[str], None] = '009_farm_elevation'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.execute("""
        DO $$ BEGIN
            CREATE TYPE orderstatusenum AS ENUM (
                'PENDING', 'CONFIRMED', 'DECLINED', 'COMPLETED', 'CANCELLED'
            );
        EXCEPTION
            WHEN duplicate_object THEN null;
        END $$;
    """)

    op.execute("""
        CREATE TABLE orders (
            id SERIAL PRIMARY KEY,
            created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
            updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

            buyer_account_id INTEGER NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
            seller_account_id INTEGER NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
            listing_id INTEGER REFERENCES product_listings(id) ON DELETE SET NULL,

            listing_title VARCHAR(255) NOT NULL,

            quantity NUMERIC(10, 2) NOT NULL,
            unit VARCHAR(50) NOT NULL,
            price_per_unit NUMERIC(10, 2) NOT NULL,
            total_price NUMERIC(12, 2) NOT NULL,
            currency VARCHAR(3) NOT NULL DEFAULT 'ZAR',

            status orderstatusenum NOT NULL DEFAULT 'PENDING',

            confirmed_at TIMESTAMPTZ,
            declined_at TIMESTAMPTZ,
            completed_at TIMESTAMPTZ,
            cancelled_at TIMESTAMPTZ,

            buyer_notes TEXT,
            seller_notes TEXT,
            decline_reason TEXT
        );
    """)

    op.execute("CREATE INDEX ix_orders_id ON orders (id);")
    op.execute("CREATE INDEX ix_orders_buyer_account_id ON orders (buyer_account_id);")
    op.execute("CREATE INDEX ix_orders_seller_account_id ON orders (seller_account_id);")
    op.execute("CREATE INDEX ix_orders_listing_id ON orders (listing_id);")
    op.execute("CREATE INDEX ix_orders_status ON orders (status);")
    op.execute("CREATE INDEX ix_orders_buyer_status ON orders (buyer_account_id, status);")
    op.execute("CREATE INDEX ix_orders_seller_status ON orders (seller_account_id, status);")


def downgrade() -> None:
    op.execute("DROP TABLE IF EXISTS orders CASCADE;")
    op.execute("DROP TYPE IF EXISTS orderstatusenum CASCADE;")
