"use client"

import { useState, useEffect } from "react"
import { supabase } from "@/lib/supabase-client"
import { InventoryAPI } from "@/lib/api/inventory"
import type { InventoryWithDetails, QuantityEntry } from "@/lib/supabase"

export function useInventory(initialPage = 1, itemsPerPage = 30) {
  const [inventory, setInventory] = useState<InventoryWithDetails[]>([])
  const [totalItems, setTotalItems] = useState(0)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [lowStockCount, setLowStockCount] = useState(0)
  const [outOfStockCount, setOutOfStockCount] = useState(0)
  const [totalQuantityPerProduct, setTotalQuantityPerProduct] = useState<QuantityEntry[]>([])
  const [searchQuery, setSearchQuery] = useState("")
  const [isSearching, setIsSearching] = useState(false)
  const [page, setPage] = useState(initialPage)


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
      if (searchQuery) {
        const { data, total } = await InventoryAPI.searchInventory(searchQuery, page, itemsPerPage)
        setInventory(data)
        setTotalItems(total)
      } else {
        const { data, total } = await InventoryAPI.getInventoryWithWarehouses(page, itemsPerPage)
        setInventory(data)
        setTotalItems(total)
      }
    } catch (err: any) {
      setError(err.message || "Failed to fetch inventory")
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
  }, [page, searchQuery])

  const searchInventory = async (query: string) => {
    setIsSearching(true)
    setSearchQuery(query)
    setPage(1)
  }


  const getLowStockItems = async () => {
    try {
      setLoading(true)
      setError(null)

      const result = await InventoryAPI.getLowStockItems(page, itemsPerPage)
      setInventory(result.data)
      setTotalItems(result.total)
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
    refetch: fetchInventory,
    getLowStockItems,
    lowStockCount,
    outOfStockCount,
    totalQuantityPerProduct,
    page,
    setPage,
    searchInventory,
    searchQuery,
    isSearching,
  }
}
