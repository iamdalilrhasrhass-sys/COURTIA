# COURTIA V1 Final Closure Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. This sprint is executed inline because the user explicitly requested autonomous end-to-end closure.

**Goal:** Close the V1 sales-readiness gaps without breaking production auth, admin, billing, core CRM, or smoke checks.

**Architecture:** Extend existing services and routes rather than replacing delivered V1 modules. All optional providers return `configuration_required` when secrets are absent. Product analytics and feedback use local PostgreSQL tables with optional PostHog forwarding.

**Tech Stack:** Node/Express/PostgreSQL/Jest backend, React/Vite frontend, Vercel frontend, PM2 backend.

---

## Execution Checklist

- [x] Baseline backend/frontend tests.
- [x] Email transactionnel Resend-first with configuration-required fallback.
- [x] SMS provider abstraction with no fake TextBelt default.
- [x] Quota aliasing and usage counters.
- [x] Import mapping hardening and CSV template.
- [x] Product events and feedback loop.
- [x] Admin observability and feedback page.
- [x] Public legal/status pages.
- [x] Full required verification.
- [ ] PR, preview, smoke, merge and production smoke if credentials allow.
