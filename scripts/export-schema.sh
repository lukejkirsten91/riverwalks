#!/bin/bash

# Riverwalks Schema Export/Import Script
# This script helps you properly migrate your schema from production to staging

echo "🗄️  Riverwalks Schema Migration Tool"
echo ""

# Check if Supabase CLI is installed
if ! command -v supabase &> /dev/null; then
    echo "❌ Supabase CLI not found. Installing..."
    echo "Run: npm install -g supabase"
    echo "Or visit: https://supabase.com/docs/guides/cli"
    exit 1
fi

echo "📋 Schema Migration Options:"
echo ""
echo "1. 🔄 Export schema from production Supabase"
echo "2. 📥 Import schema to staging Supabase"
echo "3. 🧹 Clean up old SQL files"
echo "4. 📖 Show manual export instructions"
echo ""

read -p "Choose option (1-4): " choice

case $choice in
    1)
        echo "📤 Exporting production schema..."
        echo ""
        echo "⚠️  You'll need to do this manually in Supabase Dashboard:"
        echo ""
        echo "1. Go to your PRODUCTION Supabase project"
        echo "2. Settings → Database → Database Schema"
        echo "3. Click 'Download' to get schema.sql"
        echo "4. Save as: schema-export-$(date +%Y%m%d).sql"
        echo ""
        echo "Or use SQL Editor and run:"
        echo ""
        echo "-- Export all tables and functions"
        echo "SELECT pg_dump('postgresql://postgres:[password]@[host]:[port]/postgres');"
        ;;
    
    2)
        echo "📥 Importing to staging..."
        echo ""
        echo "1. Upload your exported schema.sql to staging Supabase"
        echo "2. Go to SQL Editor in STAGING project"
        echo "3. Paste the schema content and run"
        echo "4. Don't forget to run: supabase/add-admin-simple.sql"
        ;;
    
    3)
        echo "🧹 Cleaning up old SQL files..."
        echo ""
        echo "The following files can be safely removed:"
        echo ""
        find supabase/ -name "*.sql" | grep -E "(debug|fix|test|cleanup)" | sort
        echo ""
        read -p "Delete these files? (y/N): " confirm
        if [[ $confirm == [yY] ]]; then
            find supabase/ -name "*.sql" | grep -E "(debug|fix|test|cleanup)" | xargs rm -f
            echo "✅ Cleaned up old SQL files"
        fi
        ;;
    
    4)
        echo "📖 Manual Schema Export Instructions:"
        echo ""
        echo "METHOD A: Using Supabase Dashboard"
        echo "1. Production project → Settings → Database"
        echo "2. Click 'Database Schema' tab"
        echo "3. Click 'Download' button"
        echo "4. Upload to staging project"
        echo ""
        echo "METHOD B: Using SQL Editor"
        echo "1. In production SQL Editor, run this query:"
        echo ""
        cat << 'EOF'
-- Get table creation statements
SELECT 
    'CREATE TABLE ' || schemaname || '.' || tablename || ' (' ||
    string_agg(
        column_name || ' ' || data_type ||
        CASE 
            WHEN character_maximum_length IS NOT NULL 
            THEN '(' || character_maximum_length || ')'
            ELSE ''
        END ||
        CASE 
            WHEN is_nullable = 'NO' THEN ' NOT NULL'
            ELSE ''
        END,
        ', '
    ) || ');'
FROM information_schema.tables t
JOIN information_schema.columns c ON t.table_name = c.table_name
WHERE t.table_schema = 'public'
GROUP BY schemaname, tablename;
EOF
        echo ""
        echo "2. Copy the results and run in staging"
        ;;
    
    *)
        echo "❌ Invalid option"
        exit 1
        ;;
esac

echo ""
echo "📚 For more info, see: docs/DEPLOYMENT.md"