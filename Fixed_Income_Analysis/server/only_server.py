from flask import Flask

print("🔥 Minimal Flask starting...")

app = Flask(__name__)

@app.route('/')
def hello():
    print("👋 Root route was called")
    return "It works!"

if __name__ == '__main__':
    app.run(debug=True, port=4000)
