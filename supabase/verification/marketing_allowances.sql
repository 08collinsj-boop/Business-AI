-- Run only against Business-AI-Dev. All fixture data is rolled back.
begin;
do $$
declare
 b uuid := gen_random_uuid(); u uuid := gen_random_uuid(); other_b uuid := gen_random_uuid();
 start_at timestamptz := now()-interval '3 days';
 event_at timestamptz := now(); r jsonb; fixture_id uuid;
 request jsonb := '{"content_type":"social_post","platform":"facebook","tone":"friendly","prompt":"Harmless Pilot verification"}'::jsonb;
begin
 insert into auth.users(id,email) values(u,'quota-'||u::text||'@example.invalid');
 insert into public.businesses(id,name) values(b,'Disposable Marketing quota verification'),(other_b,'Disposable isolation verification');
 insert into public.business_memberships(business_id,user_id,role) values(b,u,'owner');
 insert into public.business_billing_accounts(business_id,plan,status,trial_purchased,trial_started_at,trial_expires_at)
 values(b,'trial','active',true,start_at,start_at+interval '7 days');
 for i in 1..10 loop
  insert into public.marketing_generations(business_id,actor_user_id,content_type,platform,tone,request_text,request_hash,status,output,completed_at,created_at,billing_period_started_at)
  values(b,u,'social_post','facebook','friendly','Quota fixture',repeat('a',64),'completed','{}',now()-interval '2 days',now()-interval '2 days',start_at) returning id into fixture_id;
 end loop;
 r := public.reserve_marketing_generation(b,u,request,repeat('b',64));
 if r->>'reason' <> 'allowance' then raise exception 'Trial generation 11 was not denied: %',r; end if;
 update public.marketing_generations set deleted_at=now() where business_id=b;
 r := public.reserve_marketing_generation(b,u,request,repeat('b',64));
 if r->>'reason' <> 'allowance' then raise exception 'Deleting drafts refunded allowance'; end if;
 update public.marketing_generations set status='failed' where id=fixture_id;
 r := public.reserve_marketing_generation(b,u,request,repeat('b',64));
 if not (r->>'allowed')::boolean then raise exception 'Provider failure did not release quota: %',r; end if;
 r := public.reserve_marketing_generation(b,u,request,repeat('c',64));
 if r->>'reason' <> 'allowance' then raise exception 'Pending generation did not reserve quota'; end if;
 r := public.reserve_marketing_generation(other_b,u,request,repeat('d',64));
 if r->>'reason' <> 'membership' then raise exception 'Cross-tenant actor accepted'; end if;
 update public.business_billing_accounts set plan='pro',current_period_started_at=now()-interval '1 day',current_period_ends_at=now()+interval '29 days',last_stripe_event_created_at=event_at where business_id=b;
 insert into public.business_feature_entitlements(business_id,feature_key,status,source,source_reference,expires_at)
 values(b,'ai_marketing','active','stripe','si_disposable',now()+interval '29 days');
 update public.marketing_generations set created_at=now()-interval '2 days' where business_id=b;
 r := public.reserve_marketing_generation(b,u,request,repeat('e',64));
 if not (r->>'allowed')::boolean then raise exception 'New Stripe period did not reset usage: %',r; end if;
 update public.marketing_generations set created_at=now()-interval '2 days' where business_id=b;
 for i in 1..99 loop
  insert into public.marketing_generations(business_id,actor_user_id,content_type,platform,tone,request_text,request_hash,status,output,completed_at,created_at,billing_period_started_at)
  values(b,u,'social_post','facebook','friendly','Paid quota fixture',repeat('f',64),'completed','{}',now()-interval '2 days',now()-interval '2 days',now()-interval '1 day');
 end loop;
 r := public.reserve_marketing_generation(b,u,request,repeat('1',64));
 if r->>'reason' <> 'allowance' then raise exception 'Paid generation 101 was not denied: %',r; end if;
 perform public.sync_marketing_entitlement_from_stripe(b,event_at,null,now()+interval '29 days',true);
 if not exists(select 1 from public.business_feature_entitlements where business_id=b and status='active' and expires_at>now()) then raise exception 'Cancellation discarded paid-through access'; end if;
 update public.business_billing_accounts set status='past_due',last_stripe_event_created_at=event_at+interval '1 second' where business_id=b;
 if public.sync_marketing_entitlement_from_stripe(b,event_at,'si_stale',now()+interval '29 days',true) then raise exception 'Stale Stripe event accepted'; end if;
 r := public.reserve_marketing_generation(b,u,request,repeat('2',64));
 if r->>'reason' <> 'entitlement' then raise exception 'Past-due base with stale add-on was accepted'; end if;
 update public.business_billing_accounts set status='active',current_period_ends_at=now()-interval '1 second' where business_id=b;
 r := public.reserve_marketing_generation(b,u,request,repeat('3',64));
 if r->>'reason' <> 'entitlement' then raise exception 'Expired base with stale add-on was accepted'; end if;
end $$;
select 'PASS: Trial 10, paid 100, Stripe-period reset, pending reservations, failed release, deletion accounting, tenant boundary, paid-through cancellation, stale event rejection, base expiry/past_due' as result;
rollback;
