-- ============================================================
-- Toys World — Product Inventory Foundation
-- Migration: 011_product_inventory.sql
--
-- Adds numeric inventory independently from the existing
-- availability_status field.
-- ============================================================

ALTER TABLE public.products
    ADD COLUMN stock_quantity INTEGER NOT NULL DEFAULT 0
    CONSTRAINT products_stock_quantity_nonnegative CHECK (stock_quantity >= 0);

-- Existing product rows receive 0 from the column default. No
-- quantity is inferred from the existing availability values.
