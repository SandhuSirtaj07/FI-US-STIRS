from playwright.sync_api import sync_playwright
import json
import re
import schedule
import time

def scrape_with_playwright(url, product_code):
    data = []
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=False)  # Change: run full browser
        context = browser.new_context(
            user_agent=(
                "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 "
                "(KHTML, like Gecko) Chrome/114.0.0.0 Safari/537.36"
            ),
            viewport={"width": 1280, "height": 800},
            ignore_https_errors=True,
        )
        page = context.new_page()

        print(f"🌐 Navigating to {url}")
        try:
            page.goto(url, timeout=90000, wait_until="domcontentloaded")
            page.wait_for_selector("div.main-table-wrapper table", timeout=60000)
        except Exception as e:
            raise RuntimeError(f"Failed to load table: {e}")

        rows = page.query_selector_all("div.main-table-wrapper table tbody tr")

        for row in rows:
            cells = row.query_selector_all("td")
            if len(cells) < 7:
                continue
            month = cells[0].inner_text().strip()
            settle_raw = cells[6].inner_text().strip()
            settle_clean = re.sub(r"[^\d.]", "", settle_raw)
            try:
                settle = float(settle_clean)
                data.append({
                    "contract": month,
                    "settle": settle
                })
            except ValueError:
                continue

        browser.close()
    return data

# if __name__ == "__main__":
def randi():
    zq_url = "https://www.cmegroup.com/markets/interest-rates/stirs/30-day-federal-fund.quotes.html"
    sr3_url = "https://www.cmegroup.com/markets/interest-rates/stirs/three-month-sofr.quotes.html"

    print("⏳ Scraping ZQ data...")
    try:
        zq_data = scrape_with_playwright(zq_url, "ZQ")
        with open("zq_prices.json", "w") as f:
            json.dump(zq_data, f, indent=2)
        print(f"✅ ZQ prices saved ({len(zq_data)} contracts)")
    except Exception as e:
        print(f"❌ Failed to scrape ZQ data: {e}")

    print("⏳ Scraping SR3 data...")
    try:
        sr3_data = scrape_with_playwright(sr3_url, "SR3")
        with open("sr3_prices.json", "w") as f:
            json.dump(sr3_data, f, indent=2)
        print(f"✅ SR3 prices saved ({len(sr3_data)} contracts)")
    except Exception as e:
        print(f"❌ Failed to scrape SR3 data: {e}")

if __name__ == "__main__":

    randi()
    schedule.every(10).minutes.do(randi)

    print("📅 Scheduler started. Running every 10 minutes.")
    print("🔴 Press Ctrl+C to stop.")

    try:
        while True:
            schedule.run_pending()
            time.sleep(1)

    except KeyboardInterrupt:
        print("\n🛑 Scheduler stopped by user (Ctrl+C)")