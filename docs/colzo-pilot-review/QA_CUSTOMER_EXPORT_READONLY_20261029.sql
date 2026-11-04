-- Development fictional fixture only. SELECT-only scope preview and customer export; not deletion or full-business export.
WITH fixture AS (
 SELECT m.business_id FROM public.business_memberships m
 JOIN auth.users u ON u.id=m.user_id
 WHERE m.business_id='433f135d-720f-4687-8114-3dffe7361675' AND m.user_id='b8cb079d-792e-4810-8218-0f9d442c521a'
 AND m.role='owner' AND u.email='08collinsj+colzoqa@gmail.com'
), customer_rows AS (
 SELECT c.id,c.business_id,c.full_name,c.email,c.phone,c.notes,c.created_at,c.updated_at
 FROM public.colzo_clients c JOIN fixture f ON f.business_id=c.business_id
 WHERE c.id='08f9a189-8b40-433b-b783-f0718463aa2d'
 AND c.full_name='QA Rowan Example — TEST ONLY 20261029'
)
SELECT jsonb_build_object(
 'classification','fictional QA customer export rehearsal only',
 'fixture_mapping_matches',(SELECT count(*)=1 FROM fixture),
 'business_id','433f135d-720f-4687-8114-3dffe7361675',
 'customers',coalesce((SELECT jsonb_agg(to_jsonb(c) ORDER BY c.id) FROM customer_rows c),'[]'::jsonb),
 'workload_counts',jsonb_build_object('colzo_clients',(SELECT count(*) FROM public.colzo_clients t JOIN fixture f ON f.business_id=t.business_id),'colzo_projects',(SELECT count(*) FROM public.colzo_projects t JOIN fixture f ON f.business_id=t.business_id),'colzo_quotes',(SELECT count(*) FROM public.colzo_quotes t JOIN fixture f ON f.business_id=t.business_id),'leads',(SELECT count(*) FROM public.leads t JOIN fixture f ON f.business_id=t.business_id),'lead_history',(SELECT count(*) FROM public.lead_history t JOIN fixture f ON f.business_id=t.business_id),'bookings',(SELECT count(*) FROM public.bookings t JOIN fixture f ON f.business_id=t.business_id),'actions',(SELECT count(*) FROM public.actions t JOIN fixture f ON f.business_id=t.business_id),'business_knowledge_sources',(SELECT count(*) FROM public.business_knowledge_sources t JOIN fixture f ON f.business_id=t.business_id),'business_knowledge_items',(SELECT count(*) FROM public.business_knowledge_items t JOIN fixture f ON f.business_id=t.business_id),'marketing_generations',(SELECT count(*) FROM public.marketing_generations t JOIN fixture f ON f.business_id=t.business_id))
) AS rehearsal;
