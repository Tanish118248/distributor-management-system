"""add credit control: customer limits/terms, order due dates and payments

Revision ID: a1c2d3e4f5a6
Revises: 0668c1ecf35c
Create Date: 2026-10-27 10:00:00

All new columns are nullable or have defaults, so existing rows keep working.
"""
from alembic import op
import sqlalchemy as sa


revision = 'a1c2d3e4f5a6'
down_revision = '0668c1ecf35c'
branch_labels = None
depends_on = None


def upgrade() -> None:
    # customers
    op.add_column('customers', sa.Column('credit_limit', sa.Numeric(12, 2), nullable=False, server_default='0'))
    op.add_column('customers', sa.Column('credit_days', sa.Integer(), nullable=False, server_default='15'))
    # orders
    op.add_column('orders', sa.Column('due_date', sa.Date(), nullable=True))
    op.add_column('orders', sa.Column('paid_amount', sa.Numeric(12, 2), nullable=False, server_default='0'))
    op.add_column('orders', sa.Column('paid_at', sa.DateTime(), nullable=True))
    op.add_column('orders', sa.Column('hold_reason', sa.String(), nullable=True))
    op.add_column('orders', sa.Column('delivery_confirmed_at', sa.DateTime(), nullable=True))
    # ledger
    op.add_column('ledger_entries', sa.Column('order_id', sa.Integer(), nullable=True))
    op.create_foreign_key('fk_ledger_entries_order_id', 'ledger_entries', 'orders', ['order_id'], ['id'])
    # old orders get a due date of order date + 15 days (the default credit terms)
    op.execute("UPDATE orders SET due_date = (order_date::date + 15) WHERE due_date IS NULL")


def downgrade() -> None:
    op.drop_constraint('fk_ledger_entries_order_id', 'ledger_entries', type_='foreignkey')
    op.drop_column('ledger_entries', 'order_id')
    for col in ('delivery_confirmed_at', 'hold_reason', 'paid_at', 'paid_amount', 'due_date'):
        op.drop_column('orders', col)
    op.drop_column('customers', 'credit_days')
    op.drop_column('customers', 'credit_limit')
