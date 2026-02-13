-- AU Sentinel PostgreSQL initialization
-- This runs automatically on first container start

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Grant privileges
GRANT ALL PRIVILEGES ON DATABASE ausentinel TO ausentinel;
