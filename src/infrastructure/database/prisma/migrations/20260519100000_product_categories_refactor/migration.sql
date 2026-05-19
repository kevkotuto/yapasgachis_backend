-- Refactor ProductCategory enum: 15 → 8 categories
-- Maps existing rows to the new 8-category taxonomy.

-- 1. Rename the old enum
ALTER TYPE "ProductCategory" RENAME TO "ProductCategory_old";

-- 2. Create the new enum
CREATE TYPE "ProductCategory" AS ENUM (
  'BAKERY_PASTRY',
  'GROCERY_BASKET',
  'INTERNATIONAL_CUISINE',
  'LOCAL_TRADITIONAL',
  'RESTAURANT',
  'PREPARED_MEALS_INDIVIDUAL',
  'MEAT_FISH',
  'OTHER'
);

-- 3. Migrate products.category to the new enum with the mapping
ALTER TABLE "products"
  ALTER COLUMN "category" TYPE "ProductCategory"
  USING (
    CASE "category"::text
      WHEN 'BAKERY' THEN 'BAKERY_PASTRY'
      WHEN 'PASTRY' THEN 'BAKERY_PASTRY'
      WHEN 'GROCERY_BASKET' THEN 'GROCERY_BASKET'
      WHEN 'GROCERIES' THEN 'GROCERY_BASKET'
      WHEN 'FRUITS_VEGETABLES' THEN 'GROCERY_BASKET'
      WHEN 'DAIRY' THEN 'GROCERY_BASKET'
      WHEN 'DAIRY_DELI' THEN 'GROCERY_BASKET'
      WHEN 'INTERNATIONAL_CUISINE' THEN 'INTERNATIONAL_CUISINE'
      WHEN 'LOCAL_TRADITIONAL' THEN 'LOCAL_TRADITIONAL'
      WHEN 'RESTAURANT_HOT_MEALS' THEN 'RESTAURANT'
      WHEN 'PREPARED_MEALS_INDIVIDUAL' THEN 'PREPARED_MEALS_INDIVIDUAL'
      WHEN 'FOOD_PREPARED' THEN 'PREPARED_MEALS_INDIVIDUAL'
      WHEN 'MEAT_FISH' THEN 'MEAT_FISH'
      WHEN 'SNACKS_SALADS' THEN 'OTHER'
      WHEN 'OTHER' THEN 'OTHER'
      ELSE 'OTHER'
    END
  )::"ProductCategory";

-- 4. Drop the old enum
DROP TYPE "ProductCategory_old";
