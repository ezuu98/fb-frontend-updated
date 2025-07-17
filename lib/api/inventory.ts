import { supabase } from "@/lib/supabase-client"
import type { InventoryWithDetails, InventoryItem, WarehouseInventory } from "@/lib/supabase"

export class InventoryAPI {
  // Get all inventory items with warehouse details
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
          category:categories(*),
          warehouse_inventory(
            *,
            warehouse:warehouses(*)
          )
        `, { count: "exact" })
        .eq("active", true)
        .eq("type","product")
        .order("name", { ascending: true })
        .range(from, to)

      if (error) throw error

      return {
        data: data || [],
        total: count || 0,
      }
    } catch (error) {
      console.error("Error in getInventoryWithWarehouses:", error)
      throw error
    }
  }
  
  static async searchInventory(query: string): Promise<{
    data: InventoryWithDetails[]
    total: number
  }> {
    try {
      const { data, error, count } = await supabase
        .from("inventory")
        .select(`
        *,
        category:categories(*),
        warehouse_inventory(
          *,
          warehouse:warehouses(*)
        )
      `, { count: "exact" })
        .ilike("name", `%${query}%`) // Or any column you want to search
        .eq("active", true)

      if (error) throw error

      return {
        data: data || [],
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
          category:categories(*),
          warehouse_inventory(
            *,
            warehouse:warehouses(*)
          )
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

  // Create new inventory item
  static async createInventoryItem(item: Partial<InventoryItem>): Promise<InventoryItem> {
    try {
      const { data: user } = await supabase.auth.getUser()

      // Check if barcode already exists
      const { data: existingProduct } = await supabase
        .from("inventory")
        .select("barcode")
        .eq("barcode", item.barcode)
        .single()

      if (existingProduct) {
        throw new Error("A product with this barcode already exists")
      }

      const { data, error } = await supabase
        .from("inventory")
        .insert({
          ...item,
          created_by: user.user?.id,
        })
        .select()
        .single()

      if (error) {
        if (error.code === "23505") {
          throw new Error("A product with this barcode already exists")
        }
        throw error
      }

      return data
    } catch (error) {
      console.error("Error in createInventoryItem:", error)
      throw error
    }
  }

  // Update inventory item
  static async updateInventoryItem(id: string, updates: Partial<InventoryItem>): Promise<InventoryItem> {
    try {
      const { data, error } = await supabase.from("inventory").update(updates).eq("id", id).select().single()

      if (error) throw error
      return data
    } catch (error) {
      console.error("Error in updateInventoryItem:", error)
      throw error
    }
  }

  // Delete inventory item (soft delete)
  static async deleteInventoryItem(id: string): Promise<void> {
    try {
      const { error } = await supabase.from("inventory").update({ is_active: false }).eq("id", id)

      if (error) throw error
    } catch (error) {
      console.error("Error in deleteInventoryItem:", error)
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


  // Get low stock items
  static async getLowStockItems(page = 1, limit = 30): Promise<{
    data: InventoryWithDetails[],
    total: number
  }> {
    try {
      const from = (page - 1) * limit
      const to = from + limit - 1

      const { data, count, error } = await supabase
        .from("inventory")
        .select(`
          *,
          category:categories(*),
          warehouse_inventory(
            *,
            warehouse:warehouses(*)
          )
        `, { count: "exact" })
        .eq("is_active", true)
        .range(from, to)
        .order("name")

      if (error) throw error

      return {
        data: data || [],
        total: count || 0
      }
    } catch (error) {
      console.error("Error in getLowStock:", error);
      throw error;
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
