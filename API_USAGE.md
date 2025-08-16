# Stock Corrections API Usage

## Variance Endpoints

### Get Stock Variance with Totals
**Endpoint:** `GET /api/stock-corrections/variance-with-totals/:productId`

**Required Query Parameters:**
- `start_date` (YYYY-MM-DD format)
- `end_date` (YYYY-MM-DD format)

**Example Usage:**

✅ **CORRECT:**
```
GET /api/stock-corrections/variance-with-totals/2304?start_date=2025-07-22&end_date=2025-07-22
```

❌ **INCORRECT:**
```
GET /api/stock-corrections/variance-with-totals/2304?date=2025-07-22
```

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "warehouse_id": "uuid",
      "warehouse_code": "WH001",
      "warehouse_name": "Main Warehouse",
      "calculated_closing_stock": 100,
      "stock_variance": 5,
      "closing_stock": 105,
      "has_variance": true,
      "is_total": false
    },
    {
      "warehouse_id": null,
      "warehouse_code": "TOTAL",
      "warehouse_name": "Total",
      "calculated_closing_stock": 100,
      "stock_variance": 5,
      "closing_stock": 105,
      "has_variance": true,
      "is_total": true
    }
  ]
}
```

### Get Stock Variance (without totals)
**Endpoint:** `GET /api/stock-corrections/variance/:productId`

**Required Query Parameters:**
- `start_date` (YYYY-MM-DD format)
- `end_date` (YYYY-MM-DD format)

**Example Usage:**
```
GET /api/stock-corrections/variance/2304?start_date=2025-07-22&end_date=2025-07-22
```

## Testing

You can test the API using the provided test script:

```bash
node test-variance-api.js
```

## Frontend Integration

The frontend is already correctly implemented to use the date range parameters. See `components/sku-detail-view.tsx` for the correct implementation.
