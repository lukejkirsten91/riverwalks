-- Complete schema export for Riverwalks
-- Run this in your PRODUCTION Supabase SQL Editor
-- Copy the results and run in your STAGING Supabase

-- 1. Export all table schemas
SELECT 
  'CREATE TABLE ' || table_name || ' (' ||
  string_agg(
    column_name || ' ' || 
    CASE 
      WHEN data_type = 'character varying' THEN 'varchar(' || character_maximum_length || ')'
      WHEN data_type = 'character' THEN 'char(' || character_maximum_length || ')'
      WHEN data_type = 'numeric' THEN 'numeric(' || numeric_precision || ',' || numeric_scale || ')'
      WHEN data_type = 'timestamp without time zone' THEN 'timestamp'
      WHEN data_type = 'timestamp with time zone' THEN 'timestamptz'
      ELSE data_type
    END ||
    CASE 
      WHEN is_nullable = 'NO' THEN ' NOT NULL'
      ELSE ''
    END ||
    CASE 
      WHEN column_default IS NOT NULL THEN ' DEFAULT ' || column_default
      ELSE ''
    END,
    ', '
  ) || ');' as create_statement
FROM information_schema.columns 
WHERE table_schema = 'public'
  AND table_name NOT LIKE '%_old'
  AND table_name NOT LIKE '%_backup'
GROUP BY table_name
ORDER BY table_name;

-- 2. Export all indexes
SELECT 
  'CREATE ' || 
  CASE WHEN indisunique THEN 'UNIQUE ' ELSE '' END ||
  'INDEX ' || indexname || ' ON ' || tablename ||
  ' (' || string_agg(attname, ', ') || ');' as index_statement
FROM pg_indexes
JOIN pg_class ON pg_class.relname = indexname
JOIN pg_index ON pg_index.indexrelid = pg_class.oid
JOIN pg_attribute ON pg_attribute.attrelid = pg_index.indrelid 
  AND pg_attribute.attnum = ANY(pg_index.indkey)
WHERE schemaname = 'public'
  AND indexname NOT LIKE '%_pkey'
GROUP BY indexname, tablename, indisunique
ORDER BY tablename, indexname;

-- 3. Export all foreign key constraints
SELECT 
  'ALTER TABLE ' || tc.table_name ||
  ' ADD CONSTRAINT ' || tc.constraint_name ||
  ' FOREIGN KEY (' || kcu.column_name || ')' ||
  ' REFERENCES ' || ccu.table_name ||
  ' (' || ccu.column_name || ')' ||
  CASE 
    WHEN rc.delete_rule != 'NO ACTION' THEN ' ON DELETE ' || rc.delete_rule
    ELSE ''
  END ||
  CASE 
    WHEN rc.update_rule != 'NO ACTION' THEN ' ON UPDATE ' || rc.update_rule  
    ELSE ''
  END || ';' as fk_statement
FROM information_schema.table_constraints tc
JOIN information_schema.key_column_usage kcu 
  ON tc.constraint_name = kcu.constraint_name
JOIN information_schema.constraint_column_usage ccu 
  ON ccu.constraint_name = tc.constraint_name
JOIN information_schema.referential_constraints rc
  ON tc.constraint_name = rc.constraint_name
WHERE tc.constraint_type = 'FOREIGN KEY'
  AND tc.table_schema = 'public'
ORDER BY tc.table_name;

-- 4. Export Row Level Security policies
SELECT 
  'CREATE POLICY ' || policyname || 
  ' ON ' || tablename ||
  ' FOR ' || cmd ||
  CASE 
    WHEN roles != '{0}' THEN ' TO ' || array_to_string(roles, ', ')
    ELSE ''
  END ||
  CASE 
    WHEN qual IS NOT NULL THEN ' USING (' || qual || ')'
    ELSE ''
  END ||
  CASE 
    WHEN with_check IS NOT NULL THEN ' WITH CHECK (' || with_check || ')'
    ELSE ''
  END || ';' as policy_statement
FROM pg_policies
WHERE schemaname = 'public'
ORDER BY tablename, policyname;

-- 5. Export table permissions and RLS status
SELECT 
  'ALTER TABLE ' || table_name || ' ENABLE ROW LEVEL SECURITY;' as rls_statement
FROM information_schema.tables t
JOIN pg_class c ON c.relname = t.table_name
WHERE t.table_schema = 'public'
  AND c.relrowsecurity = true
ORDER BY table_name;