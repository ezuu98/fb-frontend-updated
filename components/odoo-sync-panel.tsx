"use client"

import React, { useState } from "react"
import { Button } from "@/components/ui/button"
import { RefreshCw, Download, PlugZap } from "lucide-react"
import { apiClient } from "@/lib/api-client"

export function OdooSyncPanel() {
  const [isSyncing, setIsSyncing] = useState(false)
  const [isTesting, setIsTesting] = useState(false)
  const [message, setMessage] = useState("")
  const [since, setSince] = useState<string>("")

  const handleTestConnection = async () => {
    setIsTesting(true)
    try {
      // For now, we'll test by trying to sync products
      await apiClient.syncProducts()
      setMessage("✅ Connection successful")
    } catch (err: any) {
      console.error("Connection test failed:", err)
      setMessage("❌ Connection failed: " + err.message)
    } finally {
      setIsTesting(false)
    }
  }

  const handleSync = async () => {
    setIsSyncing(true)
    try {
      const isoSince = since ? new Date(since).toISOString() : undefined
      const result = await apiClient.syncAll(isoSince)
      setMessage(`✅ Sync completed! ${result.count} records processed`)
    } catch (err: any) {
      console.error("Sync failed:", err)
      setMessage("❌ Sync failed: " + err.message)
    } finally {
      setIsSyncing(false)
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-end sm:space-x-4 space-y-3 sm:space-y-0">
        <div className="flex flex-col">
          <label className="text-sm font-medium mb-1">Start date (optional)</label>
          <input
            type="datetime-local"
            value={since}
            onChange={(e) => setSince(e.target.value)}
            className="border rounded px-2 py-1 text-sm"
          />
        </div>
        <Button onClick={handleTestConnection} disabled={isTesting}>
          {isTesting ? (
            <>
              <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
              Testing...
            </>
          ) : (
            <>
              <PlugZap className="mr-2 h-4 w-4" />
              Test Connection
            </>
          )}
        </Button>

        <Button onClick={handleSync} disabled={isSyncing}>
          {isSyncing ? (
            <>
              <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
              Syncing...
            </>
          ) : (
            <>
              <Download className="mr-2 h-4 w-4" />
              Sync Inventory
            </>
          )}
        </Button>
      </div>

      {/* ✅ Feedback message */}
      {message && (
        <p
          className={`text-sm ${message.includes("✅") ? "text-green-600" : "text-red-600"
            }`}
        >
          {message}
        </p>
      )}
    </div>
  )

}