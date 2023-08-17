from flask import Flask, render_template
from flask_socketio import SocketIO
from routes.routes import configure_routes



app = Flask(__name__)
socketio = SocketIO(app)  # Initialize SocketIO
app.secret_key = 'your_secret_key_here'  # Replace with a secure secret key

app = configure_routes(app, socketio)

if __name__ == '__main__':
    socketio.run(app, debug=True)