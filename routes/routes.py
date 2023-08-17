from flask import Flask, render_template, jsonify, request, url_for, redirect, session
from pymongo import MongoClient
from flask_socketio import SocketIO, emit
import datetime
import json


# MongoDB setup
client = MongoClient("mongodb://localhost:27017/")
db = client["chat"]
users_collection = db["users"]
messages_collection = db["messages"]



def configure_routes(app, socketio):
    # if "messages" not in db.list_collection_names():
    #     messages_collection = db.create_collection("messages")
    # else:
    #     messages_collection = db["messages"]

    @app.route('/')
    def index():
        return render_template('index.html')

    @app.route('/register', methods=['GET', 'POST'])
    def register():
        if request.method == 'POST':
            username = request.form.get('username')
            contact = request.form.get('contact')
            
            user_data = {
                'username': username,
                'contact': contact
            }
            
            users_collection.insert_one(user_data)
            
            return redirect(url_for('index'))
        
        return render_template('register.html')

    @app.route('/login', methods=['GET', 'POST'])
    def login():
        if request.method == 'POST':
            contact = request.form.get('contact')
            
            user = users_collection.find_one({'contact': contact})
            
            if user:
                session['contact'] = contact  # Store contact in session
                return redirect(url_for('chat'))  # Redirect to the chat room page
            
            return jsonify({'success': False, 'message': 'User not found'})
        
        return render_template('login.html')

    @app.route('/fetch_data')
    def fetch_data():
        users = list(users_collection.find({}, {"_id": 0}))
        return jsonify(users)


    @app.route('/user_exists')
    def user_exists():
        contact = request.args.get('contact')
        user = users_collection.find_one({'contact': contact})

        if user:
            return jsonify({'exists': True, 'username': user['username']})
        else:
            return jsonify({'exists': False})


    @app.route('/get_username')
    def get_username():
        contact = request.args.get('contact')
        user = users_collection.find_one({'contact': contact})

        if user:
            username = user.get('username')
            return jsonify({'success': True, 'username': username})
        else:
            return jsonify({'success': False})


    @app.route('/get_chat_history', methods=['GET'])
    def get_chat_history():
        print("i am chat history")
        receiver_contact = request.args.get('receiver_contact')
        sender_contact = session.get('contact')

        chat_document = messages_collection.find_one({
            '$or': [
                {'participants': [sender_contact, receiver_contact]},
                {'participants': [receiver_contact, sender_contact]}
            ]
        })

        if chat_document:
            messages = chat_document.get('messages')
            return jsonify({'success': True, 'messages': messages})
        else:
            return jsonify({'success': False, 'message': 'Chat history not found'})



    @app.route('/chat', methods=['GET', 'POST'])
    def chat():
        print("I am Chat")
        contact = session.get('contact')
        user = users_collection.find_one({'contact': contact})

        if user:
            username = user.get('username')

            receiver_contact = request.args.get('contact')  # Extract receiver's contact from query parameter

            if receiver_contact:
                # Retrieve chat history
                chat_document = messages_collection.find_one({
                    '$or': [
                        {'participants': [contact, receiver_contact]},
                        {'participants': [receiver_contact, contact]}
                    ]
                })

                if chat_document:
                    messages = chat_document.get('messages')
                else:
                    messages = []

                return render_template('chat.html', username=username, contact=contact,
                                    receiver_contact=receiver_contact, messages=messages)
            else:
                return render_template('chat.html', username=username, contact=contact)

        else:
            return redirect(url_for('login'))


    @socketio.on('connect')
    def on_connect():
        print('Client connected')

    @socketio.on('disconnect')
    def on_disconnect():
        print('Client disconnected')


    # @socketio.on('message')
    # def handle_message(data):
    #     print('Received message:', data)
    #     sender_contact = data['sender_contact']
    #     receiver_contact = data['receiver_contact']

    #     sender = users_collection.find_one({'contact': sender_contact})
    #     if sender:
    #         sender_username = sender.get('username')
    #         message_data = {
    #             'sender_contact': sender_contact,
    #             'receiver_contact': receiver_contact,
    #             'sender_username': sender_username,
    #             'message': data['message'],
    #             'timestamp': datetime.datetime.now()
    #         }
    #     else:
    #         sender_username = 'Unknown User'
    #         message_data = {
    #             'sender_contact': sender_contact,
    #             'receiver_contact': receiver_contact,
    #             'sender_username': sender_username,
    #             'message': "Sender not found",  # Or any appropriate message
    #             'timestamp': datetime.datetime.now()
    #         }

    # # Rest of your message handling logic


    #     message_data = {
    #         'sender_contact': sender_contact,
    #         'receiver_contact': receiver_contact,
    #         'sender_username': sender_username,
    #         'message': data['message'],
    #         'timestamp': datetime.datetime.now()
    #     }

    #     # Update chat history or create a new document
    #     messages_collection.update_one(
    #         {
    #             '$or': [
    #                 {'participants': [sender_contact, receiver_contact]},
    #                 {'participants': [receiver_contact, sender_contact]}
    #             ]
    #         },
    #         {
    #             '$push': {'messages': message_data},
    #             '$setOnInsert': {'participants': [sender_contact, receiver_contact]}
    #         },
    #         upsert=True
    #     )



    #     # Emit the message back to the sender and receiver
    #     emit('message', message_data, room=f'{sender_contact}_{receiver_contact}')
    # # You can also emit to the sender's room to update their own chat window
    #     emit('message', message_data, room=f'{sender_contact}')
    #     emit('message', message_data, room=f'{receiver_contact}')

    @app.route('/get_user_contact')
    def get_user_contact():
        contact = session.get('contact')
        return jsonify({'contact': contact})


    @socketio.on('message')
    def handle_message(data):
        print('Received message:', data)
        sender_contact = data['sender_contact']
        receiver_contact = data['receiver_contact']

        sender = users_collection.find_one({'contact': sender_contact})
        receiver = users_collection.find_one({'contact': receiver_contact})

        if sender and receiver:
            sender_username = sender.get('username')
            receiver_username = receiver.get('username')
        else:
            sender_username = 'Unknown User'
            receiver_username = 'Unknown User'

        message_data = {
            'sender_contact': sender_contact,
            'receiver_contact': receiver_contact,
            'sender_username': sender_username,
            'receiver_username': receiver_username,
            'message': data['message'],
            'timestamp': datetime.datetime.now()
        }

        # Update chat history or create a new document
        messages_collection.update_one(
            {
                '$or': [
                    {'participants': [sender_contact, receiver_contact]},
                    {'participants': [receiver_contact, sender_contact]}
                ]
            },
            {
                '$push': {'messages': message_data},
                '$setOnInsert': {'participants': [sender_contact, receiver_contact]}
            },
            upsert=True
        )

        # Emit the message back to the sender and receiver
        emit('message', message_data, room=f'{sender_contact}_{receiver_contact}')
        emit('message', message_data, room=f'{sender_contact}')
        emit('message', message_data, room=f'{receiver_contact}')

    # ... (rest of your existing routes and code)


    




    return app
