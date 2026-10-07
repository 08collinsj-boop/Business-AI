-- Business AI Marketing now uses a database-originated hourly scheduler call.
-- Re-enable pg_net after the earlier removal now that this is an explicit
-- server-side requirement. The scheduler bearer secret remains in Supabase
-- Vault and is never stored in source.
create extension if not exists pg_net with schema extensions;
