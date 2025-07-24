import { supabase } from "@/lib/supabase-client"
import type { InventoryWithDetails, PurchaseDetails, PurchaseDetailsResponse } from "@/lib/supabase"

export class InventoryAPI {
  static async getInventoryWithWarehouses(page = 1, limit = 30): Promise<{
    data: InventoryWithDetails[]
    total: number
  }> {
    try {
      const from = (page - 1) * limit
      const to = from + limit - 1

      const { data, error, count } = await supabase
        .from("inventory")
        .select(`
          odoo_id, name, barcode, uom_name, standard_price, reordering_min_qty, reordering_max_qty, list_price,
          category:categories(display_name, active, name)
        `, { count: "exact" })
        .eq("active", true)
        .eq("type", "product")
        .order("name", { ascending: true })
        .range(from, to)

      if (error) throw error

      const odooIds = (data || []).map(item => item.odoo_id)

      const { data: warehouseInventory, error: whError } = await supabase
        .from("warehouse_inventory")
        .select(`
          product_id,
          quantity,
          warehouse:warehouses(id, name, code)
        `)
        .in("product_id", odooIds)

      if (whError) throw whError

      const merged: InventoryWithDetails[] = (data || []).map(item => ({
        ...item,
        warehouse_inventory: (warehouseInventory?.filter(wi => wi.product_id === item.odoo_id) || []).map(wi => ({
          ...wi,
          warehouse: Array.isArray(wi.warehouse) ? wi.warehouse[0] : wi.warehouse
        })),
      }))

      return {
        data: merged,
        total: count || 0,
      }
    } catch (error) {
      console.error("Error in getInventoryWithWarehouses:", error)
      throw error
    }
  }

  static async lowStockCount(): Promise<{
    lowStockCount: number
    outOfStockCount: number
  }> {
    try {
      const { data, error } = await supabase.rpc("get_low_stock_count")

      if (error) throw error

      const { low_stock_count, out_of_stock_count } = data[0] || {}

      return {
        lowStockCount: low_stock_count || 0,
        outOfStockCount: out_of_stock_count || 0,
      }
    } catch (error) {
      console.error("Error in lowStockCount:", error)
      throw error
    }
  }
}

export class SearchInventory {
  static async searchInventory(query: string, page = 1, limit = 30): Promise<{
    data: InventoryWithDetails[] // Fixed return type
    total: number
  }> {
    try {
      const from = (page - 1) * limit
      const to = from + limit - 1

      const { data: inventoryData, error, count } = await supabase
        .from("inventory")
        .select(`
          *,
          category:categories(*)
        `, { count: "exact" })
        .or(`name.ilike.${query}%,barcode.ilike.%${query}%`)
        .eq("active", true)
        .eq("type", "product")
        .order("name", { ascending: true })
        .range(from, to)

      if (error) throw error

      const odooIds = (inventoryData || []).map(item => item.odoo_id)

      const { data: warehouseInventory, error: whError } = await supabase
        .from("warehouse_inventory")
        .select(`
          product_id,
          quantity,
          warehouse:warehouses(id, name, code)
        `)
        .in("product_id", odooIds)

      if (whError) throw whError

      const merged: InventoryWithDetails[] = (inventoryData || []).map(item => ({
        ...item,
        warehouse_inventory: (warehouseInventory?.filter(wi => wi.product_id === item.odoo_id) || []).map(wi => ({
          ...wi,
          warehouse: Array.isArray(wi.warehouse) ? wi.warehouse[0] : wi.warehouse
        })),
      }))

      return {
        data: merged,
        total: count || 0,
      }
    } catch (error) {
      console.error("Error in searchInventory:", error)
      throw error
    }
  }
}

export class PurchaseDetailsService {
  static async getPurchaseDetails(
    product_id: string,
    month: number,
    year: number
  ): Promise<{ data: PurchaseDetailsResponse[] }> { // Fixed return type
    try {
      const startDate = `${year}-${String(month).padStart(2, "0")}-01`
      const endDate = new Date(year, month, 0).toISOString().split("T")[0]

      const { data, error } = await supabase
        .from("stock_movements")
        .select(`
          quantity,
          warehouse_dest_id,
          warehouses!warehouse_dest_id(code)
        `)
        .eq("product_id", product_id)
        .gte("date_purchased", startDate)
        .lte("date_purchased", endDate)

      if (error) throw error

      const groupedData: Record<string, number> = {}
      console.log("Data fetched:", data)

      for (const row of data || []) {
        // Handle both array and object cases for warehouses
        const warehouse_code = Array.isArray(row.warehouses) 
          ? row.warehouses[0]?.code || "Unknown"
          : (row.warehouses as any)?.code || "Unknown"
        groupedData[warehouse_code] =
          (groupedData[warehouse_code] || 0) + (row.quantity || 0)
      }

      console.log("Grouped data:", groupedData)

      // Convert to array with proper typing
      const result: PurchaseDetailsResponse[] = Object.entries(groupedData).map(
        ([warehouse_code, total_quantity]) => ({
          warehouse_code,
          total_quantity,
        })
      )

      return { data: result }
    } catch (error) {
      console.error("Error in getPurchaseDetails:", error)
      throw error
    }
  }
}