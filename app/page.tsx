"use client"

<<<<<<< HEAD
import { LoginPage } from "@/components/login-page"
import { InventoryDashboard } from "@/components/inventory-dashboard"
import { useAuth } from "@/hooks/use-auth"

export default function Home() {
  const { user, loading } = useAuth()

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    )
  }

  if (!user) {
    return <LoginPage />
  }

  return <InventoryDashboard />
=======
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
>>>>>>> ce88eb48082ad9403820865f8236f456892730ea
}
