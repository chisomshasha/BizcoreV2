"""
BizCore Permission System
=========================
Dynamic, database-backed CRUD permission matrix.

Architecture
------------
- Permissions are stored in MongoDB collection `role_permissions`.
- One document per role, keyed by `role` field.
- Shape:  { role, permissions: { module: { create, read, update, delete } }, updated_at, updated_by }
- On first boot (or when a role has no DB record) the system falls back to
  DEFAULT_PERMISSIONS below, which mirrors the original hardcoded behaviour.
- Super Admin, General Manager, and Accountant always get full read on every
  module regardless of what the DB says (per product spec: "top 3 roles see everything").
- Only Super Admin can write to the permissions collection.
"""

from datetime import datetime, timezone
from typing import Dict, Optional
from pydantic import BaseModel, Field

# ── Module registry ────────────────────────────────────────────────────────────
# These are the logical module names surfaced in the UI.
MODULES = [
    "products",
    "inventory",
    "suppliers",
    "distributors",
    "purchase_orders",
    "sales_orders",
    "invoices",
    "expenses",
    "requisitions",
    "quotations",
    "grn",
    "warehouses",
    "users",
    "reports",
    "delivery_notes",
    "bom",
    "warehouse_transfers",
    "three_way_match",
    "audit_logs",
    "agent_ledger",
]

# Human-readable labels for the UI
MODULE_LABELS: Dict[str, str] = {
    "products":            "Products",
    "inventory":           "Inventory",
    "suppliers":           "Suppliers",
    "distributors":        "Distributors",
    "purchase_orders":     "Purchase Orders",
    "sales_orders":        "Sales Orders",
    "invoices":            "Invoices & Payments",
    "expenses":            "Expenses",
    "requisitions":        "Purchase Requisitions",
    "quotations":          "Quotations",
    "grn":                 "Goods Receipt (GRN)",
    "warehouses":          "Warehouses",
    "users":               "User Management",
    "reports":             "Reports",
    "delivery_notes":      "Delivery Notes",
    "bom":                 "Bill of Materials",
    "warehouse_transfers": "Warehouse Transfers",
    "three_way_match":     "3-Way Matching",
    "audit_logs":          "Audit Logs",
    "agent_ledger":        "Agent Ledger",
}

# Roles that always bypass permission checks (own everything)
ALWAYS_FULL_ACCESS_ROLES = {"super_admin", "general_manager"}

# Roles that always get full READ on all modules (per spec: "top 3 see everything")
ALWAYS_READ_ROLES = {"super_admin", "general_manager", "accountant"}

# ── Pydantic models ────────────────────────────────────────────────────────────

class CRUDPermission(BaseModel):
    create: bool = False
    read:   bool = False
    update: bool = False
    delete: bool = False


class RolePermissionDoc(BaseModel):
    """Stored in MongoDB `role_permissions` collection."""
    role:        str
    permissions: Dict[str, CRUDPermission] = Field(default_factory=dict)
    updated_at:  datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    updated_by:  Optional[str] = None


class PermissionUpdateRequest(BaseModel):
    """Body for PUT /admin/role-permissions/{role}"""
    permissions: Dict[str, CRUDPermission]


# ── Default permission matrix ──────────────────────────────────────────────────
# Mirrors the original hardcoded behaviour.
# True = granted, False = denied.
# Note: super_admin and general_manager short-circuit at runtime — their rows
#       are defined here for completeness / UI display only.

_FULL  = CRUDPermission(create=True,  read=True,  update=True,  delete=True)
_CRU   = CRUDPermission(create=True,  read=True,  update=True,  delete=False)
_CR    = CRUDPermission(create=True,  read=True,  update=False, delete=False)
_R     = CRUDPermission(create=False, read=True,  update=False, delete=False)
_NONE  = CRUDPermission(create=False, read=False, update=False, delete=False)
_RU    = CRUDPermission(create=False, read=True,  update=True,  delete=False)

