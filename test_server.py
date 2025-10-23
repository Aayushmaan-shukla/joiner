from flask import Flask
from flask_cors import CORS

app = Flask(__name__)
CORS(app)

@app.route('/')
def index():
    return "Test server is working!"

if __name__ == '__main__':
    print("Starting test server on http://localhost:5000")
    app.run(debug=True, host='0.0.0.0', port=5000)
