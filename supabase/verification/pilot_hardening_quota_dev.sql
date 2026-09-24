-- Dev-only functional quota check. It uses no customer data or raw IP address.
with business as (select id from public.businesses order by created_at limit 1),
fingerprint as (select repeat(md5(clock_timestamp()::text), 2) as value)
select
  public.consume_public_enquiry_quota((select id from business), (select value from fingerprint), date_trunc('hour', now()), 2, 100) as first_allowed,
  public.consume_public_enquiry_quota((select id from business), (select value from fingerprint), date_trunc('hour', now()), 2, 100) as second_allowed,
  not public.consume_public_enquiry_quota((select id from business), (select value from fingerprint), date_trunc('hour', now()), 2, 100) as third_rejected;
