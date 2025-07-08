"use client"

import { useState } from "react"
import { LoginPage } from "@/components/login-page"
import { InventoryDashboard } from "@/components/inventory-dashboard"

interface User {
  email: string
  name?: string
}

export default function Home() {
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [user, setUser] = useState<User | null>(null)

  const handleLogin = (credentials: { email: string; password: string; rememberMe: boolean }) => {
    // In a real app, you would validate credentials against your backend
    // For demo purposes, we'll accept the demo credentials
    if (credentials.email === "admin@freshbasket.com" && credentials.password === "password123") {
      const userData: User = {
        email: credentials.email,
        name: "Admin User",
      }
      setUser(userData)
      setIsAuthenticated(true)

      // If remember me is checked, you could store in localStorage
      if (credentials.rememberMe) {
        localStorage.setItem("freshbasket_user", JSON.stringify(userData))
      }
    } else {
      // In a real app, you would show an error message
      alert("Invalid credentials. Please use the demo credentials provided.")
    }
  }

  const handleLogout = () => {
    setIsAuthenticated(false)
    setUser(null)
    localStorage.removeItem("freshbasket_user")
  }

  // Check for stored user on component mount
  useState(() => {
    const storedUser = localStorage.getItem("freshbasket_user")
    if (storedUser) {
      try {
        const userData = JSON.parse(storedUser)
        setUser(userData)
        setIsAuthenticated(true)
      } catch (error) {
        localStorage.removeItem("freshbasket_user")
      }
    }
  })

  if (!isAuthenticated || !user) {
    return <LoginPage onLogin={handleLogin} />
  }

  return <InventoryDashboard user={user} onLogout={handleLogout} />
}
