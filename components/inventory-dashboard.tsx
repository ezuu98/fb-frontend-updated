"use client"

import { useState, useMemo } from "react"
import { Search, Filter, Download, ChevronDown, User, LogOut, AlertTriangle, Edit, Database } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { SkuDetailView } from "./sku-detail-view"
import { useInventory } from "@/hooks/use-inventory"
import { useAuth } from "@/hooks/use-auth"
import type { InventoryWithDetails } from "@/lib/supabase"
import { AddProductModal } from "./add-product-modal"
import { EditProductModal } from "./edit-product-modal"
import { ExportInventory } from "./export-inventory"
import { OdooSyncPanel } from "./odoo-sync-panel"

export function InventoryDashboard() {
  const [searchTerm, setSearchTerm] = useState("")
  const [category, setCategory] = useState("All Categories")
  const [warehouse, setWarehouse] = useState("All Warehouses")
  const [stockStatus, setStockStatus] = useState("All Status")
  const [currentView, setCurrentView] = useState<"dashboard" | "sku-detail">("dashboard")
  const [selectedSku, setSelectedSku] = useState<InventoryWithDetails | null>(null)
  const [showOdooSync, setShowOdooSync] = useState(false)
  const { inventory, loading, error, refetch } = useInventory()
  const { user, profile, signOut } = useAuth()

  const handleSkuClick = (item: InventoryWithDetails) => {
    setSelectedSku(item)
    setCurrentView("sku-detail")
  }

  const handleBackToDashboard = () => {
    setCurrentView("dashboard")
    setSelectedSku(null)
  }

  const handleLogout = async () => {
    await signOut()
  }

  // Transform Supabase data for display
  const transformedInventory = useMemo(() => {
    return inventory.map((item) => {
      const warehouseData =
        item.warehouse_inventory?.reduce(
          (acc, wh) => {
            const code = wh.warehouse?.code?.toLowerCase()
            if (code) {
              acc[code] = wh.current_stock
            }
            return acc
          },
          {} as Record<string, number>,
        ) || {}

      const totalStock = item.warehouse_inventory?.reduce((sum, wh) => sum + wh.current_stock, 0) || 0
      const isLowStock = totalStock <= item.reorder_level

      return {
        id: item.id,
        barcode: item.barcode,
        product: item.product_name,
        category: item.category?.name || "Uncategorized",
        subCategory: item.sub_category || "",
        bdrwh: warehouseData.bdrwh || 0,
        mhowh: warehouseData.mhowh || 0,
        sbzwh: warehouseData.sbzwh || 0,
        cliwh: warehouseData.cliwh || 0,
        bhdwh: warehouseData.bhdwh || 0,
        ecmm: warehouseData.ecmm || 0,
        totalStock,
        isLowStock,
        reorderLevel: item.reorder_level,
        originalData: item,
      }
    })
  }, [inventory])

  const filteredData = useMemo(() => {
    return transformedInventory.filter((item) => {
      const matchesSearch =
        item.product.toLowerCase().includes(searchTerm.toLowerCase()) || item.barcode.includes(searchTerm)

      const matchesCategory = category === "All Categories" || item.category === category

      const matchesStockStatus =
        stockStatus === "All Status" ||
        (stockStatus === "in-stock" && item.totalStock > item.reorderLevel) ||
        (stockStatus === "low-stock" && item.totalStock <= item.reorderLevel && item.totalStock > 0) ||
        (stockStatus === "out-of-stock" && item.totalStock === 0)

      return matchesSearch && matchesCategory && matchesStockStatus
    })
  }, [transformedInventory, searchTerm, category, stockStatus])

  // Calculate dashboard stats
  const dashboardStats = useMemo(() => {
    const totalProducts = transformedInventory.length
    const lowStockItems = transformedInventory.filter((item) => item.isLowStock).length
    const outOfStockItems = transformedInventory.filter((item) => item.totalStock === 0).length
    const totalValue = transformedInventory.reduce((sum, item) => {
      const unitCost = item.originalData.unit_cost || 0
      return sum + item.totalStock * unitCost
    }, 0)

    return {
      totalProducts,
      lowStockItems,
      outOfStockItems,
      totalValue,
    }
  }, [transformedInventory])
  if (currentView === "sku-detail" && selectedSku) {
    return <SkuDetailView sku={selectedSku} onBack={handleBackToDashboard} />
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading inventory...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <p className="text-red-600 mb-4">Error loading inventory: {error}</p>
          <Button onClick={() => window.location.reload()}>Retry</Button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-8">
            <div className="flex items-center space-x-2">
              <div className="w-6 h-6 bg-gray-800 rounded"></div>
              <span className="text-xl font-semibold text-gray-900">FreshBasket</span>
            </div>
            <nav className="flex space-x-6">
              <a href="#" className="text-gray-600 hover:text-gray-900">
                Dashboard
              </a>
              <a href="#" className="text-gray-600 hover:text-gray-900">
                Sales
              </a>
              <a href="#" className="text-gray-900 font-medium">
                Inventory
              </a>
              <a href="#" className="text-gray-600 hover:text-gray-900">
                Customers
              </a>
              <a href="#" className="text-gray-600 hover:text-gray-900">
                Reports
              </a>
            </nav>
          </div>
          <div className="flex items-center space-x-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
              <Input placeholder="Search" className="pl-10 w-64 bg-gray-100 border-0" />
            </div>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="relative h-8 w-8 rounded-full">
                  <Avatar className="h-8 w-8">
                    <AvatarImage
                      src={profile?.avatar_url || "/placeholder.svg"}
                      alt={profile?.full_name || user?.email}
                    />
                    <AvatarFallback>
                      <User className="h-4 w-4" />
                    </AvatarFallback>
                  </Avatar>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent className="w-56" align="end" forceMount>
                <div className="flex items-center justify-start gap-2 p-2">
                  <div className="flex flex-col space-y-1 leading-none">
                    {profile?.full_name && <p className="font-medium">{profile.full_name}</p>}
                    <p className="w-[200px] truncate text-sm text-muted-foreground">{user?.email}</p>
                    {profile?.role && (
                      <Badge variant="secondary" className="w-fit text-xs">
                        {profile.role}
                      </Badge>
                    )}
                  </div>
                </div>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={handleLogout}>
                  <LogOut className="mr-2 h-4 w-4" />
                  <span>Log out</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="px-6 py-8">
        <div className="max-w-7xl mx-auto">
          <div className="flex justify-between items-center mb-8">
            <h1 className="text-3xl font-bold text-gray-900">Live Inventory Tracking</h1>
            <div className="flex space-x-2">
              <Dialog open={showOdooSync} onOpenChange={setShowOdooSync}>
                <DialogTrigger asChild>
                  <Button variant="outline">
                    <Database className="w-4 h-4 mr-2" />
                    Connect Odoo
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
                  <DialogHeader>
                    <DialogTitle>Odoo Integration</DialogTitle>
                    <DialogDescription>Sync inventory data between Odoo and your FreshBasket system</DialogDescription>
                  </DialogHeader>
                  <OdooSyncPanel />
                </DialogContent>
              </Dialog>
              <AddProductModal onProductAdded={refetch} />
            </div>
          </div>

          {/* Dashboard Stats */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Products</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{dashboardStats.totalProducts}</div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Low Stock Items</CardTitle>
                <AlertTriangle className="h-4 w-4 text-orange-500" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-orange-600">{dashboardStats.lowStockItems}</div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Out of Stock</CardTitle>
                <AlertTriangle className="h-4 w-4 text-red-500" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-red-600">{dashboardStats.outOfStockItems}</div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Value</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">£{dashboardStats.totalValue.toFixed(2)}</div>
              </CardContent>
            </Card>
          </div>

          {/* Search and Filters */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
            <div className="flex flex-col space-y-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                <Input
                  placeholder="by SKU Product Name or Barcode"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10 bg-gray-50 border-gray-200"
                />
              </div>

              <div className="flex space-x-4">
                <Select value={category} onValueChange={setCategory}>
                  <SelectTrigger className="w-48">
                    <SelectValue placeholder="Category" />
                    <ChevronDown className="w-4 h-4" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="All Categories">All Categories</SelectItem>
                    <SelectItem value="Produce">Produce</SelectItem>
                    <SelectItem value="Bakery">Bakery</SelectItem>
                    <SelectItem value="Dairy & Eggs">Dairy & Eggs</SelectItem>
                    <SelectItem value="Meat & Poultry">Meat & Poultry</SelectItem>
                    <SelectItem value="Beverages">Beverages</SelectItem>
                    <SelectItem value="Pantry">Pantry</SelectItem>
                  </SelectContent>
                </Select>

                <Select value={stockStatus} onValueChange={setStockStatus}>
                  <SelectTrigger className="w-48">
                    <SelectValue placeholder="Stock Status" />
                    <ChevronDown className="w-4 h-4" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="All Status">All Status</SelectItem>
                    <SelectItem value="in-stock">In Stock</SelectItem>
                    <SelectItem value="low-stock">Low Stock</SelectItem>
                    <SelectItem value="out-of-stock">Out of Stock</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          {/* Action Bar */}
          <div className="flex justify-between items-center mb-6">
            <div className="flex space-x-2">
              <Button variant="outline" size="sm">
                <Filter className="w-4 h-4 mr-2" />
                Filter
              </Button>
              <Button variant="outline" size="sm">
                <Download className="w-4 h-4" />
              </Button>
            </div>
            <ExportInventory
              filteredData={filteredData}
              searchTerm={searchTerm}
              category={category}
              stockStatus={stockStatus}
            />
          </div>

          {/* Inventory Table */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow className="bg-gray-50">
                  <TableHead className="font-medium text-gray-700">Barcode</TableHead>
                  <TableHead className="font-medium text-gray-700">Product</TableHead>
                  <TableHead className="font-medium text-gray-700">Category</TableHead>
                  <TableHead className="font-medium text-gray-700">Sub Category</TableHead>
                  <TableHead className="font-medium text-gray-700 text-center">BDRWH</TableHead>
                  <TableHead className="font-medium text-gray-700 text-center">MHOWH</TableHead>
                  <TableHead className="font-medium text-gray-700 text-center">SBZWH</TableHead>
                  <TableHead className="font-medium text-gray-700 text-center">CLIWH</TableHead>
                  <TableHead className="font-medium text-gray-700 text-center">BHDWH</TableHead>
                  <TableHead className="font-medium text-gray-700 text-center">ECMM</TableHead>
                  <TableHead className="font-medium text-gray-700 text-center">Status</TableHead>
                  <TableHead className="font-medium text-gray-700 text-center">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredData.map((item, index) => (
                  <TableRow key={index} className="hover:bg-gray-50">
                    <TableCell className="font-mono text-sm text-blue-600">{item.barcode}</TableCell>
                    <TableCell className="font-medium">
                      <button
                        onClick={() => handleSkuClick(item.originalData)}
                        className="text-blue-600 hover:text-blue-800 hover:underline text-left"                      >
                        {item.product}
                      </button>
                    </TableCell>
                    <TableCell>
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                        {item.category}
                      </span>
                    </TableCell>
                    <TableCell>
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                        {item.subCategory}
                      </span>
                    </TableCell>
                    <TableCell className="text-center">{item.bdrwh}</TableCell>
                    <TableCell className="text-center">{item.mhowh}</TableCell>
                    <TableCell className="text-center">{item.sbzwh}</TableCell>
                    <TableCell className="text-center">{item.cliwh}</TableCell>
                    <TableCell className="text-center">{item.bhdwh}</TableCell>
                    <TableCell className="text-center">{item.ecmm}</TableCell>
                    <TableCell className="text-center">
                      {item.totalStock === 0 ? (
                        <Badge variant="destructive">Out of Stock</Badge>
                      ) : item.isLowStock ? (
                        <Badge variant="secondary" className="bg-orange-100 text-orange-800">
                          Low Stock
                        </Badge>
                      ) : (
                        <Badge variant="secondary" className="bg-green-100 text-green-800">
                          In Stock
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-center">
                      <EditProductModal
                        product={item.originalData}
                        onProductUpdated={refetch}
                        trigger={
                          <Button variant="outline" size="sm">
                            <Edit className="w-3 h-3 mr-1" />
                            Edit
                          </Button>
                        }
                      />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </div>
      </main>
    </div>
  )
}
