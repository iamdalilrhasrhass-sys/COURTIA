#!/usr/bin/env python3
"""
GateSolve Integration — CAPTCHA solving for AI agents
API: https://gatesolve.dev/docs
Pricing: $0.02/solve, 100 free solves
Payment: x402 micropayments (USDC on Base)
"""
import requests, json, os, time

GATESOLVE_API = os.environ.get("GATESOLVE_API", "https://api.gatesolve.dev/v1")

class GateSolver:
    def __init__(self, api_key=None):
        self.api_key = api_key
    
    def solve_turnstile(self, site_key: str, url: str) -> dict:
        """Solve Cloudflare Turnstile CAPTCHA"""
        payload = {
            "type": "turnstile",
            "site_key": site_key,
            "url": url
        }
        if self.api_key:
            payload["api_key"] = self.api_key
        r = requests.post(f"{GATESOLVE_API}/solve", json=payload, timeout=30)
        return r.json()
    
    def solve_recaptcha(self, site_key: str, url: str, version: str = "v2") -> dict:
        """Solve reCAPTCHA v2/v3"""
        payload = {
            "type": f"recaptcha_{version}",
            "site_key": site_key,
            "url": url
        }
        if self.api_key:
            payload["api_key"] = self.api_key
        r = requests.post(f"{GATESOLVE_API}/solve", json=payload, timeout=30)
        return r.json()
    
    def solve_hcaptcha(self, site_key: str, url: str) -> dict:
        """Solve hCaptcha"""
        payload = {
            "type": "hcaptcha",
            "site_key": site_key,
            "url": url
        }
        if self.api_key:
            payload["api_key"] = self.api_key
        r = requests.post(f"{GATESOLVE_API}/solve", json=payload, timeout=30)
        return r.json()

if __name__ == "__main__":
    solver = GateSolver()
    print("GateSolve client ready")
