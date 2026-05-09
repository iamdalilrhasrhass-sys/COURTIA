DELETE FROM feature_flags WHERE key = 'v1_members_onboarding';
DROP TABLE IF EXISTS onboarding_progress;
DROP TABLE IF EXISTS cabinet_invitations;
DROP TABLE IF EXISTS cabinet_members;
DROP TABLE IF EXISTS cabinets;