DEFAULT_PERMISSIONS: Dict[str, Dict[str, CRUDPermission]] = {
    # ── Top-tier ─────────────────────────────────────────────────────────────
    "super_admin": {m: _FULL for m in MODULES},
    "general_manager": {m: _FULL for m in MODULES},

    # ── Accountant – full read everywhere + finance write ────────────────────
    "accountant": {
        "products":            _R,
        "inventory":           _R,
        "suppliers":           _R,
        "distributors":        _R,
        "purchase_orders":     _R,
        "sales_orders":        _R,
        "invoices":            _FULL,
        "expenses":            _FULL,
        "requisitions":        _R,
        "quotations":          _R,
        "grn":                 _R,
        "warehouses":          _R,
        "users":               _NONE,
        "reports":             _R,
        "delivery_notes":      _R,
        "bom":                 _R,
        "warehouse_transfers": _R,
        "three_way_match":     _R,
        "audit_logs":          _R,
        "agent_ledger":        _R,
    },

    # ── Manager / Warehouse Manager ──────────────────────────────────────────
    "manager": {
        "products":            _FULL,
        "inventory":           _FULL,
        "suppliers":           _FULL,
        "distributors":        _FULL,
        "purchase_orders":     _FULL,
        "sales_orders":        _FULL,
        "invoices":            _FULL,
        "expenses":            _FULL,
        "requisitions":        _RU,    # approve/reject
        "quotations":          _RU,    # approve/reject
        "grn":                 _FULL,
        "warehouses":          _FULL,
        "users":               _CRU,   # cannot delete / demote super_admin
        "reports":             _R,
        "delivery_notes":      _FULL,
        "bom":                 _FULL,
        "warehouse_transfers": _FULL,
        "three_way_match":     _FULL,
        "audit_logs":          _R,
        "agent_ledger":        _R,
    },
    "warehouse_manager": {  # same as manager by default
        "products":            _FULL,
        "inventory":           _FULL,
        "suppliers":           _FULL,
        "distributors":        _FULL,
        "purchase_orders":     _FULL,
        "sales_orders":        _FULL,
        "invoices":            _FULL,
        "expenses":            _FULL,
        "requisitions":        _RU,
        "quotations":          _RU,
        "grn":                 _FULL,
        "warehouses":          _FULL,
        "users":               _CRU,
        "reports":             _R,
        "delivery_notes":      _FULL,
        "bom":                 _FULL,
        "warehouse_transfers": _FULL,
        "three_way_match":     _FULL,
        "audit_logs":          _R,
        "agent_ledger":        _R,
    },

    # ── Purchase Clerk ───────────────────────────────────────────────────────
    "purchase_clerk": {
        "products":            _R,
        "inventory":           _RU,    # can adjust stock
        "suppliers":           _FULL,
        "distributors":        _R,
        "purchase_orders":     _CR,
        "sales_orders":        _R,
        "invoices":            _CR,
        "expenses":            _R,
        "requisitions":        _CR,
        "quotations":          _R,
        "grn":                 _FULL,
        "warehouses":          _R,
        "users":               _NONE,
        "reports":             _R,
        "delivery_notes":      _R,
        "bom":                 _R,
        "warehouse_transfers": _R,
        "three_way_match":     _R,
        "audit_logs":          _R,
        "agent_ledger":        _NONE,
    },

    # ── Sales Executive / Sales Rep ──────────────────────────────────────────
    "sales_executive": {
        "products":            _R,
        "inventory":           _R,
        "suppliers":           _R,
        "distributors":        _FULL,
        "purchase_orders":     _R,
        "sales_orders":        _FULL,
        "invoices":            _CR,
        "expenses":            _R,
        "requisitions":        _R,
        "quotations":          _CR,
        "grn":                 _R,
        "warehouses":          _R,
        "users":               _NONE,
        "reports":             _R,
        "delivery_notes":      _FULL,
        "bom":                 _R,
        "warehouse_transfers": _R,
        "three_way_match":     _R,
        "audit_logs":          _R,
        "agent_ledger":        _CR,
    },
    "sales_rep": {  # same as sales_executive by default
        "products":            _R,
        "inventory":           _R,
        "suppliers":           _R,
        "distributors":        _FULL,
        "purchase_orders":     _R,
        "sales_orders":        _FULL,
        "invoices":            _CR,
        "expenses":            _R,
        "requisitions":        _R,
        "quotations":          _CR,
        "grn":                 _R,
        "warehouses":          _R,
        "users":               _NONE,
        "reports":             _R,
        "delivery_notes":      _FULL,
        "bom":                 _R,
        "warehouse_transfers": _R,
        "three_way_match":     _R,
        "audit_logs":          _R,
        "agent_ledger":        _CR,
    },

    # ── Sales Clerk ──────────────────────────────────────────────────────────
    "sales_clerk": {
        "products":            _R,
        "inventory":           _R,
        "suppliers":           _R,
        "distributors":        _R,
        "purchase_orders":     _R,
        "sales_orders":        _CR,
        "invoices":            _R,
        "expenses":            _R,
        "requisitions":        _R,
        "quotations":          _R,
        "grn":                 _R,
        "warehouses":          _R,
        "users":               _NONE,
        "reports":             _R,
        "delivery_notes":      _R,
        "bom":                 _R,
        "warehouse_transfers": _R,
        "three_way_match":     _R,
        "audit_logs":          _R,
        "agent_ledger":        _NONE,
    },

    # ── Viewer ───────────────────────────────────────────────────────────────
    "viewer": {m: _R for m in MODULES if m not in ("users", "agent_ledger")},
}
# Ensure viewer has _NONE for restricted modules
DEFAULT_PERMISSIONS["viewer"]["users"]        = _NONE
DEFAULT_PERMISSIONS["viewer"]["agent_ledger"] = _NONE


