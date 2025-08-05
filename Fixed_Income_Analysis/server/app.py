from flask import Flask, jsonify
from flask_cors import CORS
import json
import os

print("🔥 Flask server from THIS file is starting...")

app = Flask(__name__)
CORS(app)

# Month code map used in futures contract parsing
MONTH_MAP = {
    'F': 'Jan', 'G': 'Feb', 'H': 'Mar', 'J': 'Apr', 'K': 'May', 'M': 'Jun',
    'N': 'Jul', 'Q': 'Aug', 'U': 'Sep', 'V': 'Oct', 'X': 'Nov', 'Z': 'Dec'
}


def transform_contract_data(data, product_code):
    print(f"🚀 Transforming {product_code} data...")
    transformed = []

    for item in data:
        raw = item['contract']  # e.g., "AUG 2025\nZQQ5"
        parts = raw.split('\n')
        if len(parts) != 2:
            print(f"⚠️ Skipping malformed contract: {raw}")
            continue

        symbol = parts[1].strip()  # e.g., "ZQQ5" or "SR3Z5"
        if not symbol.startswith(product_code):
            continue

        # Extract month and year
        month_code = symbol[len(product_code):len(product_code)+1]  # e.g., "Q"
        year_code = symbol[len(product_code)+1:]  # e.g., "5"

        month = MONTH_MAP.get(month_code, month_code)
        contract_name = f"{month}{year_code}"

        transformed.append({
            'contract': contract_name,
            'price': item['settle']
        })

    print(f"✅ {product_code}: {len(transformed)} contracts transformed")
    return transformed


@app.route('/')
def root():
    return '✅ Flask server is running. Try /api/zq or /api/sr3'


@app.route('/api/zq')
def get_zq():
    try:
        print("📥 Fetching ZQ data...")
        with open('zq_prices.json') as f:
            data = json.load(f)
        print(f"📦 Loaded {len(data)} raw ZQ items")
        transformed_data = transform_contract_data(data, 'ZQ')
        return jsonify(transformed_data)
    except Exception as e:
        print(f"❌ Error reading zq_prices.json: {e}")
        return jsonify({'error': 'ZQ data unavailable'}), 500


@app.route('/api/sr3')
def get_sr3():
    try:
        print("📥 Fetching SR3 data...")
        with open('sr3_prices.json') as f:
            data = json.load(f)
        print(f"📦 Loaded {len(data)} raw SR3 items")
        transformed_data = transform_contract_data(data, 'SR3')
        return jsonify(transformed_data)
    except Exception as e:
        print(f"❌ Error reading sr3_prices.json: {e}")
        return jsonify({'error': 'SR3 data unavailable'}), 500


if __name__ == '__main__':
    app.run(debug=True, port=4000)
