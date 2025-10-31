-- Performance Optimization Indexes
-- Run this SQL on your database to improve query performance

-- Indexes for date filtering (used in ALL queries)
CREATE INDEX IF NOT EXISTS idx_ads_delivery_start ON ads(ad_delivery_start_time);
CREATE INDEX IF NOT EXISTS idx_ads_delivery_stop ON ads(ad_delivery_stop_time);

-- Composite index for date range queries
CREATE INDEX IF NOT EXISTS idx_ads_date_range ON ads(ad_delivery_start_time, ad_delivery_stop_time);

-- Index for spend calculations and sorting
CREATE INDEX IF NOT EXISTS idx_ads_spend ON ads((spend_lower + spend_upper) DESC);

-- Index for page_id lookups
CREATE INDEX IF NOT EXISTS idx_ads_page_id ON ads(page_id);

-- Index for bylines searches (used in party classification)
CREATE INDEX IF NOT EXISTS idx_ads_bylines ON ads(bylines);

-- Indexes for ad_regions table (used in geographic queries)
CREATE INDEX IF NOT EXISTS idx_ad_regions_ad_id ON ad_regions(ad_id);
CREATE INDEX IF NOT EXISTS idx_ad_regions_region ON ad_regions(region);

-- Composite index for ad_regions JOIN with filtering
CREATE INDEX IF NOT EXISTS idx_ad_regions_region_ad_id ON ad_regions(region, ad_id);

-- Index for pages table JOIN
CREATE INDEX IF NOT EXISTS idx_pages_page_id ON pages(page_id);

-- Index for impressions
CREATE INDEX IF NOT EXISTS idx_ads_impressions ON ads((impressions_lower + impressions_upper) DESC);

-- Analyze tables to update statistics
ANALYZE ads;
ANALYZE ad_regions;
ANALYZE pages;