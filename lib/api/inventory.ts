import { supabase } from "@/lib/supabase-client"
import type { InventoryWithDetails, InventoryItem, WarehouseInventory } from "@/lib/supabase"

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
          *,
          category:categories(*)
        `, { count: "exact" })
        .eq("active", true)
        .eq("type", "product")
        .order("name", { ascending: true })
        .range(from, to)

      if (error) throw error;

      const odooIds = (data || []).map(item => item.odoo_id);

      const { data: warehouseInventory, error: whError } = await supabase
        .from("warehouse_inventory")
        .select(`
                product_id,
                quantity,
                warehouse:warehouses(id, name, code)
              `)
        .in("product_id", odooIds);


      if (whError) throw whError;

      const merged = (data || []).map(item => ({
        ...item,
        warehouse_inventory: warehouseInventory?.filter(wi => wi.product_id === item.odoo_id) || [],
      }));

      return {
        data: merged || [],
        total: count || 0,
      }
    } catch (error) {
      console.error("Error in getInventoryWithWarehouses:", error)
      throw error
    }
  }

  static async searchInventory(query: string, page = 1, limit = 30): Promise<{
    data: InventoryWithDetails[]
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
        .or(`name.ilike.%${query}%,barcode.ilike.%${query}%`)
        .eq("active", true)
        .eq("type", "product")
        .order("name", { ascending: true })
        .range(from, to) // ✅ add pagination here

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

      const merged = (inventoryData || []).map(item => ({
        ...item,
        warehouse_inventory: warehouseInventory?.filter(wi => wi.product_id === item.odoo_id) || [],
      }))

      return {
        data: merged || [],
        total: count || 0,
      }
    } catch (error) {
      console.error("Error in searchInventory:", error)
      throw error
    }
  }



  // Get single inventory item with details
  static async getInventoryById(id: string): Promise<InventoryWithDetails | null> {
    try {
      const { data, error } = await supabase
        .from("inventory")
        .select(`
          *,
          category:categories(*)
        `)
        .eq("id", id)
        .eq("active", true)
        .single()

      if (error) throw error
      return data
    } catch (error) {
      console.error("Error in getInventoryById:", error)
      throw error
    }
  }

  // Update warehouse inventory
  static async updateWarehouseInventory(
    inventoryId: string,
    warehouseId: string,
    updates: Partial<WarehouseInventory>,
  ): Promise<WarehouseInventory> {
    try {
      const { data, error } = await supabase
        .from("warehouse_inventory")
        .update(updates)
        .eq("inventory_id", inventoryId)
        .eq("warehouse_id", warehouseId)
        .select()
        .single()

      if (error) throw error
      return data
    } catch (error) {
      console.error("Error in updateWarehouseInventory:", error)
      throw error
    }
  }

  // Check if barcode exists
  static async checkBarcodeExists(barcode: string): Promise<boolean> {
    try {
      const { data, error } = await supabase.from("inventory").select("id").eq("barcode", barcode).single()

      if (error && error.code !== "PGRST116") {
        throw error
      }

      return !!data
    } catch (error) {
      console.error("Error checking barcode:", error)
      return false
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
