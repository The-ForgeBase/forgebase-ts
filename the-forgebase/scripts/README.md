# Auth Initialization Script

This script automates the initialization of authentication schema, admin tables, and initial admin setup.

## Usage

1. Set up your environment variables in a `.env` file or export them directly:

```bash
# Required variables
DB_USER=your_db_user
DB_PASSWORD=your_db_password
DB_NAME=your_db_name
ADMIN_EMAIL=admin@example.com
ADMIN_PASSWORD=secure_password

# Optional variables (shown with defaults)
DB_CLIENT=pg
DB_HOST=localhost
DB_PORT=5432
CREATE_INITIAL_API_KEY=true
INITIAL_API_KEY_NAME="Initial Admin Key"
INITIAL_API_KEY_SCOPES="*"
```

2. Run the script:

```bash
# Using ts-node
ts-node scripts/initialize-auth.ts

# Or using npm script (add to package.json):
# "scripts": {
#   "init-auth": "ts-node scripts/initialize-auth.ts"
# }
npm run init-auth
```

## Environment Variables

- `DB_CLIENT`: Database client (default: 'pg' for PostgreSQL)
- `DB_HOST`: Database host (default: 'localhost')
- `DB_PORT`: Database port (default: '5432')
- `DB_USER`: Database user (required)
- `DB_PASSWORD`: Database password (required)
- `DB_NAME`: Database name (required)
- `ADMIN_EMAIL`: Initial admin email (required)
- `ADMIN_PASSWORD`: Initial admin password (required)
- `CREATE_INITIAL_API_KEY`: Whether to create initial API key (default: 'true')
- `INITIAL_API_KEY_NAME`: Name for the initial API key (default: 'Initial Admin Key')
- `INITIAL_API_KEY_SCOPES`: Comma-separated list of API key scopes (default: '*')
