-- pg_net is not used by Business AI. Keep the Pilot database free of an
-- unnecessary extension in public and reinstall it only if a future feature
-- explicitly requires database-originated HTTP requests.
drop extension if exists pg_net;
