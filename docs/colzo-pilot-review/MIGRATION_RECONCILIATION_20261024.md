# Development migration reconciliation - 24 October 2026

## SQL-level continuation

The original name-only inventory below is superseded for SQL analysis by [Recovery and reconciliation](RECOVERY_AND_RECONCILIATION_20261024.md), [all-file SQL matrix](MIGRATION_SQL_AUDIT_20261024.json) and [PostgreSQL reconstruction](RECOVERY_SCHEMA_AUDIT_20261024.json). All 57 files and 59 recorded SQL entries were compared. Forty-six files match conservatively normalised SQL; two same-version/name pairs have different statements. A diagnostic combined reconstruction matches captured public schema and 222 effective privilege rows. Genuine extension and actual-source recovery gates remain BLOCKED. No migration history was changed.

## Earlier name/version inventory

Pinned branch: 57 migration files. Shared Dev ledger: 59 entries. Exact version/name matches: 32.

**BLOCKED for shared database changes.** Name/version matching is not SQL equivalence. No ledger repair or migration application was performed. Applied SQL hashes and full schema diff still need review after a privately verified shared Dev backup restore.

| Location | Version | Name |
| --- | --- | --- |
| Dev ledger only | 20260927105141 | add_legal_acceptances |
| Dev ledger only | 20260927170722 | add_marketing_schedules |
| Dev ledger only | 20260927170938 | process_due_marketing_schedules |
| Dev ledger only | 20260927171406 | enable_marketing_scheduler_extensions |
| Dev ledger only | 20260927171656 | meta_native_marketing_schedules |
| Dev ledger only | 20260927183105 | allow_cloudflare_marketing_images |
| Dev ledger only | 20260927193707 | add_marketing_usage_limits |
| Dev ledger only | 20260927194353 | add_marketing_usage_limits |
| Dev ledger only | 20260927224235 | add_directory_visibility |
| Dev ledger only | 20260927231059 | add_customer_portal |
| Dev ledger only | 20260928233058 | allow_owner_uploaded_marketing_photos |
| Dev ledger only | 20260929102437 | add_business_referrals |
| Dev ledger only | 20260930185802 | fix_referral_profile_conflict_ambiguity |
| Dev ledger only | 20261001201424 | add_contextual_handover_summaries |
| Dev ledger only | 20261001213801 | remove_unused_pg_net |
| Dev ledger only | 20261001213843 | document_server_only_rls_policies |
| Dev ledger only | 20261002192840 | add_marketing_automation_media |
| Dev ledger only | 20261002193007 | harden_marketing_automation_media |
| Dev ledger only | 20261002225450 | add_marketing_strategy_planning |
| Dev ledger only | 20261002231245 | add_marketing_strategy |
| Dev ledger only | 20261004163922 | add_feedback_title_and_other |
| Dev ledger only | 20261005220853 | add_marketing_automation_frequency |
| Dev ledger only | 20261012215816 | post_pilot_trustpilot_review_destinations |
| Dev ledger only | 20261012215824 | post_pilot_customer_complaints |
| Dev ledger only | 20261012215830 | post_pilot_review_email_queue |
| Dev ledger only | 20261012223925 | post_pilot_colzo_projects_quotes_clients |
| Dev ledger only | 20261016153313 | colzo_whatsapp_synthetic_inbox_dev_20261016 |
| Repository only | 20260925200000 | add_marketing_schedules |
| Repository only | 20260925210000 | add_feedback_title_and_other |
| Repository only | 20260926233524 | add_marketing_automation_images |
| Repository only | 20260927110000 | add_legal_acceptances |
| Repository only | 20260927171000 | process_due_marketing_schedules |
| Repository only | 20260927173500 | meta_native_marketing_schedules |
| Repository only | 20260927175200 | allow_cloudflare_marketing_images |
| Repository only | 20260927202500 | add_marketing_usage_limits |
| Repository only | 20260927232000 | add_directory_visibility |
| Repository only | 20260927235000 | add_customer_portal |
| Repository only | 20260928231500 | allow_owner_uploaded_marketing_photos |
| Repository only | 20260929103000 | add_business_referrals |
| Repository only | 20260929124200 | add_automatic_follow_up_settings |
| Repository only | 20260929144034 | add_review_requests |
| Repository only | 20260930190000 | fix_referral_profile_conflict_ambiguity |
| Repository only | 20261001200000 | add_contextual_handover_summaries |
| Repository only | 20261001214000 | remove_unused_pg_net |
| Repository only | 20261001214100 | document_server_only_rls_policies |
| Repository only | 20261002193000 | add_marketing_automation_media |
| Repository only | 20261002194000 | harden_marketing_automation_media |
| Repository only | 20261002223000 | add_marketing_strategy_planning |
| Repository only | 20261004231500 | add_business_public_profile_media |
| Repository only | 20261005221500 | add_marketing_automation_frequency |
| Repository only | 20261010_pilot | free_starter_marketing |
| Repository only | 20261019162954 | colzo_lead_write_versions |
