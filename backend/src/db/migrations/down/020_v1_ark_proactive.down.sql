DROP TABLE IF EXISTS ark_recommendations;
DROP TABLE IF EXISTS client_risk_scores;
DROP TABLE IF EXISTS ark_runs;
DROP TABLE IF EXISTS ark_budgets;
DELETE FROM feature_flags WHERE key = 'v1_ark_proactive';
