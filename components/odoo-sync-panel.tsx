"use client"

import React, { useState } from "react"
import { Button } from "@/components/ui/button"
import { RefreshCw, Download, PlugZap } from "lucide-react"
import axios from "axios"

// Create an axios instance with base configuration
const api = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL,
  headers: { "Content-Type": "application/json" },
})

export function OdooSyncPanel() {
  const [isSyncing, setIsSyncing] = useState(false)
  const [isTesting, setIsTesting] = useState(false)
  const [message, setMessage] = useState("")

  const handleTestConnection = async () => {
    setIsTesting(true)
    try {
      const response = await api.post("/odoo/status")
      console.log("Connection successful:")
      setMessage("✅ Connection successful")
    } catch (err) {
      console.error("Connection test failed:", err)
      setMessage("❌ Connection failed")
    } finally {
      setIsTesting(false)
    }
  }

  const handleSync = async () => {
    setIsSyncing(true)
    try {
      const response = await api.post("/odoo/sync")
      console.log("Sync response:", response.data)
    } catch (err) {
      console.error("Sync failed:", err)
    } finally {
      setIsSyncing(false)
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex space-x-4">
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