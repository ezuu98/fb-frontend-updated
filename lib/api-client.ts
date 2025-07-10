const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001/api";

console.log(API_URL)
interface ApiResponse<T = any> {
  success: boolean
  data?: T
  message?: string
  error?: string
  results?: any
  pagination?: {
    page: number
    limit: number
    total: number
    pages: number
  }
}

class ApiClient {
  private baseURL: string
  private token: string | null = null

  constructor(baseURL: string = API_URL) {
    this.baseURL = baseURL
  }


  setToken(token: string) {
    this.token = token
  }

  private async request<T>(endpoint: string, options: RequestInit = {}): Promise<ApiResponse<T>> {
    const url = `${this.baseURL}${endpoint}`

    const config: RequestInit = {
      headers: {
        "Content-Type": "application/json",
        ...(this.token && { Authorization: `Bearer ${this.token}` }),
        ...options.headers,
      },
      ...options,
    }

    try {
      const response = await fetch(url, config)
      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.message || `HTTP error! status: ${response.status}`)
      }

      return data
    } catch (error) {
      console.error("API request failed:", error)
      throw error
    }
  }

  // Auth endpoints
  async login(email: string, password: string) {
    return this.request<{ user: any; token: string; expires_at: string }>("/auth/login", {
      method: "POST",
      body: JSON.stringify({ email, password }),
    })
  }

  async register(email: string, password: string, full_name: string) {
    return this.request<{ user: any; token: string; expires_at: string }>("/auth/register", {
      method: "POST",
      body: JSON.stringify({ email, password, full_name }),
    })
  }

  async logout() {
    return this.request("/auth/logout", { method: "POST" })
  }

  async getCurrentUser() {
    return this.request<any>("/auth/me")
  }

  // Inventory endpoints
  async getInventory(params?: {
    search?: string
    category_id?: string
    warehouse_id?: string
    page?: number
    limit?: number
  }) {
    const searchParams = new URLSearchParams()
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined) {
          searchParams.append(key, value.toString())
        }
      })
    }

    return this.request<any[]>(`/inventory?${searchParams}`)
  }

  async getInventoryItem(id: string) {
    return this.request<any>(`/inventory/${id}`)
  }

  async createInventoryItem(data: any) {
    return this.request<any>("/inventory", {
      method: "POST",
      body: JSON.stringify(data),
    })
  }

  async updateInventoryItem(id: string, data: any) {
    return this.request<any>(`/inventory/${id}`, {
      method: "PUT",
      body: JSON.stringify(data),
    })
  }

  async deleteInventoryItem(id: string) {
    return this.request(`/inventory/${id}`, { method: "DELETE" })
  }

  async adjustStock(
    id: string,
    data: {
      warehouse_id: string
      quantity_change: number
      reason?: string
      reference?: string
    },
  ) {
    return this.request(`/inventory/${id}/stock-adjustment`, {
      method: "POST",
      body: JSON.stringify(data),
    })
  }

  // Dashboard endpoints
  async getDashboardStats() {
    return this.request<{
      totalProducts: number
      totalCategories: number
      totalWarehouses: number
      totalStock: number
      totalValue: number
      lowStockCount: number
      outOfStockCount: number
      recentMovements: any[]
    }>("/dashboard/stats")
  }

  async getLowStockItems(limit?: number) {
    const params = limit ? `?limit=${limit}` : ""
    return this.request<any[]>(`/dashboard/low-stock${params}`)
  }

  async getOutOfStockItems(limit?: number) {
    const params = limit ? `?limit=${limit}` : ""
    return this.request<any[]>(`/dashboard/out-of-stock${params}`)
  }

  async getTopProducts(limit?: number) {
    const params = limit ? `?limit=${limit}` : ""
    return this.request<any[]>(`/dashboard/top-products${params}`)
  }

  // Stock movements endpoints
  async getStockMovements(params?: {
    inventory_id?: string
    warehouse_id?: string
    movement_type?: string
    page?: number
    limit?: number
    start_date?: string
    end_date?: string
  }) {
    const searchParams = new URLSearchParams()
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined) {
          searchParams.append(key, value.toString())
        }
      })
    }

    return this.request<any[]>(`/stock-movements?${searchParams}`)
  }

  async getStockMovement(id: string) {
    return this.request<any>(`/stock-movements/${id}`)
  }

  async createStockMovement(data: any) {
    return this.request<any>("/stock-movements", {
      method: "POST",
      body: JSON.stringify(data),
    })
  }

  async getStockMovementSummary(inventoryId: string, days?: number) {
    const params = days ? `?days=${days}` : ""
    return this.request<{
      summary: { totalIn: number; totalOut: number; netChange: number }
      movements: any[]
      period: string
    }>(`/stock-movements/summary/${inventoryId}${params}`)
  }

  // Warehouses endpoints
  async getWarehouses(params?: {
    page?: number
    limit?: number
    search?: string
  }) {
    const searchParams = new URLSearchParams()
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined) {
          searchParams.append(key, value.toString())
        }
      })
    }

    return this.request<any[]>(`/warehouses?${searchParams}`)
  }

  async getWarehouse(id: string) {
    return this.request<any>(`/warehouses/${id}`)
  }

  async createWarehouse(data: any) {
    return this.request<any>("/warehouses", {
      method: "POST",
      body: JSON.stringify(data),
    })
  }

  async updateWarehouse(id: string, data: any) {
    return this.request<any>(`/warehouses/${id}`, {
      method: "PUT",
      body: JSON.stringify(data),
    })
  }

  async deleteWarehouse(id: string) {
    return this.request(`/warehouses/${id}`, { method: "DELETE" })
  }

  async getWarehouseInventory(
    id: string,
    params?: {
      page?: number
      limit?: number
      search?: string
    },
  ) {
    const searchParams = new URLSearchParams()
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined) {
          searchParams.append(key, value.toString())
        }
      })
    }

    return this.request<any[]>(`/warehouses/${id}/inventory?${searchParams}`)
  }

  // Categories endpoints
  async getCategories(params?: {
    page?: number
    limit?: number
    search?: string
  }) {
    const searchParams = new URLSearchParams()
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined) {
          searchParams.append(key, value.toString())
        }
      })
    }

    return this.request<any[]>(`/categories?${searchParams}`)
  }

  async getCategory(id: string) {
    return this.request<any>(`/categories/${id}`)
  }

  async createCategory(data: any) {
    return this.request<any>("/categories", {
      method: "POST",
      body: JSON.stringify(data),
    })
  }

  async updateCategory(id: string, data: any) {
    return this.request<any>(`/categories/${id}`, {
      method: "PUT",
      body: JSON.stringify(data),
    })
  }

  async deleteCategory(id: string) {
    return this.request(`/categories/${id}`, { method: "DELETE" })
  }

  // Odoo endpoints
  async getOdooStatus() {
    return this.request<{
      connected: boolean
      server_version: string
      database: string
      last_sync: string
      total_products: number
      total_categories: number
      total_warehouses: number
    }>("/odoo/status", { method: "POST" })
  }

  async syncOdoo() {
    return this.request<{
      results: {
        categories: { created: number; updated: number; errors: number }
        warehouses: { created: number; updated: number; errors: number }
        products: { created: number; updated: number; errors: number }
        warehouse_inventory: { created: number; updated: number; errors: number }
        total_time: number
      }
    }>("/odoo/sync", { method: "POST" })
  }

  async getOdooProducts() {
    return this.request<any[]>("/odoo/products")
  }

  async getOdooCategories() {
    return this.request<any[]>("/odoo/categories")
  }

  async getOdooWarehouses() {
    return this.request<any[]>("/odoo/warehouses")
  }
}

export const apiClient = new ApiClient()
export default apiClient
