-- Tester feedback polish: optional short title plus an "other" category.
-- Additive only: existing rows and clients keep working.

alter table public.pilot_feedback
  add column if not exists title text not null default '';

alter table public.pilot_feedback
  drop constraint if exists pilot_feedback_title_check;

alter table public.pilot_feedback
  add constraint pilot_feedback_title_check
  check (char_length(title) <= 120);

alter table public.pilot_feedback
  drop constraint if exists pilot_feedback_category_check;

alter table public.pilot_feedback
  add constraint pilot_feedback_category_check
  check (category in (
    'bug',
    'confusing',
    'ai_accuracy',
    'missing_feature',
    'suggestion',
    'other'
  ));
