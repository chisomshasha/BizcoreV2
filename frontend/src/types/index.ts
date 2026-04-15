// BizCore Type Definitions

export type UserRole =
  | 'super_admin'
  | 'general_manager'
  | 'warehouse_manager'
  | 'manager'            // legacy alias
  | 'purchase_clerk'
  | 'sales_executive'    // legacy alias
  | 'sales_rep'
  | 'sales_clerk'
  | 'accountant'
  | 'viewer';

export interface User {
  user_id: string;
  email: string;
  name: string;
  picture?: string;
  role: UserRole;
  company_id?: string;
  phone?: string;
  warehouse_id?: string;       // NEW: assigned warehouse
  warehouse_name?: string;     // NEW: denormalised
  is_active: boolean;
  is_invited?: boolean;        // NEW: pre-created by SuperAdmin
  debt_ceiling?: number;       // NEW: for sales_rep
  is_flagged?: boolean;        // NEW: auto-flagged when outstanding >= ceiling
  created_at: string;
  updated_at: string;
}

export interface UserCreate {
  name: string;
  email: string;
  phone: string;
  role: UserRole;
  warehouse_id?: string;
}

export interface Company {
  company_id: string;
  name: string;
  address?: string;
  tax_id?: string;
  logo_url?: string;
  currency: string;
  fiscal_year_start: number;
  created_at: string;
}

export interface Warehouse {
  warehouse_id: string;
  name: string;
  address?: string;
  capacity?: number;
  manager_id?: string;         // NEW
  accountant_ids?: string[];   // NEW
  is_active: boolean;
  created_at: string;
}

export type ProductCategory = 'raw' | 'finished' | 'packaging';

