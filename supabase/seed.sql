-- =============================================================================
-- FITPLUS STAGE 4E: SUPABASE SEED DATA
-- Default feature flags, exercise catalog base, and active promo coupons
-- =============================================================================

INSERT INTO feature_flags (flag_key, is_enabled, description) VALUES
('supabase_database', true, 'Use Supabase PostgreSQL instead of Cloud Firestore'),
('supabase_storage', true, 'Use Supabase Storage instead of Firebase Storage'),
('supabase_realtime', true, 'Use Supabase Realtime for chat, notifications and task updates')
ON CONFLICT (flag_key) DO UPDATE SET
  is_enabled = EXCLUDED.is_enabled,
  description = EXCLUDED.description;

INSERT INTO coupons (code, discount_type, discount_value, max_discount_inr, min_order_inr, valid_from, valid_until, is_active) VALUES
('FITPLUS50', 'percentage', 50.00, 1000, 999, now(), now() + interval '1 year', true),
('WELCOME100', 'flat', 100.00, 100, 499, now(), now() + interval '1 year', true),
('DIWALI2026', 'percentage', 20.00, 500, 1499, now(), now() + interval '1 year', true)
ON CONFLICT (code) DO NOTHING;
