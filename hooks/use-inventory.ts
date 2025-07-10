"use client"

import { useState, useEffect } from "react"
import { supabase } from "@/lib/supabase-client"
import { InventoryAPI } from "@/lib/api/inventory"
import type { InventoryWithDetails } from "@/lib/supabase"

export function useInventory() {
  const [inventory, setInventory] = useState<InventoryWithDetails[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchInventory = async () => {
    try {
      setLoading(true)
      setError(null)
      const data = await InventoryAPI.getInventoryWithWarehouses()
      setInventory(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred")
      console.error("Error fetching inventory:", err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchInventory()

    // Set up real-time subscriptions
    const inventoryChannel = supabase
      .channel("inventory_changes")
      .on("postgres_changes", { event: "*", schema: "public", table: "inventory" }, (payload) => {
        console.log("Inventory change:", payload)
        fetchInventory()
      })
      .on("postgres_changes", { event: "*", schema: "public", table: "warehouse_inventory" }, (payload) => {
        console.log("Warehouse inventory change:", payload)
        fetchInventory()
      })
      .subscribe()

    return () => {
      supabase.removeChannel(inventoryChannel)
    }
  }, [])

  const searchInventory = async (query: string) => {
    try {
      setLoading(true)
      setError(null)
      const data = await InventoryAPI.searchInventory(query)
      setInventory(data)
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
      const data = await InventoryAPI.getLowStockItems()
      setInventory(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to get low stock items")
    } finally {
      setLoading(false)
    }
  }

  return {
    inventory,
    loading,
    error,
    refetch: fetchInventory,
    searchInventory,
    getLowStockItems,
  }
}
