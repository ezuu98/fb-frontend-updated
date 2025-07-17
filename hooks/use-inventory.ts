"use client"

import { useState, useEffect } from "react"
import { supabase } from "@/lib/supabase-client"
import { InventoryAPI } from "@/lib/api/inventory"
import type { InventoryWithDetails, QuantityEntry } from "@/lib/supabase"

export function useInventory(initialPage = 1, initialLimit = 30) {
  const [inventory, setInventory] = useState<InventoryWithDetails[]>([])
  const [totalItems, setTotalItems] = useState(0)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [page, setPage] = useState(initialPage)
  const [limit, setLimit] = useState(initialLimit)
  const [lowStockCount, setLowStockCount] = useState(0)
  const [outOfStockCount, setOutOfStockCount] = useState(0)
  const [totalQuantityPerProduct, setTotalQuantityPerProduct] = useState<QuantityEntry[]>([])


  const from = (page - 1) * limit
  const to = from + limit - 1

  const fetchTotalQuantityPerProduct = async () => {
    try {
      const result: QuantityEntry[] = await InventoryAPI.getTotalQuantityPerProduct()
      setTotalQuantityPerProduct(result)
    } catch (err) {
      console.error("Error fetching total quantity per product:", err)
    }
  }

  const fetchInventory = async () => {
    try {
      setLoading(true)
      setError(null)

      const result = await InventoryAPI.getInventoryWithWarehouses(page, limit)
      setInventory(result.data)       // ✅ Inventory list
      setTotalItems(result.total)     // ✅ Separate state for total
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred")
      console.error("Error fetching inventory:", err)
    } finally {
      setLoading(false)
    }
  }

  const fetchStockCounts = async () => {
    try {
      const response = await InventoryAPI.lowStockCount()
      setLowStockCount(response.lowStockCount)
      setOutOfStockCount(response.outOfStockCount)
    } catch (err) {
      console.error("Error fetching stock counts:", err)
    }
  }

  useEffect(() => {
    fetchInventory()
    fetchStockCounts()
    fetchTotalQuantityPerProduct()

    const inventoryChannel = supabase
      .channel("inventory_changes")
      .on("postgres_changes", { event: "*", schema: "public", table: "inventory" }, fetchInventory)
      .on("postgres_changes", { event: "*", schema: "public", table: "warehouse_inventory" }, fetchInventory)
      .subscribe()

    return () => {
      supabase.removeChannel(inventoryChannel)
    }
  }, [page, limit])

  const searchInventory = async (query: string) => {
    try {
      setLoading(true)
      setError(null)

      const result = await InventoryAPI.searchInventory(query)
      setInventory(result.data)
      setTotalItems(result.total)
      setPage(1)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Search failed")
    } finally {
      setLoading(false)
    }
  }

  const getLowStockItems = async () => {
    try {
      setLoading(true)
      setError(null)

      const result = await InventoryAPI.getLowStockItems(page, limit)
      setInventory(result.data)
      setTotalItems(result.total)
      setPage(1)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to get low stock items")
    } finally {
      setLoading(false)
    }


  }

  return {
    inventory,
    totalItems,
    loading,
    error,
    page,
    setPage,
    limit,
    setLimit,
    refetch: fetchInventory,
    searchInventory,
    getLowStockItems,
    lowStockCount,
    outOfStockCount,
    totalQuantityPerProduct
  }
}
