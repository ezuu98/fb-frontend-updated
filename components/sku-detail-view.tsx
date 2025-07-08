"use client"

import { ArrowLeft, Search, User } from "lucide-react"
import { Input } from "@/components/ui/input"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"

interface SkuDetailViewProps {
  sku: {
    barcode: string
    product: string
    category: string
    subCategory: string
  }
  onBack: () => void
}

const warehouseData = [
  {
    warehouse: "Main Warehouse",
    openingStock: 1000,
    purchases: 500,
    purchaseReturns: 50,
    sales: 600,
    wastages: 20,
    transferIn: 100,
    transferOut: 50,
    manufacturingImpact: 0,
    closingStock: 880,
  },
  {
    warehouse: "Branch A",
    openingStock: 500,
    purchases: 200,
    purchaseReturns: 20,
    sales: 300,
    wastages: 10,
    transferIn: 50,
    transferOut: 20,
    manufacturingImpact: 0,
    closingStock: 440,
  },
  {
    warehouse: "Branch B",
    openingStock: 300,
    purchases: 100,
    purchaseReturns: 10,
    sales: 150,
    wastages: 5,
    transferIn: 20,
    transferOut: 10,
    manufacturingImpact: 0,
    closingStock: 255,
  },
  {
    warehouse: "Online Store",
    openingStock: 200,
    purchases: 50,
    purchaseReturns: 5,
    sales: 100,
    wastages: 2,
    transferIn: 10,
    transferOut: 5,
    manufacturingImpact: 0,
    closingStock: 158,
  },
]

const totalRow = {
  warehouse: "Total",
  openingStock: 2000,
  purchases: 850,
  purchaseReturns: 85,
  sales: 1150,
  wastages: 37,
  transferIn: 180,
  transferOut: 85,
  manufacturingImpact: 0,
  closingStock: 1833,
}

export function SkuDetailView({ sku, onBack }: SkuDetailViewProps) {
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
            <h1 className="text-3xl font-bold text-gray-900 mb-2">SKU: {sku.product}</h1>
            <p className="text-gray-600">Detailed inventory calculations for closing stock per warehouse</p>
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
                    <TableHead className="font-medium text-gray-700 min-w-[120px]">Warehouse</TableHead>
                    <TableHead className="font-medium text-gray-700 text-center min-w-[100px]">Opening Stock</TableHead>
                    <TableHead className="font-medium text-gray-700 text-center min-w-[100px]">Purchases</TableHead>
                    <TableHead className="font-medium text-gray-700 text-center min-w-[100px]">
                      Purchase Returns
                    </TableHead>
                    <TableHead className="font-medium text-gray-700 text-center min-w-[80px]">Sales</TableHead>
                    <TableHead className="font-medium text-gray-700 text-center min-w-[90px]">Wastages</TableHead>
                    <TableHead className="font-medium text-gray-700 text-center min-w-[90px]">Transfer In</TableHead>
                    <TableHead className="font-medium text-gray-700 text-center min-w-[100px]">Transfer Out</TableHead>
                    <TableHead className="font-medium text-gray-700 text-center min-w-[120px]">
                      Manufacturing Impact
                    </TableHead>
                    <TableHead className="font-medium text-gray-700 text-center min-w-[100px]">Closing Stock</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {warehouseData.map((row, index) => (
                    <TableRow key={index} className="hover:bg-gray-50">
                      <TableCell className="font-medium">{row.warehouse}</TableCell>
                      <TableCell className="text-center text-blue-600">{row.openingStock}</TableCell>
                      <TableCell className="text-center">{row.purchases}</TableCell>
                      <TableCell className="text-center">{row.purchaseReturns}</TableCell>
                      <TableCell className="text-center">{row.sales}</TableCell>
                      <TableCell className="text-center">{row.wastages}</TableCell>
                      <TableCell className="text-center">{row.transferIn}</TableCell>
                      <TableCell className="text-center">{row.transferOut}</TableCell>
                      <TableCell className="text-center">{row.manufacturingImpact}</TableCell>
                      <TableCell className="text-center text-blue-600 font-medium">{row.closingStock}</TableCell>
                    </TableRow>
                  ))}
                  {/* Total Row */}
                  <TableRow className="bg-gray-50 border-t-2 border-gray-200">
                    <TableCell className="font-bold">{totalRow.warehouse}</TableCell>
                    <TableCell className="text-center font-bold text-blue-600">{totalRow.openingStock}</TableCell>
                    <TableCell className="text-center font-bold">{totalRow.purchases}</TableCell>
                    <TableCell className="text-center font-bold">{totalRow.purchaseReturns}</TableCell>
                    <TableCell className="text-center font-bold">{totalRow.sales}</TableCell>
                    <TableCell className="text-center font-bold">{totalRow.wastages}</TableCell>
                    <TableCell className="text-center font-bold">{totalRow.transferIn}</TableCell>
                    <TableCell className="text-center font-bold">{totalRow.transferOut}</TableCell>
                    <TableCell className="text-center font-bold">{totalRow.manufacturingImpact}</TableCell>
                    <TableCell className="text-center font-bold text-blue-600">{totalRow.closingStock}</TableCell>
                  </TableRow>
                </TableBody>
              </Table>
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
