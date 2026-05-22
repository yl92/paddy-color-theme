-- Demo SQL — exercises a wide range of syntax for theme testing.
-- Dialect leans PostgreSQL; most of it is standard ANSI.

BEGIN;

CREATE SCHEMA IF NOT EXISTS paddy AUTHORIZATION current_user;

DROP TABLE IF EXISTS paddy.users CASCADE;
CREATE TABLE paddy.users (
    id           BIGSERIAL PRIMARY KEY,
    handle       VARCHAR(64) NOT NULL UNIQUE,
    email        TEXT        CHECK (email LIKE '%@%'),
    role         TEXT        NOT NULL DEFAULT 'user'
                             CHECK (role IN ('admin', 'user', 'guest')),
    metadata     JSONB       NOT NULL DEFAULT '{}'::JSONB,
    created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    deleted_at   TIMESTAMPTZ
);

CREATE INDEX users_role_idx ON paddy.users (role) WHERE deleted_at IS NULL;
CREATE INDEX users_meta_gin ON paddy.users USING GIN (metadata);

-- Sample inserts
INSERT INTO paddy.users (handle, email, role, metadata) VALUES
    ('alice',  'alice@example.com',  'admin', '{"hits": 42, "vip": true}'),
    ('bob',    'bob@example.com',    'user',  '{}'),
    ('carol',  NULL,                 'guest', '{"hits": 0}')
ON CONFLICT (handle) DO UPDATE
    SET updated_at = NOW(),
        metadata   = paddy.users.metadata || EXCLUDED.metadata;

-- A meatier query
WITH activity AS (
    SELECT
        u.id,
        u.handle,
        u.role,
        (u.metadata->>'hits')::INT AS hits,
        EXTRACT(EPOCH FROM (NOW() - u.created_at))::INT AS age_seconds
    FROM paddy.users AS u
    WHERE u.deleted_at IS NULL
)
SELECT
    role,
    COUNT(*)                        AS user_count,
    SUM(hits)                       AS total_hits,
    AVG(hits)::NUMERIC(10, 2)       AS avg_hits,
    PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY age_seconds) AS median_age
FROM activity
GROUP BY role
HAVING SUM(hits) > 0
ORDER BY total_hits DESC NULLS LAST
LIMIT 10;

-- A window function
SELECT
    handle,
    hits,
    RANK()       OVER (PARTITION BY role ORDER BY hits DESC) AS rank_in_role,
    LAG(hits, 1) OVER (ORDER BY hits DESC)                   AS prev_hits
FROM activity;

-- A trigger
CREATE OR REPLACE FUNCTION paddy.bump_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at := NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER users_bump_updated_at
    BEFORE UPDATE ON paddy.users
    FOR EACH ROW
    EXECUTE FUNCTION paddy.bump_updated_at();

COMMIT;
