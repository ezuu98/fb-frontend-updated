import { supabase } from "@/lib/supabase-client"
import type { InventoryWithDetails, InventoryItem, WarehouseInventory } from "@/lib/supabase"

export class InventoryAPI {
  // Get all inventory items with warehouse details
  static async getInventoryWithWarehouses(): Promise<InventoryWithDetails[]> {
    try {
      console.log("Fetching inventory with warehouses...")

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
        .eq("is_active", true)
        .order("product_name")

      if (error) {
        console.error("Inventory fetch error:", error)
        throw error
      }

      console.log(`Fetched ${data?.length || 0} inventory items`)
      return data || []
    } catch (error) {
      console.error("Error in getInventoryWithWarehouses:", error)
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
        .eq("is_active", true)
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

  // Search inventory
  static async searchInventory(query: string): Promise<InventoryWithDetails[]> {
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
        .or(`product_name.ilike.%${query}%,barcode.ilike.%${query}%`)
        .eq("is_active", true)
        .order("product_name")

      if (error) throw error
      return data || []
    } catch (error) {
      console.error("Error in searchInventory:", error)
      throw error
    }
  }

  // Get low stock items
  static async getLowStockItems(): Promise<InventoryWithDetails[]> {
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
        .eq("is_active", true)
        .order("product_name")

      if (error) throw error

      // Filter items where any warehouse has stock below reorder level
      return (data || []).filter((item) =>
        item.warehouse_inventory?.some((wh) => wh.current_stock <= item.reorder_level),
      )
    } catch (error) {
      console.error("Error in getLowStockItems:", error)
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
}
