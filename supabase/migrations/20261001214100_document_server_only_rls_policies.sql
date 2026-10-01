-- These tables are intentionally server/service-role only. Their original
-- migrations revoke direct anon/authenticated privileges; explicit false
-- policies document that design and prevent accidental direct client access.
create policy "server only deny direct access" on public.business_billing_accounts for all to anon, authenticated using (false) with check (false);
create policy "server only deny direct access" on public.business_billing_usage for all to anon, authenticated using (false) with check (false);
create policy "server only deny direct access" on public.business_legal_acceptances for all to anon, authenticated using (false) with check (false);
create policy "server only deny direct access" on public.business_referral_profiles for all to anon, authenticated using (false) with check (false);
create policy "server only deny direct access" on public.business_referral_rewards for all to anon, authenticated using (false) with check (false);
create policy "server only deny direct access" on public.business_referrals for all to anon, authenticated using (false) with check (false);
create policy "server only deny direct access" on public.customer_enquiry_access for all to anon, authenticated using (false) with check (false);
create policy "server only deny direct access" on public.customer_profiles for all to anon, authenticated using (false) with check (false);
create policy "server only deny direct access" on public.marketing_image_usage_events for all to anon, authenticated using (false) with check (false);
create policy "server only deny direct access" on public.marketing_meta_connections for all to anon, authenticated using (false) with check (false);
create policy "server only deny direct access" on public.marketing_meta_oauth_states for all to anon, authenticated using (false) with check (false);
create policy "server only deny direct access" on public.public_enquiry_rate_limit_buckets for all to anon, authenticated using (false) with check (false);
create policy "server only deny direct access" on public.stripe_webhook_events for all to anon, authenticated using (false) with check (false);
create policy "server only deny direct access" on public.user_legal_acceptances for all to anon, authenticated using (false) with check (false);
