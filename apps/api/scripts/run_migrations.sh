#!/bin/bash

# Script to run database migrations for timezone fix
# Usage: ./scripts/run_migrations.sh

set -e  # Exit on error

echo "=========================================="
echo "Running Timezone Fix Database Migrations"
echo "=========================================="
echo ""

# Check if we're in the correct directory
if [ ! -f "alembic.ini" ]; then
    echo "Error: alembic.ini not found. Please run this script from the /apps/api directory."
    exit 1
fi

# Check if uv is installed
if ! command -v uv &> /dev/null; then
    echo "Error: uv is not installed. Please install it first:"
    echo "  curl -LsSf https://astral.sh/uv/install.sh | sh"
    exit 1
fi

# Show current migration status
echo "Current migration status:"
uv run alembic current
echo ""

# Show pending migrations
echo "Pending migrations:"
uv run alembic show head
echo ""

# Ask for confirmation
read -p "Do you want to apply these migrations? (y/n) " -n 1 -r
echo ""

if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo "Migration cancelled."
    exit 0
fi

# Run migrations
echo ""
echo "Applying migrations..."
uv run alembic upgrade head

# Show new status
echo ""
echo "Migration complete! New status:"
uv run alembic current

echo ""
echo "=========================================="
echo "Verifying database changes..."
echo "=========================================="

# Create a Python script to verify the changes
cat > /tmp/verify_migrations.py << 'EOF'
from sqlalchemy import create_engine, inspect, text
from src.core.database import get_database_url
import sys

def verify_migrations():
    """Verify that all timezone fix migrations were applied correctly."""
    print("\nVerifying database schema changes...\n")

    engine = create_engine(get_database_url())
    inspector = inspect(engine)

    # Check transactions.occurred_at is now date type
    print("1. Checking transactions.occurred_at column type...")
    columns = {col['name']: col for col in inspector.get_columns('transactions')}
    occurred_at = columns.get('occurred_at')
    if occurred_at:
        col_type = str(occurred_at['type']).upper()
        if 'DATE' in col_type and 'TIME' not in col_type:
            print("   ✓ transactions.occurred_at is DATE type")
        else:
            print(f"   ✗ transactions.occurred_at is {col_type} (expected DATE)")
            return False
    else:
        print("   ✗ transactions.occurred_at column not found")
        return False

    # Check recurring_templates dates
    print("\n2. Checking recurring_templates date columns...")
    rt_columns = {col['name']: col for col in inspector.get_columns('recurring_templates')}

    for col_name in ['start_date', 'end_date']:
        col = rt_columns.get(col_name)
        if col:
            col_type = str(col['type']).upper()
            if 'DATE' in col_type and 'TIME' not in col_type:
                print(f"   ✓ recurring_templates.{col_name} is DATE type")
            else:
                print(f"   ✗ recurring_templates.{col_name} is {col_type} (expected DATE)")
                return False
        else:
            print(f"   ✗ recurring_templates.{col_name} column not found")
            return False

    # Check profiles.timezone exists
    print("\n3. Checking profiles.timezone column...")
    profile_columns = {col['name']: col for col in inspector.get_columns('profiles')}
    timezone_col = profile_columns.get('timezone')
    if timezone_col:
        print("   ✓ profiles.timezone column exists")
        default = timezone_col.get('default')
        if default:
            print(f"   ✓ Default value: {default}")
        else:
            print("   ! No default value set (this is okay if handled by SQLAlchemy)")
    else:
        print("   ✗ profiles.timezone column not found")
        return False

    # Count existing data
    print("\n4. Checking existing data...")
    with engine.connect() as conn:
        result = conn.execute(text("SELECT COUNT(*) FROM transactions"))
        count = result.scalar()
        print(f"   ℹ Found {count} transactions in database")

        if count > 0:
            result = conn.execute(text("SELECT occurred_at FROM transactions LIMIT 1"))
            sample = result.scalar()
            print(f"   ℹ Sample occurred_at value: {sample}")

    print("\n" + "="*50)
    print("✓ All migrations verified successfully!")
    print("="*50)
    return True

if __name__ == '__main__':
    try:
        success = verify_migrations()
        sys.exit(0 if success else 1)
    except Exception as e:
        print(f"\n✗ Verification failed: {e}")
        import traceback
        traceback.print_exc()
        sys.exit(1)
EOF

# Run verification
echo ""
uv run python /tmp/verify_migrations.py

# Clean up
rm /tmp/verify_migrations.py

echo ""
echo "=========================================="
echo "Migration process complete!"
echo "=========================================="
echo ""
echo "Next steps:"
echo "  1. Run tests: uv run pytest"
echo "  2. Test API endpoints manually"
echo "  3. Deploy to production"
echo ""
