-- Add function to get stock variance before a specific date
-- This is used for calculating opening stock with variance adjustments

CREATE OR REPLACE FUNCTION get_stock_variance_before_date(
  p_product_id NUMERIC,
  p_date DATE
) RETURNS TABLE (
  warehouse_id UUID,
  warehouse_code VARCHAR,
  warehouse_name VARCHAR,
  stock_variance INTEGER
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    w.uuid as warehouse_id,
    w.code as warehouse_code,
    w.name as warehouse_name,
    COALESCE(SUM(sc.variance_quantity), 0)::INTEGER as stock_variance
  FROM warehouses w
  LEFT JOIN stock_corrections sc ON w.uuid = sc.warehouse_id 
    AND sc.product_id = p_product_id::INTEGER
    AND sc.correction_date < p_date
  WHERE w.active = true
  GROUP BY w.uuid, w.code, w.name
  ORDER BY w.code;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Add comment
COMMENT ON FUNCTION get_stock_variance_before_date(NUMERIC, DATE) IS 'Get cumulative stock variance before a specific date for opening stock calculation';
