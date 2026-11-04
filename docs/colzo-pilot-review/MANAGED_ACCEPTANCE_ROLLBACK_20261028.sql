-- Parameterised archive of the executed rollback-only acceptance test.
-- Supply four colzo.qa.* session settings privately; no credentials or private identity mapping belong in Git.
-- This template is evidence, not permission to run against another project.
BEGIN ISOLATION LEVEL READ COMMITTED;
SET LOCAL lock_timeout='3s';
SET LOCAL statement_timeout='20s';
DO $acceptance$
DECLARE
 a uuid:=current_setting('colzo.qa.business_a')::uuid;
 b uuid:=current_setting('colzo.qa.business_b')::uuid;
 c uuid:='8266fced-155b-48ef-8890-99108d9c2f0a';
 ua uuid:=current_setting('colzo.qa.user_a')::uuid;
 ub uuid:=current_setting('colzo.qa.user_b')::uuid;
 sa uuid:='8266fced-155b-48ef-8890-99108d9c2f01';
 sb uuid:='8266fced-155b-48ef-8890-99108d9c2f02';
 ma uuid:='8266fced-155b-48ef-8890-99108d9c2f03';
 mb uuid:='8266fced-155b-48ef-8890-99108d9c2f04';
 la bigint:=-82661027001; lb bigint:=-82661027002; lc bigint:=-82661027003;
 n bigint; checked integer:=0; who uuid; ownbusiness uuid; otherbusiness uuid; wanted bigint; otherid bigint;
 original_grants jsonb; original_audit bigint; original_invites bigint;
