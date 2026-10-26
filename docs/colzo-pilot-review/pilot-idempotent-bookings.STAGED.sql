-- STAGED ONLY. Requires verified genuine recovery, duplicate preflight, independent
-- review and separate shared-SQL approval. Never run automatically on shared Dev.
-- Requires the reviewed colzo_pilot_access table. Does not activate any accounts.
BEGIN;

-- Refuse an ambiguous existing state; never delete or silently combine bookings.
CREATE UNIQUE INDEX colzo_pilot_one_pending_ai_booking
 ON public.bookings (business_id, lead_id)
 WHERE source = 'ai_request' AND status = 'requested' AND lead_id IS NOT NULL;

CREATE FUNCTION public.request_colzo_pilot_booking(
 p_business_id uuid, p_lead_id bigint, p_title text,
 p_customer_name text, p_customer_phone text, p_customer_email text,
 p_location text, p_notes text
) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path = ''
AS $$
DECLARE
 v_grant public.colzo_pilot_access%ROWTYPE;
 v_booking public.bookings%ROWTYPE;
 v_created boolean := false;
 v_now timestamptz;
BEGIN
 IF p_business_id IS NULL OR p_lead_id IS NULL OR p_lead_id <= 0
    OR p_title IS NULL OR pg_catalog.btrim(p_title) = ''
    OR pg_catalog.char_length(p_title) > 200
    OR pg_catalog.char_length(coalesce(p_customer_name,'')) > 160
    OR pg_catalog.char_length(coalesce(p_customer_phone,'')) > 64
    OR pg_catalog.char_length(coalesce(p_customer_email,'')) > 320
    OR pg_catalog.char_length(coalesce(p_location,'')) > 500
    OR pg_catalog.char_length(coalesce(p_notes,'')) > 5000 THEN
  RAISE EXCEPTION 'Invalid booking request' USING ERRCODE = '22023';
 END IF;

 -- Serialize this business/lead across independent database backends.
 PERFORM pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(
   'colzo-pilot-booking:' || p_business_id::text || ':' || p_lead_id::text, 0));
 -- Hold the grant against concurrent revocation until this operation commits.
 SELECT * INTO v_grant FROM public.colzo_pilot_access
  WHERE business_id = p_business_id FOR SHARE;
 v_now := pg_catalog.clock_timestamp();
 IF NOT FOUND OR v_grant.status IS DISTINCT FROM 'active'
    OR v_grant.activated_at IS NULL OR v_grant.expires_at IS NULL
    OR v_grant.expires_at <> v_grant.activated_at + interval '336 hours'
    OR v_now < v_grant.activated_at OR v_now >= v_grant.expires_at THEN
  RAISE EXCEPTION 'Approved pilot access required' USING ERRCODE = '42501';
 END IF;
 PERFORM 1 FROM public.leads WHERE id = p_lead_id AND business_id = p_business_id FOR KEY SHARE;
 IF NOT FOUND THEN
  RAISE EXCEPTION 'Booking enquiry unavailable' USING ERRCODE = '42501';
 END IF;

 SELECT * INTO v_booking FROM public.bookings
  WHERE business_id = p_business_id AND lead_id = p_lead_id
    AND source = 'ai_request' AND status = 'requested';
 IF NOT FOUND THEN
  INSERT INTO public.bookings
   (business_id,lead_id,title,customer_name,customer_phone,customer_email,location,notes,status,source)
  VALUES
   (p_business_id,p_lead_id,p_title,coalesce(p_customer_name,''),coalesce(p_customer_phone,''),
    coalesce(p_customer_email,''),coalesce(p_location,''),coalesce(p_notes,''),'requested','ai_request')
  ON CONFLICT (business_id,lead_id)
   WHERE source = 'ai_request' AND status = 'requested' AND lead_id IS NOT NULL
  DO NOTHING RETURNING * INTO v_booking;
  v_created := FOUND;
  -- A legacy writer can win the unique constraint while this transaction waits.
  IF NOT v_created THEN
   SELECT * INTO v_booking FROM public.bookings
    WHERE business_id = p_business_id AND lead_id = p_lead_id
      AND source = 'ai_request' AND status = 'requested';
   IF NOT FOUND THEN
    RAISE EXCEPTION 'Booking request changed; retry' USING ERRCODE = '40001';
   END IF;
  END IF;
 END IF;

 IF v_created THEN
  INSERT INTO public.lead_history(business_id,lead_id,action,old_value,new_value)
   VALUES(p_business_id,p_lead_id,'Booking requested','',p_title);
  INSERT INTO public.business_audit_events(business_id,action,resource_type,resource_id,metadata)
   VALUES(p_business_id,'booking.public_requested','booking',v_booking.id::text,
     pg_catalog.jsonb_build_object('source','public_enquiry','lead_id',p_lead_id,'status','requested'));
 END IF;
 -- Final authorization point: lead/index/audit waits may have crossed expiry.
 -- Raising here rolls back the booking and both history/audit inserts.
 v_now := pg_catalog.clock_timestamp();
 IF v_now < v_grant.activated_at OR v_now >= v_grant.expires_at THEN
  RAISE EXCEPTION 'Approved pilot access required' USING ERRCODE = '42501';
 END IF;
 RETURN pg_catalog.jsonb_build_object('id',v_booking.id,'business_id',v_booking.business_id,
   'lead_id',v_booking.lead_id,'status',v_booking.status,'source',v_booking.source,'created',v_created);
END;
$$;

-- The definer is necessary for narrow atomic writes and row locks without
-- granting clients or service-role callers wider direct grant-table permissions.
-- Keep the owner a trusted migration role; never assign ownership to a client.
REVOKE ALL ON FUNCTION public.request_colzo_pilot_booking(uuid,bigint,text,text,text,text,text,text)
 FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.request_colzo_pilot_booking(uuid,bigint,text,text,text,text,text,text)
 TO service_role;
COMMENT ON FUNCTION public.request_colzo_pilot_booking(uuid,bigint,text,text,text,text,text,text)
 IS 'Service-only scoped-pilot booking request with grant/tenant checks, retry deduplication and atomic audit. Not appointment confirmation.';
COMMIT;
