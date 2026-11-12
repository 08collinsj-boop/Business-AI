-- Development only. Restore the original expired QA grant after PR76 visual testing.
BEGIN;
SET LOCAL statement_timeout='15s';
SET LOCAL lock_timeout='3s';
DO $qa$
DECLARE a colzo_pilot_private.audit%rowtype; curr public.colzo_pilot_access%rowtype; restored public.colzo_pilot_access%rowtype;
BEGIN
 SELECT * INTO STRICT a FROM colzo_pilot_private.audit WHERE request_key='pr76-qa-restore-20261112-e92517';
 SELECT * INTO STRICT curr FROM public.colzo_pilot_access WHERE business_id=a.business_id FOR UPDATE;
 IF to_jsonb(curr) IS DISTINCT FROM a.result->'after' THEN RAISE EXCEPTION 'QA row changed; inspect before cleanup'; END IF;
 UPDATE public.colzo_pilot_access SET
 status=a.payload->'before'->>'status',
 activated_at=(a.payload->'before'->>'activated_at')::timestamptz,
 expires_at=(a.payload->'before'->>'expires_at')::timestamptz,
 updated_at=(a.payload->'before'->>'updated_at')::timestamptz
 WHERE business_id=a.business_id RETURNING * INTO STRICT restored;
 INSERT INTO colzo_pilot_private.audit(request_key,business_id,actor,action,payload,result,recorded_at)
 VALUES('pr76-qa-restored-original-20261112-e92517',a.business_id,a.actor,'qa_access_restored_original',
 jsonb_build_object('restoration_request',a.request_key),to_jsonb(restored),clock_timestamp());
END
$qa$;
COMMIT;
SELECT business_id,status,activated_at,expires_at,expires_at<clock_timestamp() AS expired FROM public.colzo_pilot_access WHERE business_id='433f135d-720f-4687-8114-3dffe7361675'::uuid;
