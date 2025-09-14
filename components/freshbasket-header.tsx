"use client"

import Link from "next/link"
import { Button } from "@/components/ui/button"

export default function FreshBasketHeader() {
  return (
    <header className="bg-white border-b border-gray-200 px-6 py-4">
      <div className="mx-auto flex w-full max-w-6xl items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="h-9 w-9 rounded-md bg-green-600 text-white flex items-center justify-center font-bold">FB</div>
          <Link href="/" className="text-xl font-semibold tracking-tight text-gray-900">
            Fresh Basket
          </Link>
        </div>
        <div className="flex items-center gap-3">
          <Button asChild variant="outline" size="sm">
            <Link href="/">Dashboard</Link>
          </Button>
        </div>
      </div>
    </header>
  )
}
