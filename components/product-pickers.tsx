"use client"

import { useMemo, useState } from "react"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"

export interface ProductItem {
  id: string
  label: string
  code: string | null
  category: string | null
}

export interface WarehouseItem {
  id: number
  display_name: string
}

export default function ProductPickers({ items, warehouses }: { items: ProductItem[]; warehouses: WarehouseItem[] }) {
  const [query, setQuery] = useState("")
  const [selectedProduct, setSelectedProduct] = useState<string | null>(null)
  const [selectedWarehouse, setSelectedWarehouse] = useState<number | null>(null)

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return items.slice(0, 50)
    const res = items.filter((it) => {
      const code = it.code ? String(it.code).toLowerCase() : ""
      const cat = it.category ? String(it.category).toLowerCase() : ""
      return (
        it.label.toLowerCase().includes(q) ||
        code.includes(q) ||
        cat.includes(q)
      )
    })
    return res.slice(0, 50)
  }, [items, query])

  const selected = useMemo(() => items.find((i) => i.id === selectedProduct) || null, [items, selectedProduct])

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Select Product and Warehouse</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-3">
          <div className="md:col-span-2 space-y-2">
            <label className="text-sm font-medium text-gray-700">Search product</label>
            <Input
              placeholder="Search by name, barcode, or category"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-700">Warehouse</label>
            <Select onValueChange={(v) => setSelectedWarehouse(Number(v))} value={selectedWarehouse?.toString() ?? undefined}>
              <SelectTrigger>
                <SelectValue placeholder="Select warehouse" />
              </SelectTrigger>
              <SelectContent>
                {warehouses.map((w) => (
                  <SelectItem key={w.id} value={String(w.id)}>{w.display_name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Matching Products</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow className="bg-gray-50">
                <TableHead className="text-xs uppercase text-gray-600">Name</TableHead>
                <TableHead className="text-xs uppercase text-gray-600">Code</TableHead>
                <TableHead className="text-xs uppercase text-gray-600">Category</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((it) => (
                <TableRow
                  key={it.id}
                  className={selectedProduct === it.id ? "bg-green-50" : "cursor-pointer"}
                  onClick={() => setSelectedProduct(it.id)}
                >
                  <TableCell className="font-medium">{it.label}</TableCell>
                  <TableCell className="text-gray-600">{it.code ?? "—"}</TableCell>
                  <TableCell className="text-gray-600">{it.category ?? "—"}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {selected && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Selected</CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-gray-800 space-y-1">
            <div><span className="font-medium">Product:</span> {selected.label}</div>
            <div><span className="font-medium">Code:</span> {selected.code ?? "—"}</div>
            <div><span className="font-medium">Category:</span> {selected.category ?? "—"}</div>
            <div><span className="font-medium">Warehouse:</span> {selectedWarehouse != null ? warehouses.find(w => w.id === selectedWarehouse)?.display_name ?? selectedWarehouse : "—"}</div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
