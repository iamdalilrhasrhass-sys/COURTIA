-- Rollback for 012_v1_foundations.sql

DROP TABLE IF EXISTS audit_log;
DROP TABLE IF EXISTS feature_flag_overrides;
DROP TABLE IF EXISTS feature_flags;