export interface Product {
  product_id: string;
  sku: string;
  name: string;
  description?: string;
  category: ProductCategory;
  unit: string;
  cost_price: number;
  selling_price: number;
  reorder_level: number;
  min_stock: number;
  max_stock: number;
  expiry_days?: number;
  barcode?: string;
  image_url?: string;
  default_supplier_id?: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface InventoryStock {
  stock_id: string;
  product_id: string;
  product_name?: string;
  product_sku?: string;
  warehouse_id: string;
  warehouse_name?: string;
  quantity: number;
  cost_price?: number;
  reorder_level?: number;
  last_updated: string;
}

export interface InventoryByWarehouse {
  product_id: string;
  product_name: string;
  sku: string;
  unit: string;
  cost_price: number;
  total_quantity: number;
  total_value: number;
  by_warehouse: { warehouse_id: string; warehouse_name: string; quantity: number }[];
}

export type TransactionType = 'purchase' | 'sale' | 'production' | 'adjustment' | 'return' | 'transfer_in' | 'transfer_out';

export interface StockTransaction {
  transaction_id: string;
  product_id: string;
  warehouse_id: string;
  type: TransactionType;
  quantity: number;
  reference_id?: string;
  notes?: string;
  created_by?: string;
  created_at: string;
}

export interface Supplier {
  supplier_id: string;
  name: string;
  contact_person?: string;
  phone?: string;
  email?: string;
  address?: string;
  payment_terms_days: number;
  tax_id?: string;
  rating: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface Distributor {
  distributor_id: string;
  name: string;
  contact_person?: string;
  phone?: string;
  email?: string;
  address?: string;
  territory?: string;
  commission_percent: number;
  credit_limit: number;
  outstanding: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export type OrderStatus = 'draft' | 'ordered' | 'received' | 'cancelled' | 'paid' | 'partial' | 'delivered';
export type DispatchStatus = 'pending_dispatch' | 'dispatched';

export interface PurchaseOrderItem {
  item_id: string;
  product_id: string;
  product_name?: string;
  quantity: number;
  unit_price: number;
  received_quantity: number;
}

export interface PurchaseOrder {
  po_id: string;
  po_number: string;
  supplier_id: string;
  supplier_name?: string;
  warehouse_id: string;
  order_date: string;
  expected_date?: string;
  status: OrderStatus;
  items: PurchaseOrderItem[];
  subtotal: number;
  tax_amount: number;
  total_amount: number;
  notes?: string;
  created_by?: string;
  created_at: string;
  updated_at: string;
}

export interface SalesOrderItem {
  item_id: string;
  product_id: string;
  product_name?: string;
  quantity: number;
  unit_price: number;
  delivered_quantity: number;
}

export interface SalesOrder {
  so_id: string;
  so_number: string;
  distributor_id: string;
  distributor_name?: string;
  warehouse_id: string;
  order_date: string;
  delivery_date?: string;
  status: OrderStatus;
  dispatch_status: DispatchStatus;   // NEW
  sales_rep_id?: string;             // NEW
  sales_rep_name?: string;           // NEW
  source_quotation_id?: string;      // NEW
  items: SalesOrderItem[];
  subtotal: number;
  tax_amount: number;
  total_amount: number;
  notes?: string;
  created_by?: string;
  created_at: string;
  updated_at: string;
}

// ─── NEW: Agent Quotation ───────────────────────────────
export type AgentQuotationStatus = 'draft' | 'pending' | 'approved' | 'rejected' | 'converted';

export interface AgentQuotationItem {
  item_id: string;
  product_id: string;
  product_name?: string;
  quantity: number;
  unit_price: number;
}

export interface AgentQuotation {
  quotation_id: string;
  quotation_number: string;
  sales_rep_id: string;
  sales_rep_name?: string;
  warehouse_id: string;
  warehouse_name?: string;
  status: AgentQuotationStatus;
  items: AgentQuotationItem[];
  total_amount: number;
  approved_by?: string;
  approved_by_name?: string;
  approved_at?: string;
  approval_remarks?: string;
  converted_so_id?: string;
  agent_is_flagged: boolean;
  agent_outstanding: number;
  agent_debt_ceiling: number;
  created_at: string;
  updated_at: string;
}

// ─── NEW: Agent Ledger ──────────────────────────────────
export type AgentLedgerEntryType = 'dispatch' | 'payment' | 'return' | 'adjustment';

export interface AgentLedgerEntry {
  entry_id: string;
  sales_rep_id: string;
  warehouse_id: string;
  entry_type: AgentLedgerEntryType;
  reference_id?: string;
  items?: SalesOrderItem[];
  amount: number;          // positive=debt added; negative=payment
  notes?: string;
  created_by: string;
  created_at: string;
}

export interface AgentLedgerSummary {
  agent: {
    user_id: string;
    name: string;
    warehouse_id?: string;
    warehouse_name?: string;
    debt_ceiling: number;
    is_flagged: boolean;
  };
  outstanding_balance: number;
  items_in_custody: {
    product_id: string;
    product_name: string;
    quantity: number;
    unit_price: number;
  }[];
  total_custody_value: number;
  ledger_entries: AgentLedgerEntry[];
}

// ─── NEW: Warehouse Transfer ────────────────────────────
export type TransferStatus = 'pending' | 'confirmed' | 'cancelled';

export interface WarehouseTransferItem {
  product_id: string;
  product_name?: string;
  quantity: number;
  cost_price: number;
}

export interface WarehouseTransfer {
  transfer_id: string;
  transfer_number: string;
  from_warehouse_id: string;
  from_warehouse_name?: string;
  to_warehouse_id: string;
  to_warehouse_name?: string;
  items: WarehouseTransferItem[];
  total_value: number;
  status: TransferStatus;
  initiated_by: string;
  initiated_by_name?: string;
  confirmed_by?: string;
  confirmed_at?: string;
  notes?: string;
  created_at: string;
}

// ─── NEW: Branch / Dashboard ────────────────────────────
export interface BranchSummary {
  warehouse_id: string;
  warehouse_name: string;
  today_sales: number;
  today_expenses: number;
  inventory_value: number;
  open_orders_pending_dispatch: number;
  flagged_agents: number;
}

export interface BranchSummaryResponse {
  branches: BranchSummary[];
  totals: {
    today_sales: number;
    today_expenses: number;
    inventory_value: number;
    open_orders: number;
    flagged_agents: number;
  };
}

// ─── Invoice / Payment (unchanged) ──────────────────────
export type InvoiceType = 'purchase' | 'sale';
export type InvoiceStatus = 'unpaid' | 'paid' | 'partial' | 'overdue';

export interface Invoice {
  invoice_id: string;
  invoice_number: string;
  type: InvoiceType;
  reference_id: string;
  party_id: string;
  party_name?: string;
  issue_date: string;
  due_date: string;
  subtotal: number;
  tax_amount: number;
  total: number;
  paid_amount: number;
  status: InvoiceStatus;
  created_at: string;
}

export type PaymentMethod = 'cash' | 'bank' | 'upi' | 'card';

export interface Payment {
  payment_id: string;
  invoice_id: string;
  amount: number;
  payment_date: string;
  method: PaymentMethod;
  transaction_ref?: string;
  notes?: string;
  created_by?: string;
  created_at: string;
}

export type AccountType = 'asset' | 'liability' | 'income' | 'expense' | 'equity';

export interface ChartOfAccount {
  account_id: string;
  code: string;
  name: string;
  type: AccountType;
  parent_id?: string;
  balance: number;
  is_active: boolean;
  created_at: string;
}

export interface Notification {
  notification_id: string;
  user_id: string;
  title: string;
  message: string;
  type: string;
  is_read: boolean;
  created_at: string;
}

export interface DashboardStats {
  total_inventory_value: number;
  low_stock_count: number;
  today_sales: number;
  today_purchases: number;
  cash_balance: number;
  pending_invoices: number;
  total_products: number;
  total_suppliers: number;
  total_distributors: number;
  total_warehouses: number;
}

export interface Activity {
  type: string;
  title: string;
  description: string;
  amount?: number;
  status?: string;
  timestamp: string;
}

export interface ChartDataPoint {
  date: string;
  sales: number;
  purchases: number;
}

export interface TopProduct {
  product_id: string;
  name: string;
  sku: string;
  quantity_sold: number;
  revenue: number;
}

// ─── Role helpers ────────────────────────────────────────
export const CROSS_WAREHOUSE_ROLES: UserRole[] = ['super_admin', 'general_manager'];
export const APPROVAL_ROLES: UserRole[] = [
  'super_admin', 'general_manager', 'warehouse_manager', 'manager', 'accountant'
];
export const SALES_REP_ROLES: UserRole[] = ['sales_rep', 'sales_executive'];

export function isCrossWarehouseRole(role: UserRole): boolean {
  return CROSS_WAREHOUSE_ROLES.includes(role);
}
export function canApproveQuotations(role: UserRole): boolean {
  return APPROVAL_ROLES.includes(role);
}
export function isSalesRep(role: UserRole): boolean {
  return SALES_REP_ROLES.includes(role);
}


export interface User {
  user_id: string;
  email: string;
  name: string;
  picture?: string;
  role: UserRole;
  company_id?: string;
  phone?: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface Company {
  company_id: string;
  name: string;
  address?: string;
  tax_id?: string;
  logo_url?: string;
  currency: string;
  fiscal_year_start: number;
  created_at: string;
}

export interface Warehouse {
  warehouse_id: string;
  name: string;
  address?: string;
  capacity?: number;
  is_active: boolean;
  created_at: string;
}

export type ProductCategory = 'raw' | 'finished' | 'packaging';

export interface Product {
  product_id: string;
  sku: string;
  name: string;
  description?: string;
  category: ProductCategory;
  unit: string;
  cost_price: number;
  selling_price: number;
  reorder_level: number;
  min_stock: number;
  max_stock: number;
  expiry_days?: number;
  barcode?: string;
  image_url?: string;
  default_supplier_id?: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface InventoryStock {
  stock_id: string;
  product_id: string;
  product_name?: string;
  product_sku?: string;
  warehouse_id: string;
  warehouse_name?: string;
  quantity: number;
  cost_price?: number;
  reorder_level?: number;
  last_updated: string;
}

export type TransactionType = 'purchase' | 'sale' | 'production' | 'adjustment' | 'return';

export interface StockTransaction {
  transaction_id: string;
  product_id: string;
  warehouse_id: string;
  type: TransactionType;
  quantity: number;
  reference_id?: string;
  notes?: string;
  created_by?: string;
  created_at: string;
}

export interface Supplier {
  supplier_id: string;
  name: string;
  contact_person?: string;
  phone?: string;
  email?: string;
  address?: string;
  payment_terms_days: number;
  tax_id?: string;
  rating: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface Distributor {
  distributor_id: string;
  name: string;
  contact_person?: string;
  phone?: string;
  email?: string;
  address?: string;
  territory?: string;
  commission_percent: number;
  credit_limit: number;
  outstanding: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export type OrderStatus = 'draft' | 'ordered' | 'received' | 'cancelled' | 'paid' | 'partial' | 'delivered';

export interface PurchaseOrderItem {
  item_id: string;
  product_id: string;
  product_name?: string;
  quantity: number;
  unit_price: number;
  received_quantity: number;
}

export interface PurchaseOrder {
  po_id: string;
  po_number: string;
  supplier_id: string;
  supplier_name?: string;
  warehouse_id: string;
  order_date: string;
  expected_date?: string;
  status: OrderStatus;
  items: PurchaseOrderItem[];
  subtotal: number;
  tax_amount: number;
  total_amount: number;
  notes?: string;
  created_by?: string;
  created_at: string;
  updated_at: string;
}

export interface SalesOrderItem {
  item_id: string;
  product_id: string;
  product_name?: string;
  quantity: number;
  unit_price: number;
  delivered_quantity: number;
}

export interface SalesOrder {
  so_id: string;
  so_number: string;
  distributor_id: string;
  distributor_name?: string;
  warehouse_id: string;
  order_date: string;
  delivery_date?: string;
  status: OrderStatus;
  items: SalesOrderItem[];
  subtotal: number;
  tax_amount: number;
  total_amount: number;
  notes?: string;
  created_by?: string;
  created_at: string;
  updated_at: string;
}

export type InvoiceType = 'purchase' | 'sale';
export type InvoiceStatus = 'unpaid' | 'paid' | 'partial' | 'overdue';

export interface Invoice {
  invoice_id: string;
  invoice_number: string;
  type: InvoiceType;
  reference_id: string;
  party_id: string;
  party_name?: string;
  issue_date: string;
  due_date: string;
  subtotal: number;
  tax_amount: number;
  total: number;
  paid_amount: number;
  status: InvoiceStatus;
  created_at: string;
}

export type PaymentMethod = 'cash' | 'bank' | 'upi' | 'card';

export interface Payment {
  payment_id: string;
  invoice_id: string;
  amount: number;
  payment_date: string;
  method: PaymentMethod;
  transaction_ref?: string;
  notes?: string;
  created_by?: string;
  created_at: string;
}

export type AccountType = 'asset' | 'liability' | 'income' | 'expense' | 'equity';

export interface ChartOfAccount {
  account_id: string;
  code: string;
  name: string;
  type: AccountType;
  parent_id?: string;
  balance: number;
  is_active: boolean;
  created_at: string;
}

export interface Notification {
  notification_id: string;
  user_id: string;
  title: string;
  message: string;
  type: string;
  is_read: boolean;
  created_at: string;
}

export interface DashboardStats {
  total_inventory_value: number;
  low_stock_count: number;
  today_sales: number;
  today_purchases: number;
  cash_balance: number;
  pending_invoices: number;
  total_products: number;
  total_suppliers: number;
  total_distributors: number;
  total_warehouses: number;
}

export interface Activity {
  type: string;
  title: string;
  description: string;
  amount?: number;
  status?: string;
  timestamp: string;
}

export interface ChartDataPoint {
  date: string;
  sales: number;
  purchases: number;
}

export interface TopProduct {
  product_id: string;
  name: string;
  sku: string;
  quantity_sold: number;
  revenue: number;
}
