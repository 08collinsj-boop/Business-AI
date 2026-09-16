-- Add left-prefix indexes for the voice foundation's composite foreign keys.
-- This is additive, preserves all records, and avoids modifying RLS/grants.

create index if not exists voice_phone_numbers_business_id_idx
  on public.voice_phone_numbers (business_id);
create index if not exists voice_phone_numbers_connection_business_id_idx
  on public.voice_phone_numbers (provider_connection_id, business_id);

create index if not exists voice_calls_phone_number_business_id_idx
  on public.voice_calls (phone_number_id, business_id);
create index if not exists voice_calls_connection_business_id_idx
  on public.voice_calls (provider_connection_id, business_id);
create index if not exists voice_calls_lead_business_id_idx
  on public.voice_calls (lead_id, business_id);
create index if not exists voice_calls_booking_business_id_idx
  on public.voice_calls (booking_id, business_id);
create index if not exists voice_calls_action_business_id_idx
  on public.voice_calls (action_id, business_id);
create index if not exists voice_call_events_call_business_id_idx
  on public.voice_call_events (call_id, business_id);
