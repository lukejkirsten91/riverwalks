-- Update lifetime plan price from £3.50 (350p) to £3.49 (349p)
-- Run this if you already executed add-subscription-system.sql with the old price

-- Update the voucher validation function to use correct lifetime price
CREATE OR REPLACE FUNCTION validate_voucher(voucher_code_input TEXT, user_uuid UUID, plan_type_input TEXT)
RETURNS TABLE (
  is_valid BOOLEAN,
  discount_type TEXT,
  discount_value INTEGER,
  final_discount_pence INTEGER,
  error_message TEXT
) AS $$
DECLARE
  voucher_record RECORD;
  user_has_subscription BOOLEAN;
  discount_amount INTEGER := 0;
BEGIN
  -- Check if voucher exists and is active
  SELECT * INTO voucher_record
  FROM vouchers v
  WHERE v.code = voucher_code_input
  AND v.is_active = true
  AND (v.valid_until IS NULL OR v.valid_until > NOW())
  AND v.uses_count < v.max_uses
  AND plan_type_input = ANY(v.plan_types);
  
  IF voucher_record IS NULL THEN
    RETURN QUERY SELECT false, NULL::TEXT, NULL::INTEGER, NULL::INTEGER, 'Invalid or expired voucher code';
    RETURN;
  END IF;
  
  -- Check if user already has subscription (for new_users_only vouchers)
  IF voucher_record.new_users_only THEN
    SELECT has_active_subscription(user_uuid) INTO user_has_subscription;
    IF user_has_subscription THEN
      RETURN QUERY SELECT false, NULL::TEXT, NULL::INTEGER, NULL::INTEGER, 'This voucher is only valid for new users';
      RETURN;
    END IF;
  END IF;
  
  -- Calculate discount with UPDATED PRICES
  IF voucher_record.discount_type = 'percentage' THEN
    IF plan_type_input = 'yearly' THEN
      discount_amount := ROUND((199 * voucher_record.discount_value) / 100.0);
    ELSE -- lifetime - UPDATED TO 349p
      discount_amount := ROUND((349 * voucher_record.discount_value) / 100.0);
    END IF;
  ELSE -- fixed_amount
    discount_amount := voucher_record.discount_value;
  END IF;
  
  RETURN QUERY SELECT 
    true,
    voucher_record.discount_type,
    voucher_record.discount_value,
    discount_amount,
    NULL::TEXT;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Note: This only updates the function calculation
-- Any existing subscription records with old prices will remain unchanged
-- New subscriptions will use the correct £3.49 price

SELECT 'Lifetime plan price updated from £3.50 to £3.49 in voucher validation function' as status;