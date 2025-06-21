from flask import Flask, jsonify
from flask_cors import CORS
from datetime import datetime

# Initialize Flask app
app = Flask(__name__)

# Enable CORS for all routes (allows frontend to communicate with backend)
CORS(app, resources={r"/*": {"origins": "*"}}, supports_credentials=True)

# Basic health check endpoint
@app.route('/health', methods=['GET'])
def health_check():
    """Health check endpoint for liveness check"""
    return jsonify({
        "status": "healthy",
        "service": "steganography-backend",
        "timestamp": datetime.now().isoformat()
    }), 200

# Basic error handler
@app.errorhandler(404)
def not_found(error):
    return jsonify({'error': 'Endpoint not found'}), 404

if __name__ == '__main__':
    print("Starting basic Flask server...")
    app.run(debug=True, host='0.0.0.0', port=3000)