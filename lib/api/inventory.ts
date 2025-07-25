import { supabase } from "@/lib/supabase-client"
import type { InventoryWithDetails, StockMovementDetailsResponse } from "@/lib/supabase"

export type { StockMovementDetailsResponse } from "@/lib/supabase"

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

export class StockMovementService {
  static async getStockMovementDetails(
    product_id: string,
    month: number,
    year: number
  ): Promise<{ data: StockMovementDetailsResponse[] }> {
    try {
      const startDate = `${year}-${String(month).padStart(2, "0")}-01`
      const endDate = new Date(year, month, 0).toISOString().split("T")[0]

      const { data, error } = await supabase
        .from("stock_movements")
        .select(`
          quantity,
          movement_type,
          warehouse_id,
          warehouse_dest_id,
          warehouse_source:warehouses!warehouse_id(code),
          warehouse_dest:warehouses!warehouse_dest_id(code)
        `)
        .eq("product_id", product_id)
        .gte("date", startDate)
        .lte("date", endDate)

      if (error) throw error

      console.log("Raw stock movement data:", data)

      // Group data by warehouse code and movement type
      const warehouseMovements: Record<string, {
        purchases: number
        sales: number
        purchase_returns: number
        wastages: number
        transfer_in: number
        transfer_out: number
        manufacturing: number
      }> = {}

      // Initialize warehouse movement tracking
      const initializeWarehouse = (warehouseCode: string) => {
        if (!warehouseMovements[warehouseCode]) {
          warehouseMovements[warehouseCode] = {
            purchases: 0,
            sales: 0,
            purchase_returns: 0,
            wastages: 0,
            transfer_in: 0,
            transfer_out: 0,
            manufacturing: 0
          }
        }
      }

      // Helper to robustly extract warehouse code
      const getWarehouseCode = (wh: any) => {
        if (!wh) return undefined;
        if (Array.isArray(wh)) return wh[0]?.code;
        return wh.code;
      }

      // Process each stock movement
      for (const movement of data || []) {
        const { quantity, movement_type, warehouse_id, warehouse_dest_id } = movement
        const sourceWarehouseCode = getWarehouseCode(movement.warehouse_source)
        const destWarehouseCode = getWarehouseCode(movement.warehouse_dest)
       
        switch (movement_type) {
          case "purchase":
            // Purchases add to warehouse_dest_id
            if (destWarehouseCode) {
              initializeWarehouse(destWarehouseCode)
              warehouseMovements[destWarehouseCode].purchases += quantity || 0
            }
            break

          case "sale":
            // Sales subtract from warehouse_id
            if (sourceWarehouseCode) {
              initializeWarehouse(sourceWarehouseCode)
              warehouseMovements[sourceWarehouseCode].sales += quantity || 0
            }
            break

          case "purchase_return":
            // Purchase returns subtract from warehouse_id
            if (sourceWarehouseCode) {
              initializeWarehouse(sourceWarehouseCode)
              warehouseMovements[sourceWarehouseCode].purchase_returns += quantity || 0
            }
            break

          case "transfer_in":
          case "transfer_out":
            if (sourceWarehouseCode && destWarehouseCode) {
              initializeWarehouse(destWarehouseCode)
              warehouseMovements[destWarehouseCode].transfer_in += quantity || 0

              initializeWarehouse(sourceWarehouseCode)
              warehouseMovements[sourceWarehouseCode].transfer_out += quantity || 0
            }
            break

          case "manufacturing":
            // Manufacturing adds to warehouse_dest_id
            if (destWarehouseCode) {
              initializeWarehouse(destWarehouseCode)
              warehouseMovements[destWarehouseCode].manufacturing += quantity || 0
            }
            break

          case "wastage":
            // Wastage subtracts from warehouse_id
            if (sourceWarehouseCode) {
              initializeWarehouse(sourceWarehouseCode)
              warehouseMovements[sourceWarehouseCode].wastages += quantity || 0
            }
            break

          default:
            console.warn(`Unknown movement type: ${movement_type}`)
        }
      }

      console.log("Processed warehouse movements:", warehouseMovements)

      // Convert to response format
      const result: StockMovementDetailsResponse[] = Object.entries(warehouseMovements).map(
        ([warehouse_code, movements]) => ({
          warehouse_code,
          purchases: movements.purchases,
          sales: movements.sales,
          purchase_returns: movements.purchase_returns,
          wastages: movements.wastages,
          transfer_in: movements.transfer_in,
          transfer_out: movements.transfer_out,
          manufacturing: movements.manufacturing
        })
      )

      return { data: result }
    } catch (error) {
      console.error("Error in getStockMovementDetails:", error)
      throw error
    }
  }
}