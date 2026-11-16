-- =============================================================================
-- FITPLUS STAGE 4E: SUPABASE POSTGRESQL SCHEMA MIGRATION
-- Migration 003: Database Functions, Triggers & Atomic Operations
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 1. Automatic updated_at Trigger
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DO $$
DECLARE
  t text;
BEGIN
  FOR t IN 
    SELECT table_name 
    FROM information_schema.columns 
    WHERE table_schema = 'public' AND column_name = 'updated_at'
  LOOP
    EXECUTE format('DROP TRIGGER IF EXISTS trg_set_updated_at ON %I;', t);
    EXECUTE format('CREATE TRIGGER trg_set_updated_at BEFORE UPDATE ON %I FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();', t);
  END LOOP;
END;
$$;

-- -----------------------------------------------------------------------------
-- 2. Atomic Payment Activation Function
-- Executes payment capture, subscription creation, relationship establishment,
-- referral conversion, and notifications in one atomic transaction.
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION activate_payment_subscription(
  p_order_id TEXT,
  p_payment_id TEXT,
  p_gateway_status TEXT,
  p_payment_method TEXT,
  p_raw_payload JSONB
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_payment payment_records%ROWTYPE;
  v_package coaching_packages%ROWTYPE;
  v_sub_id TEXT;
  v_rel_id TEXT;
  v_enr_id TEXT;
  v_period_end TIMESTAMPTZ;
  v_now TIMESTAMPTZ := now();
BEGIN
  -- 1. Fetch and lock payment record
  SELECT * INTO v_payment
  FROM payment_records
  WHERE cashfree_order_id = p_order_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Payment record not found for order: ' || p_order_id);
  END IF;

  -- Idempotency check: if already captured, return success immediately
  IF v_payment.status = 'captured' THEN
    RETURN jsonb_build_object(
      'success', true, 
      'already_processed', true, 
      'payment_id', v_payment.id,
      'subscription_id', v_payment.subscription_id
    );
  END IF;

  -- 2. Fetch package details
  SELECT * INTO v_package
  FROM coaching_packages
  WHERE id = v_payment.package_id;

  v_period_end := v_now + (coalesce(v_package.duration_days, 30) || ' days')::interval;
  v_sub_id := 'sub_' || substr(md5(random()::text || clock_timestamp()::text), 1, 16);
  v_rel_id := 'rel_' || substr(md5(random()::text || clock_timestamp()::text), 1, 16);
  v_enr_id := 'enr_' || substr(md5(random()::text || clock_timestamp()::text), 1, 16);

  -- 3. Insert or update subscription
  INSERT INTO subscriptions (
    id,
    client_user_id,
    trainer_user_id,
    package_id,
    status,
    current_period_start,
    current_period_end,
    amount_inr,
    amount_paise,
    currency
  ) VALUES (
    v_sub_id,
    v_payment.client_user_id,
    v_payment.trainer_user_id,
    v_payment.package_id,
    'active',
    v_now,
    v_period_end,
    v_payment.amount_inr,
    v_payment.amount_paise,
    v_payment.currency
  );

  -- 4. Upsert coaching relationship
  INSERT INTO coaching_relationships (
    id,
    trainer_id,
    trainer_user_id,
    client_id,
    client_user_id,
    package_id,
    status,
    started_at
  ) VALUES (
    v_rel_id,
    v_package.trainer_id,
    v_payment.trainer_user_id,
    'cl_' || v_payment.client_user_id,
    v_payment.client_user_id,
    v_payment.package_id,
    'active',
    v_now
  )
  ON CONFLICT (trainer_user_id, client_user_id) DO UPDATE SET
    package_id = EXCLUDED.package_id,
    status = 'active',
    ended_at = NULL,
    updated_at = v_now;

  -- 5. Insert enrollment record
  INSERT INTO enrollments (
    id,
    client_id,
    client_user_id,
    trainer_id,
    trainer_user_id,
    package_id,
    subscription_id,
    status,
    enrolled_at
  ) VALUES (
    v_enr_id,
    'cl_' || v_payment.client_user_id,
    v_payment.client_user_id,
    v_package.trainer_id,
    v_payment.trainer_user_id,
    v_payment.package_id,
    v_sub_id,
    'active',
    v_now
  );

  -- 6. Update payment record
  UPDATE payment_records SET
    status = 'captured',
    cashfree_payment_id = p_payment_id,
    gateway_status = p_gateway_status,
    payment_method = p_payment_method,
    subscription_id = v_sub_id,
    raw_gateway_payload = p_raw_payload,
    updated_at = v_now
  WHERE id = v_payment.id;

  -- 7. Update coupon usage if applicable
  IF v_payment.coupon_code IS NOT NULL AND v_payment.coupon_code <> '' THEN
    UPDATE coupons 
    SET used_count = used_count + 1 
    WHERE code = v_payment.coupon_code;
  END IF;

  -- 8. Convert pending referral if applicable
  UPDATE referrals SET
    status = 'converted',
    payment_id = v_payment.id,
    converted_at = v_now,
    updated_at = v_now
  WHERE referee_user_id = v_payment.client_user_id
    AND status IN ('pending', 'signed_up');

  -- 9. Insert notifications for Client and Trainer
  INSERT INTO notifications (id, recipient_user_id, category, title, body, action_url) VALUES
  (
    'notif_' || substr(md5(random()::text || clock_timestamp()::text), 1, 12),
    v_payment.client_user_id,
    'billing',
    'Payment Successful',
    'Your enrollment for ' || v_package.name || ' is active!',
    '/client/dashboard'
  ),
  (
    'notif_' || substr(md5(random()::text || clock_timestamp()::text), 1, 12),
    v_payment.trainer_user_id,
    'billing',
    'New Client Enrolled',
    'A client has enrolled in ' || v_package.name || ' (â‚¹' || v_payment.amount_inr || ').',
    '/trainer/clients'
  );

  RETURN jsonb_build_object(
    'success', true,
    'payment_id', v_payment.id,
    'subscription_id', v_sub_id,
    'order_id', p_order_id
  );
END;
$$;

-- -----------------------------------------------------------------------------
-- 3. Streak Recalculation Function
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION recalculate_streak(p_client_uid TEXT)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_unique_dates TEXT[];
  v_current_streak INTEGER := 0;
  v_longest_streak INTEGER := 0;
  v_last_date TEXT := NULL;
  v_streak_record streak_records%ROWTYPE;
BEGIN
  -- Aggregate distinct completed task date keys in descending order
  SELECT array_agg(DISTINCT date_key ORDER BY date_key DESC)
  INTO v_unique_dates
  FROM task_completions
  WHERE client_user_id = p_client_uid;

  IF v_unique_dates IS NOT NULL AND array_length(v_unique_dates, 1) > 0 THEN
    v_last_date := v_unique_dates[1];
    v_current_streak := array_length(v_unique_dates, 1); -- simplified, updated by streak engine
    v_longest_streak := v_current_streak;
  END IF;

  -- Upsert into streak_records
  INSERT INTO streak_records (
    id,
    client_id,
    client_user_id,
    current_streak,
    longest_streak,
    last_completed_date_key
  ) VALUES (
    'strk_' || p_client_uid,
    'cl_' || p_client_uid,
    p_client_uid,
    v_current_streak,
    v_longest_streak,
    v_last_date
  )
  ON CONFLICT (client_user_id) DO UPDATE SET
    current_streak = EXCLUDED.current_streak,
    longest_streak = GREATEST(streak_records.longest_streak, EXCLUDED.longest_streak),
    last_completed_date_key = EXCLUDED.last_completed_date_key,
    updated_at = now()
  RETURNING * INTO v_streak_record;

  RETURN to_jsonb(v_streak_record);
END;
$$;

-- -----------------------------------------------------------------------------
-- 4. Trainer Studio Analytics Aggregate Function
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION get_trainer_analytics(p_trainer_uid TEXT)
RETURNS JSONB
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
AS $$
DECLARE
  v_active_clients INTEGER := 0;
  v_new_enrollments INTEGER := 0;
  v_captured_revenue INTEGER := 0;
BEGIN
  SELECT count(*) INTO v_active_clients
  FROM coaching_relationships
  WHERE trainer_user_id = p_trainer_uid AND status = 'active';

  SELECT count(*) INTO v_new_enrollments
  FROM enrollments
  WHERE trainer_user_id = p_trainer_uid
    AND enrolled_at >= date_trunc('month', now());

  SELECT coalesce(sum(trainer_net_inr), sum(amount_inr), 0) INTO v_captured_revenue
  FROM payment_records
  WHERE trainer_user_id = p_trainer_uid AND status = 'captured';

  RETURN jsonb_build_object(
    'activeClientsCount', v_active_clients,
    'newEnrollmentsMonth', v_new_enrollments,
    'monthlyCapturedRevenueInr', v_captured_revenue,
    'monthlySettlementStatus', 'processed'
  );
END;
$$;