# ── Runtime helpers ────────────────────────────────────────────────────────────

def _empty_module_map() -> Dict[str, CRUDPermission]:
    return {m: CRUDPermission() for m in MODULES}


def _merge_with_defaults(role: str, db_perms: Optional[Dict]) -> Dict[str, CRUDPermission]:
    """
    Return the effective permission map for a role.
    DB values override defaults; missing modules fall back to defaults.
    """
    base = DEFAULT_PERMISSIONS.get(role, _empty_module_map())
    if not db_perms:
        return base
    merged = dict(base)
    for module, crud in db_perms.items():
        if module in MODULES:
            if isinstance(crud, dict):
                merged[module] = CRUDPermission(**crud)
            elif isinstance(crud, CRUDPermission):
                merged[module] = crud
    return merged


# ── In-process cache ───────────────────────────────────────────────────────────
# Keyed by role string. Populated lazily, invalidated on any write.
_permission_cache: Dict[str, Dict[str, CRUDPermission]] = {}


def invalidate_cache(role: Optional[str] = None):
    """Call after any permission write. Pass role to clear one entry, or None for all."""
    global _permission_cache
    if role:
        _permission_cache.pop(role, None)
    else:
        _permission_cache.clear()


async def get_role_permissions(db, role: str) -> Dict[str, CRUDPermission]:
    """
    Return effective CRUD map for a role.
    Checks in-process cache → MongoDB → hardcoded defaults.
    """
    if role in _permission_cache:
        return _permission_cache[role]

    doc = await db.role_permissions.find_one({"role": role}, {"_id": 0})
    raw = doc.get("permissions", {}) if doc else {}
    perms = _merge_with_defaults(role, raw)
    _permission_cache[role] = perms
    return perms


async def check_permission(db, role: str, module: str, operation: str) -> bool:
    """
    Return True if `role` may perform `operation` (create/read/update/delete)
    on `module`.

    Super Admin and General Manager always return True.
    Accountant always gets read=True.
    """
    if role in ALWAYS_FULL_ACCESS_ROLES:
        return True
    if operation == "read" and role in ALWAYS_READ_ROLES:
        return True

    perms = await get_role_permissions(db, role)
    module_perm = perms.get(module)
    if not module_perm:
        return False
    return getattr(module_perm, operation, False)


async def assert_permission(db, role: str, module: str, operation: str):
    """Raise 403 HTTPException if permission is denied."""
    from fastapi import HTTPException
    allowed = await check_permission(db, role, module, operation)
    if not allowed:
        raise HTTPException(
            status_code=403,
            detail=f"Your role does not have '{operation}' permission on '{MODULE_LABELS.get(module, module)}'."
        )


async def seed_default_permissions(db):
    """
    Idempotent seed: insert default permission docs for any role that has no
    DB record yet. Safe to call at app startup.
    """
    for role, perms in DEFAULT_PERMISSIONS.items():
        existing = await db.role_permissions.find_one({"role": role})
        if not existing:
            await db.role_permissions.insert_one({
                "role": role,
                "permissions": {m: p.model_dump() for m, p in perms.items()},
                "updated_at": datetime.now(timezone.utc),
                "updated_by": "system",
            })
