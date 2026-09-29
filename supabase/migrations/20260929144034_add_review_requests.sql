alter table public.business_settings
  add column if not exists review_requests_enabled boolean not null default false,
  add column if not exists review_google_url text not null default '',
  add column if not exists review_facebook_url text not null default '',
  add column if not exists review_preferred_platform text not null default 'google';

alter table public.business_settings
  drop constraint if exists business_settings_review_preferred_platform_check;

alter table public.business_settings
  add constraint business_settings_review_preferred_platform_check
  check (review_preferred_platform in ('google', 'facebook'));

alter table public.business_settings
  drop constraint if exists business_settings_review_google_url_length_check;

alter table public.business_settings
  add constraint business_settings_review_google_url_length_check
  check (char_length(review_google_url) <= 2048);

alter table public.business_settings
  drop constraint if exists business_settings_review_facebook_url_length_check;

alter table public.business_settings
  add constraint business_settings_review_facebook_url_length_check
  check (char_length(review_facebook_url) <= 2048);

alter table public.actions
  drop constraint if exists actions_action_type_check;

alter table public.actions
  add constraint actions_action_type_check
  check (action_type in (
    'call_customer',
    'send_quote',
    'follow_up',
    'confirm_appointment',
    'review_enquiry',
    'request_review',
    'custom'
  ));

create unique index if not exists actions_one_review_request_per_booking_idx
  on public.actions (business_id, booking_id)
  where booking_id is not null
    and action_type = 'request_review';

comment on column public.business_settings.review_requests_enabled is
  'When enabled, completing a booking prepares one internal review-request action. Nothing is sent automatically.';

comment on column public.business_settings.review_google_url is
  'Owner-supplied Google review destination validated server-side before customer exposure.';

comment on column public.business_settings.review_facebook_url is
  'Owner-supplied Facebook review destination validated server-side before customer exposure.';
