"use client"

import { useState } from "react"
import { Search, Filter, Download, ChevronDown, User } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { SkuDetailView } from "./sku-detail-view"

const inventoryData = [
  {
    barcode: "8765432109876",
    product: "Organic Apples",
    category: "Produce",
    subCategory: "Fruits",
    bdrwh: 150,
    mhowh: 200,
    sbzwh: 100,
    cliwh: 50,
    bhdwh: 75,
    ecmm: 125,
  },
  {
    barcode: "1234567890123",
    product: "Whole Wheat Bread",
    category: "Bakery",
    subCategory: "Breads",
    bdrwh: 80,
    mhowh: 120,
    sbzwh: 60,
    cliwh: 40,
    bhdwh: 50,
    ecmm: 70,
  },
  {
    barcode: "9876543210987",
    product: "Free-Range Eggs",
    category: "Dairy & Eggs",
    subCategory: "Eggs",
    bdrwh: 200,
    mhowh: 250,
    sbzwh: 150,
    cliwh: 100,
    bhdwh: 125,
    ecmm: 175,
  },
  {
    barcode: "2345678901234",
    product: "Almond Milk",
    category: "Dairy & Eggs",
    subCategory: "Milk Alternatives",
    bdrwh: 100,
    mhowh: 150,
    sbzwh: 80,
    cliwh: 60,
    bhdwh: 75,
    ecmm: 100,
  },
  {
    barcode: "3456789012345",
    product: "Chicken Breast",
    category: "Meat & Poultry",
    subCategory: "Poultry",
    bdrwh: 120,
    mhowh: 180,
    sbzwh: 90,
    cliwh: 70,
    bhdwh: 85,
    ecmm: 110,
  },
]

export function InventoryDashboard() {
  const [searchTerm, setSearchTerm] = useState("")
  const [category, setCategory] = useState("All Categories")
  const [warehouse, setWarehouse] = useState("All Warehouses")
  const [stockStatus, setStockStatus] = useState("All Status")
  const [currentView, setCurrentView] = useState<"dashboard" | "sku-detail">("dashboard")
  const [selectedSku, setSelectedSku] = useState<any>(null)

  const handleSkuClick = (item: any) => {
    setSelectedSku(item)
    setCurrentView("sku-detail")
  }

  const handleBackToDashboard = () => {
    setCurrentView("dashboard")
    setSelectedSku(null)
  }

  const filteredData = inventoryData.filter((item) => {
    const matchesSearch =
      item.product.toLowerCase().includes(searchTerm.toLowerCase()) || item.barcode.includes(searchTerm)
    const matchesCategory = category === "All Categories" || item.category === category
    const matchesWarehouse = warehouse === "All Warehouses" || item.barcode.includes(warehouse)
    const matchesStockStatus =
      stockStatus === "All Status" ||
      (stockStatus === "in-stock" &&
        item.bdrwh > 0 &&
        item.mhowh > 0 &&
        item.sbzwh > 0 &&
        item.cliwh > 0 &&
        item.bhdwh > 0 &&
        item.ecmm > 0) ||
      (stockStatus === "low-stock" &&
        (item.bdrwh < 100 ||
          item.mhowh < 100 ||
          item.sbzwh < 100 ||
          item.cliwh < 100 ||
          item.bhdwh < 100 ||
          item.ecmm < 100)) ||
      (stockStatus === "out-of-stock" &&
        (item.bdrwh === 0 ||
          item.mhowh === 0 ||
          item.sbzwh === 0 ||
          item.cliwh === 0 ||
          item.bhdwh === 0 ||
          item.ecmm === 0))
    return matchesSearch && matchesCategory && matchesWarehouse && matchesStockStatus
  })

  if (currentView === "sku-detail" && selectedSku) {
    return <SkuDetailView sku={selectedSku} onBack={handleBackToDashboard} />
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
          <h1 className="text-3xl font-bold text-gray-900 mb-8">Live Inventory Tracking</h1>

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
                  </SelectContent>
                </Select>

                <Select value={warehouse} onValueChange={setWarehouse}>
                  <SelectTrigger className="w-48">
                    <SelectValue placeholder="Warehouse" />
                    <ChevronDown className="w-4 h-4" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="All Warehouses">All Warehouses</SelectItem>
                    <SelectItem value="BDRWH">BDRWH</SelectItem>
                    <SelectItem value="MHOWH">MHOWH</SelectItem>
                    <SelectItem value="SBZWH">SBZWH</SelectItem>
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
            <Button className="bg-blue-600 hover:bg-blue-700">
              <Download className="w-4 h-4 mr-2" />
              Export
            </Button>
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
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredData.map((item, index) => (
                  <TableRow key={index} className="hover:bg-gray-50">
                    <TableCell className="font-mono text-sm text-blue-600">{item.barcode}</TableCell>
                    <TableCell className="font-medium">
                      <button
                        onClick={() => handleSkuClick(item)}
                        className="text-blue-600 hover:text-blue-800 hover:underline text-left"
                      >
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
