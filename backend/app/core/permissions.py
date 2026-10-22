"""What each role may do. Endpoints check permissions, never role names, so this table is the single source of truth."""

STAFF_READ = {"orders:read", "negotiations:read", "inventory:read", "audit:read", "analytics:read"}

ROLE_PERMISSIONS: dict[str, set[str]] = {
    # audit_trail:read is the activity log (who did what); "audit" is the fraud review queue
    "admin": STAFF_READ | {"orders:create", "negotiations:respond", "audit:decide", "users:manage", "audit_trail:read"},
    "operator": STAFF_READ | {"orders:create", "negotiations:respond"},
    "reviewer": STAFF_READ | {"audit:decide"},
    "analyst": STAFF_READ,
    # customers only ever see their own orders and offers: endpoints filter by User.customer_id
    "customer": {"orders:read", "orders:create", "negotiations:read", "negotiations:respond", "inventory:read"},
}

ROLES = tuple(ROLE_PERMISSIONS)
