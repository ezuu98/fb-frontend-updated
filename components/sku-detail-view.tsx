"use client"

import { ArrowLeft, User, Calendar } from "lucide-react"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import type { InventoryItem } from "@/lib/api-client"
import { useEffect, useState, useMemo } from "react"
import { apiClient, type StockMovement } from "@/lib/api-client"

interface SkuDetailViewProps {
  sku: InventoryItem
  onBack: () => void
}

// Get default date range (current month)
const today = new Date();
const firstDayOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
const lastDayOfMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0);

export function SkuDetailView({ sku, onBack }: SkuDetailViewProps) {
  const [dateRange, setDateRange] = useState({
    startDate: firstDayOfMonth.toISOString().split('T')[0],
    endDate: lastDayOfMonth.toISOString().split('T')[0]
  });
  const [stockMovementData, setStockMovementData] = useState<StockMovement[]>([]);
  const [allStockMovements, setAllStockMovements] = useState<StockMovement[]>([]);
  const [stockMovementLoading, setStockMovementLoading] = useState(false);
  const [stockMovementError, setStockMovementError] = useState<string | null>(null);
  const [openingStocks, setOpeningStocks] = useState<Record<string, number>>({});
  const [stockVarianceData, setStockVarianceData] = useState<any[]>([]);
  const [varianceBeforeDate, setVarianceBeforeDate] = useState<any[]>([]);
  const [forceUpdate, setForceUpdate] = useState(0);

  // Function to calculate opening stock from movements before from date
  const calculateOpeningStockFromMovements = () => {
    if (!allStockMovements.length) return {};
    
    // Calculate cutoff date (one day before start date)
    const cutoffDate = new Date(dateRange.startDate);
    cutoffDate.setDate(cutoffDate.getDate() - 1);
    
    // Initialize opening stocks with base values from warehouse_inventory
    const openingStocks: Record<string, number> = {};
    
    // Set base opening stocks from warehouse_inventory
    sku.warehouse_inventory?.forEach((wh) => {
      const code = wh.warehouse?.code || "";
      openingStocks[code] = wh.quantity || 0;
    });
    
    // Process movements before the cutoff date
    allStockMovements.forEach((movement) => {
      // Only consider movements before the cutoff date
      if (new Date(movement.created_at) >= cutoffDate) return;
      
      const sourceWarehouse = movement.warehouse?.code;
      const destWarehouse = movement.warehouse_dest?.code;
      
      // If this warehouse is the source (outgoing movements)
      if (sourceWarehouse) {
        if (!openingStocks[sourceWarehouse]) {
          openingStocks[sourceWarehouse] = 0;
        }
        
        switch (movement.movement_type) {
          case 'sales':
            openingStocks[sourceWarehouse] -= Math.abs(movement.quantity);
            break;
          case 'purchase_return':
            openingStocks[sourceWarehouse] -= Math.abs(movement.quantity);
            break;
          case 'transfer_out':
            openingStocks[sourceWarehouse] -= Math.abs(movement.quantity);
            break;
          case 'wastages':
            openingStocks[sourceWarehouse] -= Math.abs(movement.quantity);
            break;
          case 'consumption':
            openingStocks[sourceWarehouse] -= Math.abs(movement.quantity);
            break;
        }
      }
      
      // If this warehouse is the destination (incoming movements)
      if (destWarehouse) {
        if (!openingStocks[destWarehouse]) {
          openingStocks[destWarehouse] = 0;
        }
        
        switch (movement.movement_type) {
          case 'purchase':
            openingStocks[destWarehouse] += movement.quantity;
            break;
          case 'transfer_in':
            openingStocks[destWarehouse] += movement.quantity;
            break;
          case 'manufacturing':
            openingStocks[destWarehouse] += movement.quantity;
            break;
          case 'sales_returns':
            openingStocks[destWarehouse] += movement.quantity;
            break;
        }
      }
    });
    
    // Add variance adjustments from stock corrections before the start date
    if (varianceBeforeDate.length > 0) {
      varianceBeforeDate.forEach((variance) => {
        const warehouseCode = variance.warehouse_code;
        if (warehouseCode && openingStocks[warehouseCode] !== undefined) {
          openingStocks[warehouseCode] += variance.stock_variance;
        }
      });
    }
    
    return openingStocks;
  };

  const warehouseData = useMemo(() => {
    const warehouses = new Map();
    const calculatedOpeningStocks = calculateOpeningStockFromMovements();
    
    // Add warehouses from inventory data
    sku.warehouse_inventory?.forEach((wh) => {
      const code = wh.warehouse?.code || "";
      const name = wh.warehouse?.name || wh.warehouse?.code || "Unknown";
      const warehouseId = wh.warehouse?.id;
      warehouses.set(code, {
        warehouse: name,
        warehouseCode: code,
        warehouseId: warehouseId,
        openingStock: calculatedOpeningStocks[code] || 0,
        lastUpdated: "N/A",
      });
    });
    
    stockMovementData?.forEach((movement) => {
      const sourceWarehouse = movement.warehouse?.code;
      const destWarehouse = movement.warehouse_dest?.code;
      
      
      if (sourceWarehouse && !warehouses.has(sourceWarehouse)) {
        warehouses.set(sourceWarehouse, {
          warehouse: movement.warehouse?.name || sourceWarehouse,
          warehouseCode: sourceWarehouse,
          warehouseId: movement.warehouse?.id, // Add warehouse ID if available
          openingStock: calculatedOpeningStocks[sourceWarehouse] || 0,
          calculatedStock: 0,
          lastUpdated: "N/A",
        });
      }
      
      if (destWarehouse && !warehouses.has(destWarehouse)) {
        warehouses.set(destWarehouse, {
          warehouse: movement.warehouse_dest?.name || destWarehouse,
          warehouseCode: destWarehouse,
          warehouseId: movement.warehouse_dest?.id, // Add warehouse ID if available
          openingStock: calculatedOpeningStocks[destWarehouse] || 0,
          calculatedStock: 0,
          lastUpdated: "N/A",
        });
      }
    });
    
    const result = Array.from(warehouses.values());
    return result;
  }, [sku.warehouse_inventory, stockMovementData, allStockMovements, dateRange.startDate, forceUpdate]);

  // Enhanced function to get stock movement data for a warehouse
  const getWarehouseMovements = (warehouseCode: string) => {
    // Process stock movement data to aggregate by warehouse
    const warehouseMovements = stockMovementData.reduce((acc, movement) => {
      const sourceWarehouse = movement.warehouse?.code;
      const destWarehouse = movement.warehouse_dest?.code;
      
      if (sourceWarehouse === warehouseCode) {
        switch (movement.movement_type) {
          case 'purchase':
            acc.sales += Math.abs(movement.quantity);
            break;
          case 'sales':
            acc.sales += Math.abs(movement.quantity);
            break;
          case 'sales_returns':
            acc.sales_returns += Math.abs(movement.quantity);
            break;
          case 'purchase_return':
            acc.purchase_returns += Math.abs(movement.quantity);
            break;
          case 'transfer_in':
            acc.transfer_out += Math.abs(movement.quantity);
            break;
          case 'wastages':
            acc.wastages += Math.abs(movement.quantity);
            break;
          case 'consumption':
            acc.consumption += Math.abs(movement.quantity);
            break;
        }
      }
      
      if (destWarehouse === warehouseCode) {
        // This warehouse is the destination
        switch (movement.movement_type) {
          case 'purchase':
            acc.purchases += movement.quantity;
            break;
          case 'transfer_in':
            acc.transfer_in += movement.quantity;
            break;
          case 'manufacturing':
            acc.manufacturing += movement.quantity;
            break;
        }
      }
      
      return acc;
    }, {
      warehouse_code: warehouseCode,
      purchases: 0,
      purchase_returns: 0,
      sales: 0,
      sales_returns: 0,
      wastages: 0,
      transfer_in: 0,
      transfer_out: 0,
      manufacturing: 0,
      consumption: 0
    });
    
    return warehouseMovements;
  };

  // Calculate totals including all movement types
  const calculateTotals = () => {
    let totalOpeningStock = 0;
    let totalPurchases = 0;
    let totalSales = 0;
    let totalPurchaseReturns = 0;
    let totalSalesReturns = 0;
    let totalWastages = 0;
    let totalTransferIN = 0;
    let totalTransferOUT = 0;
    let totalManufacturing = 0;
    let totalConsumption = 0;
    let totalClosingStock = 0;


    warehouseData.forEach((row) => {
      const movements = getWarehouseMovements(row.warehouseCode);

      totalOpeningStock += row.openingStock;
      totalPurchases += movements.purchases;
      totalPurchaseReturns += Math.abs(movements.purchase_returns);
      totalSales += Math.abs(movements.sales);
      totalSalesReturns += movements.sales_returns;
      totalWastages += Math.abs(movements.wastages);
      totalTransferIN += movements.transfer_in;
      totalTransferOUT += Math.abs(movements.transfer_out);
      totalManufacturing += movements.manufacturing;
      totalConsumption += movements.consumption;

      // Calculate closing stock: 
      // opening + purchases + transfer_in + manufacturing - sales - purchase_returns - transfer_out - wastages
      const closingStock = row.openingStock
        + movements.purchases
        + movements.transfer_in
        + movements.manufacturing
        + movements.sales_returns
        - Math.abs(movements.sales)
        - Math.abs(movements.purchase_returns)
        - Math.abs(movements.transfer_out)
        - Math.abs(movements.wastages)
        - Math.abs(movements.consumption);

      totalClosingStock += closingStock; // Ensure no negative stock
    });

    return {
      totalOpeningStock,
      totalPurchases,
      totalPurchaseReturns,
      totalSales,
      totalSalesReturns,
      totalWastages,
      totalTransferIN,
      totalTransferOUT,
      totalManufacturing,
      totalConsumption,
      totalClosingStock,
    };
  };

  const totals = calculateTotals();

  useEffect(() => {
    const fetchStockMovementData = async () => {
      if (!sku?.odoo_id == null && !sku?.id == null) {
        console.warn("No product ID available for stock movement data");
        return;
      }

      setStockMovementLoading(true);
      setStockMovementError(null);
      try {
        const productId = sku.odoo_id?.toString() || sku.id?.toString() || "";
        
        // Fetch all movements for opening stock calculation
        try {
          const allMovementsResponse = await apiClient.getAllStockMovements(productId);
          if (allMovementsResponse.success) {
            setAllStockMovements(allMovementsResponse.data);
          }
        } catch (allMovementsErr) {
          console.error('Error fetching all movements:', allMovementsErr);
          setAllStockMovements([]);
        }

        // Fetch variance data before the start date for opening stock calculation
        try {
          const varianceBeforeResponse = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api'}/stock-corrections/variance-before-date/${productId}?date=${dateRange.startDate}`, {
            headers: {
              'Authorization': `Bearer ${localStorage.getItem('auth_token')}`,
              'Content-Type': 'application/json'
            }
          });
          const varianceBeforeData = await varianceBeforeResponse.json();
          if (varianceBeforeData.success) {
            setVarianceBeforeDate(varianceBeforeData.data);
          } else {
            setVarianceBeforeDate([]);
          }
        } catch (varianceBeforeErr) {
          console.error('Error fetching variance before date:', varianceBeforeErr);
          setVarianceBeforeDate([]);
        }
        
        // Use date range API for filtered movements
        console.log('Date range being sent:', { startDate: dateRange.startDate, endDate: dateRange.endDate });
        
        const {success, data, opening_stocks} = await apiClient.getStockMovementDetailsByDateRange(
          productId,
          dateRange.startDate,
          dateRange.endDate
        );
        console.log(success)
        console.log(data)
        console.log(opening_stocks)
        
        if (success) {
          setStockMovementData(data);
          setOpeningStocks(opening_stocks || {});
          
          // Fetch stock variance data for the date range
          try {
            const varianceResponse = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api'}/stock-corrections/variance-with-totals/${productId}?start_date=${dateRange.startDate}&end_date=${dateRange.endDate}`, {
              headers: {
                'Authorization': `Bearer ${localStorage.getItem('auth_token')}`,
                'Content-Type': 'application/json'
              }
            });
            const varianceData = await varianceResponse.json();
            if (varianceData.success) {
              setStockVarianceData(varianceData.data);
            } else {
              setStockVarianceData([]);
            }
          } catch (varianceErr) {
            setStockVarianceData([]);
          }
        }
      } catch (err: any) {
        setStockMovementError(err.message || "Failed to fetch stock movement data");
        console.error("Stock movement data error:", err);
      } finally {
        setStockMovementLoading(false);
      }
    };

    fetchStockMovementData();
  }, [sku.odoo_id, sku.id, dateRange.startDate, dateRange.endDate]);

  useEffect(() => { 
    // Force a re-calculation by updating a dummy state if needed
    setForceUpdate(prev => prev + 1);
  }, [stockMovementData]);
  
  // Monitor state changes
  useEffect(() => {
  }, [stockMovementData]);

  useEffect(() => {
  }, [openingStocks]);

  
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
          </div>
          <div className="flex items-center space-x-4">
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
              <span>Category: {Array.isArray(sku.category) ? (sku.category[0] as any)?.display_name : (sku.category as any)?.display_name || "Uncategorized"}</span>
              <span>•</span>
              <span>Reorder Level: {sku.reordering_min_qty}</span>
            </div>
            <p className="text-gray-600 mt-2">Real-time inventory levels across all warehouse locations</p>
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
                  <span>{Array.isArray(sku.category) ? (sku.category[0] as any)?.display_name : (sku.category as any)?.display_name || "Uncategorized"}</span>
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
                  <span className="font-medium">PKR {sku.standard_price?.toFixed(2) || "N/A"}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Selling Price:</span>
                  <span className="font-medium">PKR {sku.list_price?.toFixed(2) || "N/A"}</span>
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
                    PKR {((sku.standard_price || 0) * totals.totalClosingStock).toFixed(2)}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Loading/Error States */}
          {stockMovementLoading && (
            <div className="mt-8 bg-blue-50 border border-blue-200 rounded-lg p-4">
              <p className="text-blue-800">Loading stock movement data...</p>
            </div>
          )}

          {stockMovementError && (
            <div className="mt-8 bg-red-50 border border-red-200 rounded-lg p-4">
              <p className="text-red-800">Error loading stock movement data: {stockMovementError}</p>
            </div>
          )}

          {/* Warehouse Inventory Table */}
          <div className="mt-12 bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
              <h2 className="text-lg font-semibold text-gray-900">Warehouse Inventory</h2>

              {/* Date Range Filters */}
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-gray-500" />
                  <Label htmlFor="start-date" className="text-sm font-medium text-gray-700">
                    From:
                  </Label>
                  <input
                    id="start-date"
                    type="date"
                    value={dateRange.startDate}
                    onChange={(e) => setDateRange(prev => ({ ...prev, startDate: e.target.value }))}
                    className="border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
                
                <div className="flex items-center gap-2">
                  <Label htmlFor="end-date" className="text-sm font-medium text-gray-700">
                    To:
                  </Label>
                  <input
                    id="end-date"
                    type="date"
                    value={dateRange.endDate}
                    onChange={(e) => setDateRange(prev => ({ ...prev, endDate: e.target.value }))}
                    className="border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>

                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    const today = new Date();
                    const firstDay = new Date(today.getFullYear(), today.getMonth(), 1);
                    const lastDay = new Date(today.getFullYear(), today.getMonth() + 1, 0);
                    setDateRange({
                      startDate: firstDay.toISOString().split('T')[0],
                      endDate: lastDay.toISOString().split('T')[0]
                    });
                  }}
                  className="text-xs"
                >
                  Current Month
                </Button>
              </div>
            </div>

            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="bg-gray-50">
                    <TableHead className="font-medium text-gray-700 min-w-[150px]">Warehouse</TableHead>
                    <TableHead className="font-medium text-gray-700 text-center min-w-[100px]">Opening Stock</TableHead>
                    <TableHead className="font-medium text-gray-700 text-center min-w-[100px]">Purchases</TableHead>
                    <TableHead className="font-medium text-gray-700 text-center min-w-[100px]">Purchase Returns</TableHead>
                    <TableHead className="font-medium text-gray-700 text-center min-w-[100px]">Sales</TableHead>
                    <TableHead className="font-medium text-gray-700 text-center min-w-[100px]">Sales Returns</TableHead>
                    <TableHead className="font-medium text-gray-700 text-center min-w-[120px]">Wastages</TableHead>
                    <TableHead className="font-medium text-gray-700 text-center min-w-[120px]">Transfer IN</TableHead>
                    <TableHead className="font-medium text-gray-700 text-center min-w-[120px]">Transfer OUT</TableHead>
                    <TableHead className="font-medium text-gray-700 text-center min-w-[120px]">Manufacturing</TableHead>
                    <TableHead className="font-medium text-gray-700 text-center min-w-[120px]">Consumption</TableHead>
                    <TableHead className="font-medium text-gray-700 text-center min-w-[120px]">Stock Variance</TableHead>
                    <TableHead className="font-medium text-gray-700 text-center min-w-[120px]">Closing Stock</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {warehouseData.length > 0 ? (
                    <>
                      {warehouseData.map((row, index) => {
                        const movements = getWarehouseMovements(row.warehouseCode);

                        const closingStock = 
                          row.openingStock
                          + movements.purchases
                          + movements.transfer_in
                          + movements.manufacturing
                          + movements.sales_returns
                          - Math.abs(movements.sales)
                          - Math.abs(movements.purchase_returns)
                          - Math.abs(movements.transfer_out)
                          - Math.abs(movements.wastages)
                          - Math.abs(movements.consumption)
                        ;

                        // Get variance data for this warehouse
                        const warehouseVariance = stockVarianceData.find(
                          v => v.warehouse_code === row.warehouseCode
                        );
                        const stockVariance = warehouseVariance?.stock_variance || 0;
                        const closingStockWithVariance = closingStock + stockVariance;
                        const hasVariance = warehouseVariance?.has_variance || false;

                        return (
                          <TableRow key={index} className="hover:bg-gray-50">
                            <TableCell className="font-medium">
                              <div>
                                <div className="font-medium">{row.warehouse}</div>
                                {row.warehouseCode && (
                                  <div className="text-sm text-gray-500">{row.warehouseCode}</div>
                                )}
                              </div>
                            </TableCell>
                            <TableCell className="text-center text-blue-600">{row.openingStock}</TableCell>
                            <TableCell className="text-center text-green-600">{movements.purchases}</TableCell>
                            <TableCell className="text-center text-orange-600">{movements.purchase_returns}</TableCell>
                            <TableCell className="text-center text-red-600 font-medium">{movements.sales}</TableCell>
                            <TableCell className="text-center text-red-600 font-medium">{movements.sales_returns}</TableCell>
                            <TableCell className="text-center text-red-500">{movements.wastages}</TableCell>
                            <TableCell className="text-center text-green-500">{movements.transfer_in}</TableCell>
                            <TableCell className="text-center text-red-500">{movements.transfer_out}</TableCell>
                            <TableCell className="text-center text-blue-500">{movements.manufacturing}</TableCell>
                            <TableCell className="text-center text-blue-500">{movements.consumption}</TableCell>
                            <TableCell className="text-center">
                              {hasVariance ? (
                                <Badge 
                                  variant={stockVariance > 0 ? "destructive" : stockVariance < 0 ? "default" : "secondary"}
                                  className="text-xs"
                                >
                                  {stockVariance > 0 ? '+' : ''}{stockVariance}
                                </Badge>
                              ) : (
                                <span className="text-gray-400">-</span>
                              )}
                            </TableCell>
                            <TableCell className="text-center font-medium text-blue-600">{closingStockWithVariance}</TableCell>
                          </TableRow>
                        );
                      })}
                      {/* Total Row */}
                      <TableRow className="bg-gray-50 border-t-2 border-gray-200">
                        <TableCell className="font-bold">Total</TableCell>
                        <TableCell className="text-center font-bold text-blue-600">{totals.totalOpeningStock.toFixed(2)}</TableCell>
                        <TableCell className="text-center font-bold text-green-600">{totals.totalPurchases.toFixed(2)}</TableCell>
                        <TableCell className="text-center font-bold text-orange-600">{totals.totalPurchaseReturns.toFixed(2)}</TableCell>
                        <TableCell className="text-center font-bold text-red-600">{totals.totalSales.toFixed(2)}</TableCell>
                        <TableCell className="text-center font-bold text-red-600">{totals.totalSalesReturns.toFixed(2)}</TableCell>
                        <TableCell className="text-center font-bold text-red-500">{totals.totalWastages.toFixed(2)}</TableCell>
                        <TableCell className="text-center font-bold text-green-500">{totals.totalTransferIN.toFixed(2)}</TableCell>
                        <TableCell className="text-center font-bold text-red-500">{totals.totalTransferOUT.toFixed(2)}</TableCell>
                        <TableCell className="text-center font-bold text-blue-500">{totals.totalManufacturing.toFixed(2)}</TableCell>
                        <TableCell className="text-center font-bold text-blue-500">{totals.totalConsumption.toFixed(2)}</TableCell>
                        <TableCell className="text-center font-bold">
                          {stockVarianceData.length > 0 ? (
                            <Badge 
                              variant={stockVarianceData.filter(v => !v.is_total).reduce((sum, v) => sum + v.stock_variance, 0) > 0 ? "destructive" : "default"}
                              className="text-xs"
                            >
                              {stockVarianceData.filter(v => !v.is_total).reduce((sum, v) => sum + v.stock_variance, 0) > 0 ? '+' : ''}
                              {stockVarianceData.filter(v => !v.is_total).reduce((sum, v) => sum + v.stock_variance, 0)}
                            </Badge>
                          ) : (
                            '-'
                          )}
                        </TableCell>
                        <TableCell className="text-center font-bold text-blue-600">
                          {totals.totalClosingStock + stockVarianceData.filter(v => !v.is_total).reduce((sum, v) => sum + v.stock_variance, 0)}
                        </TableCell>
                      </TableRow>
                    </>
                  ) : (
                    <TableRow>
                      <TableCell colSpan={10} className="text-center py-8 text-gray-500">
                        No warehouse data available for this SKU
                      </TableCell>
                    </TableRow>
                  )}
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