-- Business-AI-Dev-only, SELECT-only FK inventory for deletion design.
-- This does not delete, lock, snapshot, clone, export or change any tenant data.
-- Counts are foreign-key constraints (not unique child table counts).
BEGIN READ ONLY;
WITH fk AS (
  SELECT co.conname,
         np.nspname||'.'||parent.relname AS parent_relation,
         nc.nspname||'.'||child.relname AS child_relation,
         CASE co.confdeltype
           WHEN 'c' THEN 'CASCADE'
           WHEN 'r' THEN 'RESTRICT'
           WHEN 'a' THEN 'NO ACTION'
           WHEN 'n' THEN 'SET NULL'
           WHEN 'd' THEN 'SET DEFAULT'
         END AS delete_rule,
         EXISTS(
           SELECT 1 FROM pg_attribute attr
           WHERE attr.attrelid=co.conrelid
             AND attr.attname='business_id'
             AND NOT attr.attisdropped
         ) AS child_has_business_id
  FROM pg_constraint co
  JOIN pg_class child ON child.oid=co.conrelid
  JOIN pg_namespace nc ON nc.oid=child.relnamespace
  JOIN pg_class parent ON parent.oid=co.confrelid
  JOIN pg_namespace np ON np.oid=parent.relnamespace
  WHERE co.contype='f'
    AND nc.nspname IN ('public','colzo_pilot_private')
)
SELECT parent_relation, delete_rule, child_has_business_id,
       count(*) AS foreign_key_count,
       array_agg(DISTINCT child_relation ORDER BY child_relation) AS referencing_tables
FROM fk
WHERE parent_relation IN ('public.businesses','public.business_memberships',
                          'public.colzo_pilot_access','auth.users')
GROUP BY parent_relation, delete_rule, child_has_business_id
ORDER BY parent_relation, delete_rule, child_has_business_id;
ROLLBACK;
