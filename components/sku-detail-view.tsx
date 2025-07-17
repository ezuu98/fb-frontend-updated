"use client"

import { ArrowLeft, Search, User } from "lucide-react"
import { Input } from "@/components/ui/input"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import type { InventoryWithDetails } from "@/lib/supabase"

interface SkuDetailViewProps {
  sku: InventoryWithDetails
  onBack: () => void
}

export function SkuDetailView({ sku, onBack }: SkuDetailViewProps) {
  // Transform warehouse inventory data for display
  const warehouseData =
    sku.warehouse_inventory?.map((wh) => ({
      warehouse: wh.warehouse?.name || wh.warehouse?.code || "Unknown",
      warehouseCode: wh.warehouse?.code || "",
      openingStock: wh.opening_stock,
      currentStock: wh.current_stock,
      reservedStock: wh.reserved_stock,
      availableStock: wh.available_stock,
      lastUpdated: new Date(wh.last_updated).toLocaleDateString(),
    })) || []

  // Calculate totals
  const totalRow = warehouseData.reduce(
    (acc, row) => ({
      warehouse: "Total",
      warehouseCode: "",
      openingStock: acc.openingStock + row.openingStock,
      currentStock: acc.currentStock + row.currentStock,
      reservedStock: acc.reservedStock + row.reservedStock,
      availableStock: acc.availableStock + row.availableStock,
      lastUpdated: "",
    }),
    {
      warehouse: "Total",
      warehouseCode: "",
      openingStock: 0,
      currentStock: 0,
      reservedStock: 0,
      availableStock: 0,
      lastUpdated: "",
    },
  )

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
              <a href="#" className="text-gray-900 font-medium">
                Inventory
              </a>
              <a href="#" className="text-gray-600 hover:text-gray-900">
                Sales
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
            <Avatar className="w-8 h-8">
              <AvatarImage src="/placeholder-user.jpg" />
              <AvatarFallback>
                <User className="w-4 h-4" />
              </AvatarFallback>
            </Avatar>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="px-6 py-8">
        <div className="max-w-7xl mx-auto">
          {/* Breadcrumb */}
          <div className="flex items-center space-x-2 text-sm text-gray-600 mb-6">
            <button onClick={onBack} className="flex items-center hover:text-gray-900">
              <ArrowLeft className="w-4 h-4 mr-1" />
              Inventory
            </button>
            <span>/</span>
            <span className="text-gray-900">SKU Details</span>
          </div>

          {/* SKU Header */}
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-gray-900 mb-2">SKU: {sku.name}</h1>
            <div className="flex items-center space-x-4 text-sm text-gray-600">
              <span>Barcode: {sku.barcode}</span>
              <span>•</span>
              <span>Category: {sku.category?.name || "Uncategorized"}</span>
              <span>•</span>
              <span>Reorder Level: {sku.reordering_min_qty}</span>
            </div>
            <p className="text-gray-600 mt-2">Real-time inventory levels across all warehouse locations</p>
          </div>

          {/* Warehouse Inventory Table */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-200">
              <h2 className="text-lg font-semibold text-gray-900">Warehouse Inventory</h2>
            </div>

            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="bg-gray-50">
                    <TableHead className="font-medium text-gray-700 min-w-[150px]">Warehouse</TableHead>
                    <TableHead className="font-medium text-gray-700 text-center min-w-[100px]">Opening Stock</TableHead>
                    <TableHead className="font-medium text-gray-700 text-center min-w-[100px]">Current Stock</TableHead>
                    <TableHead className="font-medium text-gray-700 text-center min-w-[100px]">Reserved</TableHead>
                    <TableHead className="font-medium text-gray-700 text-center min-w-[100px]">Available</TableHead>
                    <TableHead className="font-medium text-gray-700 text-center min-w-[120px]">Last Updated</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {warehouseData.map((row, index) => (
                    <TableRow key={index} className="hover:bg-gray-50">
                      <TableCell className="font-medium">
                        <div>
                          <div className="font-medium">{row.warehouse}</div>
                          {row.warehouseCode && <div className="text-sm text-gray-500">{row.warehouseCode}</div>}
                        </div>
                      </TableCell>
                      <TableCell className="text-center text-blue-600">{row.openingStock}</TableCell>
                      <TableCell className="text-center font-medium">{row.currentStock}</TableCell>
                      <TableCell className="text-center text-orange-600">{row.reservedStock}</TableCell>
                      <TableCell className="text-center text-green-600 font-medium">{row.availableStock}</TableCell>
                      <TableCell className="text-center text-sm text-gray-500">{row.lastUpdated}</TableCell>
                    </TableRow>
                  ))}
                  {/* Total Row */}
                  <TableRow className="bg-gray-50 border-t-2 border-gray-200">
                    <TableCell className="font-bold">{totalRow.warehouse}</TableCell>
                    <TableCell className="text-center font-bold text-blue-600">{totalRow.openingStock}</TableCell>
                    <TableCell className="text-center font-bold">{totalRow.currentStock}</TableCell>
                    <TableCell className="text-center font-bold text-orange-600">{totalRow.reservedStock}</TableCell>
                    <TableCell className="text-center font-bold text-green-600">{totalRow.availableStock}</TableCell>
                    <TableCell className="text-center font-bold">-</TableCell>
                  </TableRow>
                </TableBody>
              </Table>
            </div>
          </div>

          {/* Product Details */}
          <div className="mt-8 grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Product Information</h3>
              <div className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-gray-600">Product Name:</span>
                  <span className="font-medium">{sku.name}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Barcode:</span>
                  <span className="font-mono text-sm">{sku.barcode}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Category:</span>
                  <span>{sku.category?.name || "Uncategorized"}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Unit of Measure:</span>
                  <span>{sku.uom_name}</span>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Pricing & Stock Levels</h3>
              <div className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-gray-600">Unit Cost:</span>
                  <span className="font-medium">£{sku.standard_price?.toFixed(2) || "N/A"}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Selling Price:</span>
                  <span className="font-medium">£{sku.sale_avg_price?.toFixed(2) || "N/A"}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Reorder Level:</span>
                  <span className="font-medium">{sku.reordering_min_qty}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Max Stock Level:</span>
                  <span className="font-medium">{sku.reordering_max_qty || "N/A"}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Total Stock Value:</span>
                  <span className="font-medium text-green-600">
                    £{((sku.standard_price || 0) * totalRow.currentStock).toFixed(2)}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="bg-white border-t border-gray-200 mt-16">
        <div className="max-w-7xl mx-auto px-6 py-8">
          <div className="flex justify-center space-x-8 mb-4">
            <a href="#" className="text-blue-600 hover:text-blue-800 text-sm">
              Privacy Policy
            </a>
            <a href="#" className="text-blue-600 hover:text-blue-800 text-sm">
              Terms of Service
            </a>
            <a href="#" className="text-blue-600 hover:text-blue-800 text-sm">
              Contact Us
            </a>
          </div>
          <div className="text-center text-gray-500 text-sm">©2024 FreshBasket. All rights reserved.</div>
        </div>
      </footer>
    </div>
  )
}
