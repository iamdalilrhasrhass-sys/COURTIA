#!/usr/bin/env python3
"""
2Captcha Integration — Solve Cloudflare Turnstile & DataDome for LeBonCoin
Pricing: ~$0.002 per Turnstile solve
Signup: https://2captcha.com (get API key, fund with ~$10)
"""
import requests, os, time, json
from typing import Optional

class TwoCaptchaSolver:
    """2Captcha CAPTCHA solver"""
    
    BASE_URL = "https://2captcha.com"
    
    def __init__(self, api_key: Optional[str] = None):
        self.api_key = api_key or os.environ.get("TWOCAPTCHA_API_KEY", "")
        if not self.api_key:
            print("⚠️ No API key. Set TWOCAPTCHA_API_KEY env var.")
    
    def balance(self) -> float:
        """Check account balance"""
        r = requests.get(f"{self.BASE_URL}/res.php?key={self.api_key}&action=getbalance&json=1")
        return r.json().get("balance", 0)
    
    def solve_turnstile(self, site_key: str, page_url: str) -> Optional[str]:
        """
        Solve Cloudflare Turnstile
        Returns: token string or None
        """
        payload = {
            "key": self.api_key,
            "method": "turnstile",
            "sitekey": site_key,
            "pageurl": page_url,
            "json": 1
        }
        
        # Send solve request
        r = requests.post(f"{self.BASE_URL}/in.php", data=payload)
        result = r.json()
        
        if result.get("status") != 1:
            print(f"❌ Submit error: {result}")
            return None
        
        request_id = result["request"]
        print(f"⏳ Solving... Request ID: {request_id}")
        
        # Poll for result
        for i in range(30):
            time.sleep(2)
            r = requests.get(
                f"{self.BASE_URL}/res.php",
                params={"key": self.api_key, "action": "get", "id": request_id, "json": 1}
            )
            result = r.json()
            
            if result.get("status") == 1:
                print(f"✅ Solved in {i*2}s!")
                return result["request"]
            
            if result.get("request") != "CAPCHA_NOT_READY":
                print(f"❌ Error: {result}")
                return None
        
        print("❌ Timeout")
        return None
    
    def solve_datadome(self, page_url: str, captcha_url: str) -> Optional[str]:
        """
        Solve DataDome CAPTCHA
        captcha_url: the URL from the DataDome interstitial
        """
        payload = {
            "key": self.api_key,
            "method": "datadome",
            "pageurl": page_url,
            "datadome_url": captcha_url,
            "json": 1
        }
        r = requests.post(f"{self.BASE_URL}/in.php", data=payload)
        result = r.json()
        
        if result.get("status") != 1:
            print(f"❌ Submit error: {result}")
            return None
        
        request_id = result["request"]
        print(f"⏳ Solving DataDome... ID: {request_id}")
        
        for i in range(60):
            time.sleep(2)
            r = requests.get(
                f"{self.BASE_URL}/res.php",
                params={"key": self.api_key, "action": "get", "id": request_id, "json": 1}
            )
            result = r.json()
            if result.get("status") == 1:
                print(f"✅ DataDome solved in {i*2}s!")
                return result["request"]
            if result.get("request") != "CAPCHA_NOT_READY":
                break
            time.sleep(1)
        
        return None

# ── LeBonCoin Scraper ─────────────────────────────────

class LeBonCoinScraper:
    """Scrape LeBonCoin using solved CAPTCHAs"""
    
    SEARCH_URL = "https://www.leboncoin.fr/api/adsearch"
    
    def __init__(self, solver: TwoCaptchaSolver):
        self.solver = solver
        self.session = requests.Session()
        self.session.headers.update({
            "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36",
            "Accept": "application/json",
            "api_key": "bfca5060-537b-4201-b211-4b5b8b1f9c92"
        })
    
    def search(self, category: str = "10", keywords: str = "", limit: int = 50):
        """Search LeBonCoin listings"""
        payload = {
            "limit": limit,
            "filters": {"category": {"id": category}},
            "keywords": keywords,
            "sort": "time"
        }
        
        r = self.session.post(self.SEARCH_URL, json=payload)
        
        if r.status_code == 403:
            print("🚫 Blocked by DataDome. Need to solve CAPTCHA...")
            # Get the captcha URL from the response
            data = r.json()
            captcha_url = data.get("url", "")
            token = self.solver.solve_datadome(
                page_url=self.SEARCH_URL,
                captcha_url=captcha_url
            )
            if token:
                self.session.cookies.set("datadome", token)
                r = self.session.post(self.SEARCH_URL, json=payload)
                if r.status_code == 200:
                    return r.json()
            return None
        
        if r.status_code == 200:
            return r.json()
        
        print(f"❌ HTTP {r.status_code}: {r.text[:200]}")
        return None

if __name__ == "__main__":
    print("🔧 2Captcha + LeBonCoin Scraper ready")
    print("Set TWOCAPTCHA_API_KEY=your_key to activate")
