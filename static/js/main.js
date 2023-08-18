const socket = io.connect();

socket.on('connect', () => {
    console.log('Socket connected');

    const userContactPromise = fetch('/get_user_contact')
        .then(response => response.json())
        .then(data => data.contact)
        .catch(error => {
            console.error('Error fetching user contact:', error);
        });

    userContactPromise.then(userContact => {
        if (userContact) {
            console.log('User Contact:', userContact);

            const connectedUsernameElement = document.getElementById('connected-username');
            const messageForm = document.getElementById('message-form');
            const chatMessagesDiv = document.getElementById('chat-messages');

            socket.on('message', (data) => {
                console.log('Received message:', data);

                const receiverContactInput = document.getElementById('receiver_contact');
                const currentReceiverContact = receiverContactInput.value.trim();

                if (currentReceiverContact === data.sender_contact || currentReceiverContact === data.receiver_contact) {
                    fetch(`/get_username?contact=${data.sender_contact}`)
                        .then(response => response.json())
                        .then(usernameData => {
                            const senderUsername = usernameData.success ? usernameData.username : 'Unknown User';

                            fetch(`/get_username?contact=${data.receiver_contact}`)
                                .then(response => response.json())
                                .then(receiverUsernameData => {
                                    const receiverUsername = receiverUsernameData.success ? receiverUsernameData.username : 'Unknown User';

                                    const messagesDiv = document.getElementById('chat-messages');
                                    const messageDiv = document.createElement('div');
                                    const senderLabel = data.sender_contact === userContact ? 'You' : senderUsername;
                                    const receiverLabel = data.receiver_contact === userContact ? 'You' : receiverUsername;
                                    messageDiv.innerHTML = `<strong>${senderLabel} to ${receiverLabel}: </strong>${data.message}`;
                                    messagesDiv.appendChild(messageDiv);

                                    messagesDiv.scrollTop = messagesDiv.scrollHeight;
                                })
                                .catch(error => {
                                    console.error('Error fetching receiver username:', error);
                                });
                        })
                        .catch(error => {
                            console.error('Error fetching sender username:', error);
                        });
                }
            });

            messageForm.addEventListener('submit', function (event) {
                event.preventDefault();

                const receiverContactInput = document.getElementById('receiver_contact');
                const receiverContact = receiverContactInput.value.trim();

                const messageInput = document.getElementById('message-input');
                const message = messageInput.value.trim();

                if (message !== '') {
                    socket.emit('message', {
                        sender_contact: userContact,
                        receiver_contact: receiverContact,
                        message: message,
                    });

                    const messagesDiv = document.getElementById('chat-messages');
                    const messageDiv = document.createElement('div');
                    const senderLabel = 'You';  // Assuming you always show the sender as 'You' for your own messages
                    const receiverLabel = receiverContact === userContact ? 'You' : receiverContact;  // Update this as per your logic
                    messageDiv.innerHTML = `<strong>${senderLabel} : </strong>${message}`;
                    messagesDiv.appendChild(messageDiv);

                    messagesDiv.scrollTop = messagesDiv.scrollHeight;

                    messageInput.value = '';
                }
            });

            document.getElementById('connect-form').addEventListener('submit', function (event) {
                event.preventDefault();

                const connectContactInput = document.getElementById('receiver_contact');
                const connectContact = connectContactInput.value.trim();

                if (connectContact !== '') {
                    fetch(`/user_exists?contact=${connectContact}`)
                        .then(response => response.json())
                        .then(data => {
                            if (data.exists) {
                                const connectedUsername = data.username;
                                connectedUsernameElement.textContent = connectedUsername;

                                const sendButton = document.getElementById('send-button');
                                sendButton.setAttribute('data-receiver-contact', connectContact);

                                fetchAndDisplayChatHistory(connectContact);
                            } else {
                                console.log('User not found');
                            }
                        })
                        .catch(error => {
                            console.error('Error fetching username:', error);
                        });
                }
            });

            function fetchAndDisplayChatHistory(receiverContact) {
                connectedUsernameElement.textContent = receiverContact;
                fetch(`/get_chat_history?receiver_contact=${receiverContact}`)
                    .then(response => response.json())
                    .then(data => {
                        if (data.success) {
                            const chatMessagesDiv = document.getElementById('chat-messages');
                            chatMessagesDiv.innerHTML = '';

                            data.messages.forEach(message => {
                                const messageDiv = document.createElement('div');
                                const senderLabel = message.sender_contact === userContact ? 'You' : message.sender_username;
                                messageDiv.innerHTML = `<strong>${senderLabel}: </strong>${message.message}`;
                                chatMessagesDiv.appendChild(messageDiv);

                                chatMessagesDiv.scrollTop = chatMessagesDiv.scrollHeight;
                            });
                        }
                    })
                    .catch(error => {
                        console.error('Error fetching chat history:', error);
                    });
            }

        } else {
            console.log('User contact not available');
        }
    });
});