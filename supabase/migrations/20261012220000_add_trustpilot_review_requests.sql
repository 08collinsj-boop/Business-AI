-- Owner-configured Trustpilot links; no automated customer messaging.
alter table public.business_settings add column if not exists review_trustpilot_url text not null default '';
alter table public.business_settings drop constraint if exists business_settings_review_trustpilot_url_length_check;
alter table public.business_settings add constraint business_settings_review_trustpilot_url_length_check check (char_length(review_trustpilot_url) <= 2048);
alter table public.business_settings drop constraint if exists business_settings_review_preferred_platform_check;
alter table public.business_settings add constraint business_settings_review_preferred_platform_check check (review_preferred_platform in ('google', 'facebook', 'trustpilot'));
comment on column public.business_settings.review_trustpilot_url is 'Owner-supplied Trustpilot HTTPS link; review requests remain manually sent.';
