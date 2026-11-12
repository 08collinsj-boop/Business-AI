-- Development mvwseobgkexzpmmkgcxe only. Owner authorised temporary fictional QA restoration on 12 November 2026.
-- One existing fictional QA grant only; no schema, memberships, roles, billing or Production changes.
-- Preserve original expiry in append-only audit. Restore it after QA with QA_ACCESS_RESTORE_ORIGINAL_20261112.sql.
BEGIN;
SET LOCAL statement_timeout='15s';
SET LOCAL lock_timeout='3s';
DO $qa$
DECLARE old_row public.colzo_pilot_access%rowtype; new_row public.colzo_pilot_access%rowtype; started timestamptz;
BEGIN
 IF current_database()<>'postgres' OR current_user<>'postgres' THEN RAISE EXCEPTION 'Unexpected operator/database'; END IF;
 IF EXISTS(SELECT 1 FROM colzo_pilot_private.audit WHERE request_key='pr76-qa-restore-20261112-e92517') THEN
  RAISE EXCEPTION 'QA restoration already recorded; inspect state instead of replaying';
 END IF;
 SELECT * INTO STRICT old_row FROM public.colzo_pilot_access WHERE business_id='433f135d-720f-4687-8114-3dffe7361675'::uuid FOR UPDATE;
 IF old_row.status<>'active' OR old_row.granted_by<>'b8cb079d-792e-4810-8218-0f9d442c521a'::uuid
 OR old_row.activated_at<>'2026-10-28 22:50:58.480174+00'::timestamptz
 OR old_row.expires_at<>'2026-11-11 22:50:58.480174+00'::timestamptz
 OR old_row.updated_at<>'2026-10-28 22:50:58.455891+00'::timestamptz
 OR old_row.expires_at>=clock_timestamp() THEN RAISE EXCEPTION 'Expired fixture baseline changed'; END IF;
 IF (SELECT count(*) FROM public.businesses WHERE id=old_row.business_id AND name='QA Example Garden B — TEST ONLY')<>1
 OR (SELECT count(*) FROM public.business_memberships WHERE business_id=old_row.business_id)<>1
 OR (SELECT count(*) FROM public.business_memberships WHERE business_id=old_row.business_id AND user_id=old_row.granted_by AND role='owner')<>1
 OR (SELECT count(*) FROM public.business_memberships WHERE user_id=old_row.granted_by)<>1
 OR EXISTS(SELECT 1 FROM public.business_billing_accounts WHERE business_id=old_row.business_id AND
 (stripe_customer_id IS NOT NULL OR stripe_subscription_id IS NOT NULL OR plan<>'none' OR status<>'inactive' OR trial_purchased))
 THEN RAISE EXCEPTION 'Fictional QA ownership/billing preflight failed'; END IF;
 started:=clock_timestamp();
 UPDATE public.colzo_pilot_access SET activated_at=started,expires_at=started+interval '336 hours',updated_at=started
 WHERE business_id=old_row.business_id RETURNING * INTO STRICT new_row;
 INSERT INTO colzo_pilot_private.audit(request_key,business_id,actor,action,payload,result,recorded_at)
 VALUES('pr76-qa-restore-20261112-e92517',old_row.business_id,old_row.granted_by,'qa_access_restored',
 jsonb_build_object('purpose','Owner-authorised temporary PR76 fictional Development QA exception; restore original expired row after testing','before',to_jsonb(old_row),'original_expiry_observed',true),
 jsonb_build_object('after',to_jsonb(new_row)),clock_timestamp());
END
$qa$;
COMMIT;
SELECT business_id,status,activated_at,expires_at,expires_at-activated_at AS duration FROM public.colzo_pilot_access WHERE business_id='433f135d-720f-4687-8114-3dffe7361675'::uuid;
