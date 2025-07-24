import { createClient } from "@supabase/supabase-js"

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

export interface Profile {
  id: string
  email: string
  full_name?: string
  role: "admin" | "manager" | "staff"
  avatar_url?: string
  created_at: string
  updated_at: string
}

export interface Warehouse {
  id: string
  code: string
  name: string
  view_location_id?: string
  manager_id?: string
  active: boolean
  created_at: string
  updated_at: string
  low_stock_id: string
  display_name: string
}

export interface Category {
  id: string
  name: string
  display_name?: string
  parent_id?: string
  is_active: boolean
  created_at: string
}

export interface InventoryItem {
  id: string
  barcode: string
  name: string
  description?: string
  categ_id?: string
  uom_name: string
  standard_price?: number
  sale_avg_price?: number
  list_price?: number
  purchase_avg_price?: number
  qty_available: number
  reordering_min_qty: number
  reordering_max_qty: number
  created_by?: string
  created_at: string
  updated_at: string
  // Relations
  category?: Category
  warehouse_inventory?: WarehouseInventory[]
}

export interface WarehouseInventory {
  id: string
  inventory_id: string
  warehouse_id: string
  quantity: number
  product_id?: string
  opening_stock: number
  current_stock: number
  reserved_stock: number
  available_stock: number
  last_updated: string
  // Relations
  inventory?: InventoryItem
  warehouse?: Warehouse
}

export interface StockMovements {
  id: string
  inventory_id: string
  warehouse_id: string
  movement_type: "purchase" | "sale" | "transfer_in" | "transfer_out" | "adjustment" | "wastage" | "return"
  quantity: number
  unit_cost?: number
  reference_number?: string
  notes?: string
  created_by?: string
  created_at: string
  // Relations
  inventory?: InventoryItem
  warehouse?: Warehouse
  created_by_profile?: Profile
}

export interface PurchaseOrderItem {
  id: string
  purchase_order_id: string
  inventory_id?: string
  quantity: number
  unit_cost: number
  total_cost: number
  received_quantity: number
  // Relations
  inventory?: InventoryItem
}

// API Response Types - Fixed to match actual data structure
export interface InventoryWithDetails {
  // Core inventory fields
  odoo_id: string
  name: string
  barcode: string
  uom_name: string
  standard_price: number
  list_price: number
  reordering_min_qty: number
  reordering_max_qty: number
  
  // Additional fields that might be returned from full select
  id?: string
  description?: string
  categ_id?: string
  sale_avg_price?: number
  purchase_avg_price?: number
  qty_available?: number
  created_by?: string
  created_at?: string
  updated_at?: string
  type?: string
  
  // Relations - fixed structure
  category: {
    display_name: string
    active?: boolean
    id?: string
    name?: string
    created_at?: string
  }[]
  
  warehouse_inventory: {
    quantity: number
    product_id: string
    warehouse: {
      id: string
      name: string
      code: string
    } | {
      id: string
      name: string
      code: string
    }[] // Handle both single object and array from Supabase join
  }[]
}

export interface DashboardStats {
  total_products: number
  total_warehouses: number
  low_stock_items: number
  total_value: number
}

export interface PurchaseDetails {
  product_id: number
  quantity: number
  warehouse_dest_id: number
  warehouses: {
    code: string
  }
}

// Additional interface for the purchase details API response
export interface PurchaseDetailsResponse {
  warehouse_code: string
  total_quantity: number
}