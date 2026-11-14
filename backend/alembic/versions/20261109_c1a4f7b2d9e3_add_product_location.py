"""add product geo location

Revision ID: c1a4f7b2d9e3
Revises: f8df81a7d113
Create Date: 2026-11-09 18:30:00.000000
"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = 'c1a4f7b2d9e3'
down_revision: Union[str, None] = 'f8df81a7d113'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column('products', sa.Column('location_details', sa.String(length=300), nullable=True))
    op.add_column('products', sa.Column('latitude', sa.Float(), nullable=True))
    op.add_column('products', sa.Column('longitude', sa.Float(), nullable=True))


def downgrade() -> None:
    with op.batch_alter_table('products') as batch_op:
        batch_op.drop_column('longitude')
        batch_op.drop_column('latitude')
        batch_op.drop_column('location_details')
