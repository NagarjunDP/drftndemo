-- Update catalog prices in paise.
-- Product variants are updated as well so variant price overrides cannot keep
-- displaying an old price after the base product price changes.
UPDATE products AS p
SET price = CASE
      WHEN p.category = 't-shirts' AND p.subcategory = 'waffle-t-shirts' THEN 99900
      WHEN p.category = 't-shirts' THEN 89900
      WHEN p.category = 'shirts' AND p.subcategory IN ('imp-shirts', 'imported-shirts') THEN 129900
      WHEN p.category = 'shirts' AND p.subcategory = 'regular-shirts' THEN 109900
      WHEN p.category = 'denims' AND p.subcategory = 'regular-denims' THEN 129900
      WHEN p.category = 'denims' AND p.subcategory = 'pattern-denims' THEN 149900
      WHEN p.category = 'formal-pants' THEN 149900
      WHEN p.category = 'hoodies' THEN 149900
      WHEN p.category = 'jackets' AND p.subcategory IN ('biker-jackets', 'varsity-jackets') THEN 200000
      WHEN p.category = 'jackets' AND p.subcategory = 'checked-jackets' THEN 220000
    END,
    updated_at = NOW()
WHERE p.category IN ('t-shirts', 'shirts', 'denims', 'formal-pants', 'hoodies', 'jackets')
  AND CASE
    WHEN p.category = 't-shirts' THEN TRUE
    WHEN p.category = 'shirts' THEN p.subcategory IN ('imp-shirts', 'imported-shirts', 'regular-shirts')
    WHEN p.category = 'denims' THEN p.subcategory IN ('regular-denims', 'pattern-denims')
    WHEN p.category IN ('formal-pants', 'hoodies') THEN TRUE
    WHEN p.category = 'jackets' THEN p.subcategory IN ('biker-jackets', 'varsity-jackets', 'checked-jackets')
    ELSE FALSE
  END;
--> statement-breakpoint
UPDATE product_variants AS v
SET price_override = p.price,
    updated_at = NOW()
FROM products AS p
WHERE v.product_id = p.id
  AND p.category IN ('t-shirts', 'shirts', 'denims', 'formal-pants', 'hoodies', 'jackets')
  AND CASE
    WHEN p.category = 't-shirts' THEN TRUE
    WHEN p.category = 'shirts' THEN p.subcategory IN ('imp-shirts', 'imported-shirts', 'regular-shirts')
    WHEN p.category = 'denims' THEN p.subcategory IN ('regular-denims', 'pattern-denims')
    WHEN p.category IN ('formal-pants', 'hoodies') THEN TRUE
    WHEN p.category = 'jackets' THEN p.subcategory IN ('biker-jackets', 'varsity-jackets', 'checked-jackets')
    ELSE FALSE
  END;
