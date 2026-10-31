-- Replace the old Drift Mode coupon with the requested 10% coupon.
DELETE FROM discount_codes
WHERE code IN (
  'DRIFTMODEON40',
  'DRFTNMODEON40',
  'DRIFTMODEON30',
  'DRIFTMODEON20',
  'DRFTNMODEON20',
  'DRIFTMODE20'
);
--> statement-breakpoint
DELETE FROM drift_mode_coupons
WHERE code IN ('DRIFTMODEON40', 'DRFTNMODEON40', 'DRIFTMODEON30', 'DRIFTMODEON20', 'DRFTNMODEON20', 'DRIFTMODE20');
--> statement-breakpoint
INSERT INTO discount_codes (
  code,
  discount_type,
  discount_value,
  min_order_value,
  usage_limit,
  used_count,
  is_active
)
VALUES ('DRFTNMODEON10', 'percent', 10, 149900, NULL, 0, TRUE)
ON CONFLICT (code) DO UPDATE SET
  discount_type = EXCLUDED.discount_type,
  discount_value = EXCLUDED.discount_value,
  min_order_value = EXCLUDED.min_order_value,
  usage_limit = EXCLUDED.usage_limit,
  is_active = EXCLUDED.is_active,
  updated_at = NOW();
--> statement-breakpoint
INSERT INTO drift_mode_settings (id, is_active, discount_percent, updated_at)
VALUES (1, TRUE, 10, NOW())
ON CONFLICT (id) DO UPDATE SET
  discount_percent = 10,
  updated_at = NOW();
--> statement-breakpoint
INSERT INTO settings (key, value, updated_at)
VALUES ('signup_discount_code', 'DRFTNMODEON10', NOW())
ON CONFLICT (key) DO UPDATE SET
  value = EXCLUDED.value,
  updated_at = NOW();
