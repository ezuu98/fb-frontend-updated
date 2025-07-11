import express from "express"
import axios from "axios"
import { db } from "../config/supabase.js"
import { logger } from "../utils/logger.js"

const router = express.Router()

const ODOO_URL = process.env.ODOO_URL
const ODOO_DB = process.env.ODOO_DB
const ODOO_USERNAME = process.env.ODOO_USERNAME
const ODOO_PASSWORD = process.env.ODOO_PASSWORD
const ODOO_UID = 6

router.post("/status", async (req, res) => {
  try {
    const response = await axios.post(ODOO_URL, {
      jsonrpc: "2.0",
      method: "call",
      params: {
        service: "common",
        method: "login",
        args: [ODOO_DB, ODOO_USERNAME, ODOO_PASSWORD],
      },
    })

    const ODOO_UID = response.data.result

    if (!ODOO_UID) {
      logger.warn("Failed to get UID from Odoo")
      return res.status(500).json({ success: false, message: "Failed to connect to Odoo" })
    }

    logger.info("Odoo connection successful")
    res.json({ success: true, uid })
  } catch (error) {
    logger.error("Odoo connection failed", error.message)
    res.status(500).json({ success: false, message: "Odoo connection error", error: error.message })
  }

})

router.post("/sync", async (req, res) => {
  try {
    if (!ODOO_UID) {
      return res.status(400).json({ success: false, message: "Odoo UID not initiated" })
    }

    // Fetch stock quants - quantity by product and location
    const response = await axios.post(ODOO_URL, {
      jsonrpc: "2.0",
      method: "call",
      params: {
        service: "object",
        method: "execute_kw",
        args: [
          ODOO_DB,
          ODOO_UID,
          ODOO_PASSWORD,
          "product.product",
          "search_read",
          [[], ["barcode", "name", "categ_id", "uom_id", "standard_price", "location_id", "qty_available"]]
        ],
      },
      id: 1,
    });

    const products = response.data.result;

    const transformedProducts = products.map(p => ({
      barcode: p.barcode,
      product_name: p.name,
      categ_id: p.categ_id, 
      category_id:"a4f13228-5bf4-4262-b670-b5a6bfeaec86",
      sub_category: "Smartphones",
      unit_of_measure: p.uom_id,
      unit_cost: p.standard_price || 0,
      reorder_level: 10, 
      max_stock_level: 2000,
      description: p.description_sale || "",
      is_active: true,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }));

    const results = [];
    let successCount = 0;
    let errorCount = 0;

    for (const product of transformedProducts) {
      try {
        if (!product.barcode) {
          console.log(`⚠️ Skipping product without barcode: ${product.product_name}`);
          continue;
        }

        const existingItem = await db.findInventoryByOdooId(product.odoo_id);
        if (existingItem) {
          continue;
        }

        const result = await db.createInventoryItem(product);
        results.push(result);
        successCount++;
        console.log(`✅ Created: ${product.product_name}`);
      } catch (error) {
        errorCount++;
        console.error(`❌ Error creating ${product.product_name}:`, error.message);
        results.push({ error: error.message, product: product.product_name });
      }
    }

    console.log(`📊 Sync Summary: ${successCount} success, ${errorCount} errors`);

    return res.json({ 
      success: true, 
      message: 'Products synced successfully',
      summary: {
        total: transformedProducts.length,
        successful: successCount,
        errors: errorCount
      },
      data: results 
    });

  } catch (error) {
    console.error("Error syncing products:", error.message);
    return res.status(500).json({ 
      success: false, 
      message: "Product sync error", 
      error: error.message 
    });
  }
});

// const mockItem = {
//   barcode: '1234567890123917293',
//   product_name: 'iPhone 15 Pro',
//   category_id: '018ae259-de30-4fd6-8340-2e2cfe63a551',
//   sub_category: 'Smartphones',
//   unit_of_measure:'kg',
//   unit_cost: 999.99,
//   reorder_level: 10,
//   max_stock_level:2000,
//   description: 'Latest iPhone with advanced features',
//   is_active: true,
//   created_at: new Date().toISOString(),
//   updated_at: new Date().toISOString()
// }


//   // Insert the item
//   const result = await db.createInventoryItem(mockItem)
//   console.log(`✅ Created: ${mockItem.product_name} (${mockItem.barcode})`)

//   res.status(200).json({
//     success: true,
//     message: 'Mock data uploaded successfully',
//     item: result
//   })

// } catch (error) {
//   console.error('❌ Mock data upload failed:', error)
//   res.status(500).json({
//     success: false,
//     message: 'Failed to upload mock data',
//     error: error.message
//   })
// }


export default router
