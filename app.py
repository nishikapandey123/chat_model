from flask import Flask, render_template
from flask_socketio import SocketIO
from routes.routes import configure_routes
# from flask_login import login_manager,login,logout


app = Flask(__name__)
socketio = SocketIO(app)  # Initialize SocketIO
app.secret_key = 'your_secret_key_here'  # Replace with a secure secret key

# login = LoginManager(app)
# login.init_app(app)

app = configure_routes(app, socketio)

if __name__ == '__main__':
    socketio.run(app, debug=True)