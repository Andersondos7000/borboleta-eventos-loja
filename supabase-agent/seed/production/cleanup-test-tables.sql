-- Migração: cleanup-test-tables.sql
DROP TABLE IF EXISTS test_mcp_migration;
DROP TABLE IF EXISTS realtime_latency_alerts CASCADE;
DROP TABLE IF EXISTS realtime_latency_config CASCADE; 
DROP TABLE IF EXISTS realtime_latency_metrics CASCADE;