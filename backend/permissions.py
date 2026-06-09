"""
BizCore Permission System
=========================
Dynamic, database-backed CRUD permission matrix.

Roles (unified — no legacy aliases):
  super_admin       – full access, cross-warehouse
  general_manager   – full access, cross-warehouse
  warehouse_manager – full access within assigned warehouse
  purchase_clerk    – procurement workflow
  sales_rep         – field agent; creates quotations, views own ledger
  sales_clerk       – internal; dispatches goods, processes orders
  accountant        – finance read + invoice/expense write
  viewer            – read-only everywhere (except users & agent_ledger)
"""

from datetime import datetime, timezone
from typing import Dict, Optional
from pydantic import BaseModel, Field

# ── Module registry ────────────────────────────────────────────────────────────
MODULES = [
    "products",
    "inventory",
    "suppliers",
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

MODULE_LABELS: Dict[str, str] = {
    "products":            "Products",
    "inventory":           "Inventory",
    "suppliers":           "Suppliers",
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

ALWAYS_FULL_ACCESS_ROLES = {"super_admin", "general_manager"}
ALWAYS_READ_ROLES = {"super_admin", "general_manager", "accountant"}

# ── Pydantic models ────────────────────────────────────────────────────────────
class CRUDPermission(BaseModel):
    create: bool = False
    read:   bool = False
    update: bool = False
    delete: bool = False

class RolePermissionDoc(BaseModel):
    role:        str
    permissions: Dict[str, CRUDPermission] = Field(default_factory=dict)
    updated_at:  datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    updated_by:  Optional[str] = None

class PermissionUpdateRequest(BaseModel):
    permissions: Dict[str, CRUDPermission]

# ── Shortcuts ──────────────────────────────────────────────────────────────────
_FULL = CRUDPermission(create=True,  read=True,  update=True,  delete=True)
_CRU  = CRUDPermission(create=True,  read=True,  update=True,  delete=False)
_CR   = CRUDPermission(create=True,  read=True,  update=False, delete=False)
_R    = CRUDPermission(create=False, read=True,  update=False, delete=False)
_RU   = CRUDPermission(create=False, read=True,  update=True,  delete=False)
_NONE = CRUDPermission(create=False, read=False, update=False, delete=False)

DEFAULT_PERMISSIONS: Dict[str, Dict[str, CRUDPermission]] = {

    # ── Cross-warehouse full access ───────────────────────────────────────────
    "super_admin":     {m: _FULL for m in MODULES},
    "general_manager": {m: _FULL for m in MODULES},

    # ── Warehouse Manager — full access within their warehouse ────────────────
    "warehouse_manager": {
        "products":            _FULL,
        "inventory":           _FULL,
        "suppliers":           _FULL,
        "purchase_orders":     _FULL,
        "sales_orders":        _FULL,
        "invoices":            _FULL,
        "expenses":            _FULL,
        "requisitions":        _RU,    # approve/reject
        "quotations":          _RU,    # approve/reject agent quotations
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

    # ── Accountant — full read + finance write ────────────────────────────────
    "accountant": {
        "products":            _R,
        "inventory":           _R,
        "suppliers":           _R,
        "purchase_orders":     _R,
        "sales_orders":        _R,
        "invoices":            _FULL,
        "expenses":            _FULL,
        "requisitions":        _R,
        "quotations":          _R,
        "grn":                 _R,
        "warehouses":          _R,
        "users":               _CRU,
        "reports":             _R,
        "delivery_notes":      _R,
        "bom":                 _R,
        "warehouse_transfers": _R,
        "three_way_match":     _R,
        "audit_logs":          _R,
        "agent_ledger":        _R,
    },

    # ── Purchase Clerk ────────────────────────────────────────────────────────
    "purchase_clerk": {
        "products":            _R,
        "inventory":           _RU,
        "suppliers":           _FULL,
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

    # ── Sales Rep (field agent) ───────────────────────────────────────────────
    "sales_rep": {
        "products":            _R,
        "inventory":           _R,
        "suppliers":           _NONE,
        "purchase_orders":     _NONE,
        "sales_orders":        _R,     # read own SOs
        "invoices":            _NONE,
        "expenses":            _NONE,
        "requisitions":        _NONE,
        "quotations":          _CR,    # create + read own quotations
        "grn":                 _NONE,
        "warehouses":          _R,
        "users":               _NONE,
        "reports":             _NONE,
        "delivery_notes":      _R,
        "bom":                 _NONE,
        "warehouse_transfers": _NONE,
        "three_way_match":     _NONE,
        "audit_logs":          _NONE,
        "agent_ledger":        _R,     # read own ledger (accounts receivable dashboard)
    },

    # ── Sales Clerk (internal dispatch staff) ─────────────────────────────────
    "sales_clerk": {
        "products":            _R,
        "inventory":           _R,
        "suppliers":           _R,
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

    # ── Viewer ────────────────────────────────────────────────────────────────
    "viewer": {m: _R for m in MODULES if m not in ("users", "agent_ledger")},
}
DEFAULT_PERMISSIONS["viewer"]["users"]        = _NONE
DEFAULT_PERMISSIONS["viewer"]["agent_ledger"] = _NONE


# ── Runtime helpers ────────────────────────────────────────────────────────────
def _empty_module_map() -> Dict[str, CRUDPermission]:
    return {m: CRUDPermission() for m in MODULES}

def _merge_with_defaults(role: str, db_perms: Optional[Dict]) -> Dict[str, CRUDPermission]:
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

_permission_cache: Dict[str, Dict[str, CRUDPermission]] = {}

def invalidate_cache(role: Optional[str] = None):
    global _permission_cache
    if role:
        _permission_cache.pop(role, None)
    else:
        _permission_cache.clear()

async def get_role_permissions(db, role: str) -> Dict[str, CRUDPermission]:
    if role in _permission_cache:
        return _permission_cache[role]
    doc = await db.role_permissions.find_one({"role": role}, {"_id": 0})
    raw = doc.get("permissions", {}) if doc else {}
    perms = _merge_with_defaults(role, raw)
    _permission_cache[role] = perms
    return perms

async def check_permission(db, role: str, module: str, operation: str) -> bool:
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
    from fastapi import HTTPException
    allowed = await check_permission(db, role, module, operation)
    if not allowed:
        raise HTTPException(
            status_code=403,
            detail=f"Your role does not have '{operation}' permission on '{MODULE_LABELS.get(module, module)}'."
        )

async def seed_default_permissions(db):
    for role, perms in DEFAULT_PERMISSIONS.items():
        existing = await db.role_permissions.find_one({"role": role})
        if not existing:
            await db.role_permissions.insert_one({
                "role": role,
                "permissions": {m: p.model_dump() for m, p in perms.items()},
                "updated_at": datetime.now(timezone.utc),
                "updated_by": "system",
            })
