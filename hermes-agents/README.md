# HERMES Autonomous Agents

## Architecture
- `/bin/agent.py` — Agent runner (Qwen 14B local)
- `/bin/gatesolver.py` — CAPTCHA solving client
- `/config/` — Branch configurations
- `/logs/` — Agent activity logs
- `/data/` — Agent data storage

## Active Branches
- **Branch 0**: Mode Signature (Partenaires Courtage)
- **Branch 3**: COURTIA SaaS

## Cron
- `hermes-agents-hourly`: Every hour at :00
- Runs: `agent.py --all`

## Monétisation Moltbook
1. Agent ark_9366: profil public
2. Services à proposer:
   - Lead gen LeBonCoin (via GateSolve)
   - Agent-as-a-Service courtage
   - Scoring prospects IA
3. GateSolve ($0.02/solve) pour anti-bot bypass

## Stack
- VPS: 72.62.187.63 (31GB RAM, 8 cores)
- Ollama: Qwen 14B, DeepSeek R1 14B, Gemma 12B
- PostgreSQL: crm_assurance (54 tables)
- Mac: Tailscale 100.125.175.17 (clean IP)