BEGIN
 SELECT jsonb_agg(to_jsonb(g) ORDER BY business_id) INTO original_grants FROM public.colzo_pilot_access g;
 SELECT count(*) INTO original_audit FROM colzo_pilot_private.audit;
 SELECT count(*) INTO original_invites FROM colzo_pilot_private.invitations;
 IF EXISTS(SELECT 1 FROM public.businesses WHERE id=c)
 OR EXISTS(SELECT 1 FROM public.leads WHERE id IN (la,lb,lc))
 OR EXISTS(SELECT 1 FROM public.bookings WHERE id IN (la,lb))
 OR EXISTS(SELECT 1 FROM public.business_knowledge_sources WHERE id IN(sa,sb))
 OR EXISTS(SELECT 1 FROM public.marketing_generations WHERE id IN(ma,mb)) THEN RAISE EXCEPTION 'fixture identity collision'; END IF;
 IF NOT EXISTS(SELECT 1 FROM public.business_memberships WHERE business_id=a AND user_id=ua AND role='owner')
 OR NOT EXISTS(SELECT 1 FROM public.business_memberships WHERE business_id=b AND user_id=ub AND role='owner') THEN RAISE EXCEPTION 'mapping drift'; END IF;
 INSERT INTO public.leads(id,business_id,name,email,job_type) OVERRIDING SYSTEM VALUE VALUES
 (la,a,'Rollback QA A','rollback-a@example.invalid','Fictional acceptance'),(lb,b,'Rollback QA B','rollback-b@example.invalid','Fictional acceptance');
 INSERT INTO public.bookings(id,business_id,lead_id,title) OVERRIDING SYSTEM VALUE VALUES
 (la,a,la,'Rollback QA A request'),(lb,b,lb,'Rollback QA B request');
 INSERT INTO public.business_knowledge_sources(id,business_id,file_name,storage_path,mime_type,size_bytes,status) VALUES
 (sa,a,'Rollback QA A','manual/rollback-qa-a','text/plain',10,'active'),(sb,b,'Rollback QA B','manual/rollback-qa-b','text/plain',10,'active');
 INSERT INTO public.business_knowledge_items(source_id,business_id,item_type,title,content,status) VALUES
 (sa,a,'faq','Rollback QA A','Fictional fact A','active'),(sb,b,'faq','Rollback QA B','Fictional fact B','active');
 INSERT INTO public.marketing_generations(id,business_id,content_type,platform,tone,request_text,request_hash,status) VALUES
 (ma,a,'social_post','general','professional','Fictional rollback-only request A',repeat('a',64),'failed'),
 (mb,b,'social_post','general','professional','Fictional rollback-only request B',repeat('b',64),'failed');
 FOREACH who IN ARRAY ARRAY[ua,ub] LOOP
  ownbusiness:=CASE WHEN who=ua THEN a ELSE b END; otherbusiness:=CASE WHEN who=ua THEN b ELSE a END;
  wanted:=CASE WHEN who=ua THEN la ELSE lb END; otherid:=CASE WHEN who=ua THEN lb ELSE la END;
  PERFORM set_config('request.jwt.claim.sub',who::text,true);
  PERFORM set_config('role','authenticated',true);
  IF auth.uid()<>who OR current_user<>'authenticated' THEN RAISE EXCEPTION 'role setup failed'; END IF;
  SELECT count(*) INTO n FROM public.leads WHERE id=wanted; IF n<>1 THEN RAISE EXCEPTION 'own lead missing'; END IF; checked:=checked+1;
  SELECT count(*) INTO n FROM public.leads WHERE id=otherid OR (id IN(la,lb) AND business_id=otherbusiness); IF n<>0 THEN RAISE EXCEPTION 'cross lead leak'; END IF; checked:=checked+1;
  SELECT count(*) INTO n FROM public.bookings WHERE id=wanted; IF n<>1 THEN RAISE EXCEPTION 'own booking missing'; END IF; checked:=checked+1;
  SELECT count(*) INTO n FROM public.bookings WHERE id=otherid; IF n<>0 THEN RAISE EXCEPTION 'cross booking leak'; END IF; checked:=checked+1;
  SELECT count(*) INTO n FROM public.business_knowledge_items WHERE source_id IN(sa,sb) AND business_id=ownbusiness; IF n<>1 THEN RAISE EXCEPTION 'own fact missing'; END IF; checked:=checked+1;
  SELECT count(*) INTO n FROM public.business_knowledge_items WHERE source_id IN(sa,sb) AND business_id=otherbusiness; IF n<>0 THEN RAISE EXCEPTION 'cross knowledge leak'; END IF; checked:=checked+1;
  SELECT count(*) INTO n FROM public.marketing_generations WHERE id IN(ma,mb) AND business_id=otherbusiness; IF n<>0 THEN RAISE EXCEPTION 'cross marketing leak'; END IF; checked:=checked+1;
  IF has_table_privilege(current_user,'public.colzo_clients','SELECT') THEN RAISE EXCEPTION 'server-only clients exposed'; END IF; checked:=checked+1;
  BEGIN
   UPDATE public.leads SET notes='must never be saved' WHERE id=otherid;
   RAISE EXCEPTION 'cross write unexpectedly allowed';
  EXCEPTION WHEN insufficient_privilege THEN checked:=checked+1; END;
  PERFORM set_config('role','postgres',true);
 END LOOP;
 -- New fictional workspace only; no existing grant/expiry or membership is changed.
 INSERT INTO public.businesses(id,name) VALUES(c,'Rollback-only fictional expiry workspace');
 INSERT INTO public.business_memberships(business_id,user_id,role) VALUES(c,ub,'owner');
 INSERT INTO public.colzo_pilot_access(business_id,activated_at,expires_at) VALUES(c,statement_timestamp()-interval '1 hour',statement_timestamp()+interval '335 hours');
 INSERT INTO public.leads(id,business_id,name,email,job_type) OVERRIDING SYSTEM VALUE VALUES(lc,c,'Rollback QA Expiry','rollback-expiry@example.invalid','Fictional acceptance');
 PERFORM set_config('request.jwt.claim.sub',ub::text,true); PERFORM set_config('role','authenticated',true);
 IF NOT colzo_pilot_private.workspace_read_allowed(c) THEN RAISE EXCEPTION 'active fixture denied'; END IF; checked:=checked+1;
 SELECT count(*) INTO n FROM public.leads WHERE id=lc; IF n<>1 THEN RAISE EXCEPTION 'row visibility: active fixture denied'; END IF; checked:=checked+1;
 PERFORM set_config('role','postgres',true);
 UPDATE public.colzo_pilot_access SET activated_at=statement_timestamp()-interval '336 hours'+interval '1 microsecond',expires_at=statement_timestamp()+interval '1 microsecond' WHERE business_id=c;
 PERFORM set_config('role','authenticated',true);
 IF NOT colzo_pilot_private.workspace_read_allowed(c) THEN RAISE EXCEPTION 'pre-boundary fixture denied'; END IF; checked:=checked+1;
 SELECT count(*) INTO n FROM public.leads WHERE id=lc; IF n<>1 THEN RAISE EXCEPTION 'row visibility: pre-boundary fixture denied'; END IF; checked:=checked+1;
 PERFORM set_config('role','postgres',true);
 UPDATE public.colzo_pilot_access SET activated_at=statement_timestamp()-interval '336 hours',expires_at=statement_timestamp() WHERE business_id=c;
 PERFORM set_config('role','authenticated',true);
 IF colzo_pilot_private.workspace_read_allowed(c) THEN RAISE EXCEPTION 'exact boundary allowed'; END IF; checked:=checked+1;
 SELECT count(*) INTO n FROM public.leads WHERE id=lc; IF n<>0 THEN RAISE EXCEPTION 'row visibility: exact boundary allowed'; END IF; checked:=checked+1;
 PERFORM set_config('role','postgres',true);
 UPDATE public.colzo_pilot_access SET activated_at=statement_timestamp()-interval '336 hours'-interval '1 microsecond',expires_at=statement_timestamp()-interval '1 microsecond' WHERE business_id=c;
 PERFORM set_config('role','authenticated',true);
 IF colzo_pilot_private.workspace_read_allowed(c) THEN RAISE EXCEPTION 'expired fixture allowed'; END IF; checked:=checked+1;
 SELECT count(*) INTO n FROM public.leads WHERE id=lc; IF n<>0 THEN RAISE EXCEPTION 'row visibility: expired fixture allowed'; END IF; checked:=checked+1;
 PERFORM set_config('role','postgres',true);
 UPDATE public.colzo_pilot_access SET activated_at=statement_timestamp()-interval '1 hour',expires_at=statement_timestamp()+interval '335 hours',status='revoked' WHERE business_id=c;
 PERFORM set_config('role','authenticated',true);
 IF colzo_pilot_private.workspace_read_allowed(c) THEN RAISE EXCEPTION 'revoked fixture allowed'; END IF; checked:=checked+1;
 SELECT count(*) INTO n FROM public.leads WHERE id=lc; IF n<>0 THEN RAISE EXCEPTION 'row visibility: revoked fixture allowed'; END IF; checked:=checked+1;
 PERFORM set_config('role','postgres',true);
 UPDATE public.colzo_pilot_access SET status='active' WHERE business_id=c;
 DELETE FROM public.business_memberships WHERE business_id=c AND user_id=ub;
 PERFORM set_config('role','authenticated',true);
 IF colzo_pilot_private.workspace_read_allowed(c) THEN RAISE EXCEPTION 'removed membership still allowed'; END IF; checked:=checked+1;
 SELECT count(*) INTO n FROM public.leads WHERE id=lc; IF n<>0 THEN RAISE EXCEPTION 'row visibility: removed membership still allowed'; END IF; checked:=checked+1;
 PERFORM set_config('role','postgres',true);
 IF (SELECT count(*) FROM public.leads WHERE id IN(la,lb,lc))<>3 THEN RAISE EXCEPTION 'fixture records lost'; END IF; checked:=checked+1;
 IF (SELECT jsonb_agg(to_jsonb(g) ORDER BY business_id) FROM public.colzo_pilot_access g WHERE business_id<>c) IS DISTINCT FROM original_grants THEN RAISE EXCEPTION 'original grant drift'; END IF;
 IF (SELECT count(*) FROM colzo_pilot_private.audit)<>original_audit OR (SELECT count(*) FROM colzo_pilot_private.invitations)<>original_invites THEN RAISE EXCEPTION 'audit/invitation drift'; END IF; checked:=checked+1;
 PERFORM set_config('colzo.acceptance.result',jsonb_build_object('checks',checked,'database_role_tests',true,'real_auth_tokens',false,'original_grants_unchanged',true,'fixture_disposition','ROLLBACK required')::text,true);
END
$acceptance$;
SELECT current_setting('colzo.acceptance.result')::jsonb AS managed_acceptance;
ROLLBACK;
