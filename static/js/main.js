const socket = io.connect();

socket.on('connect', () => {
    console.log('Socket connected');

    // Fetch the user's contact number from the server
    fetch('/get_user_contact')
        .then(response => response.json())
        .then(data => {
            if (data.contact) {
                const userContact = data.contact;
                console.log('User Contact:', userContact); // Debug: Log user's contact

                socket.on('message', (data) => {
                    console.log('Received message:', data);

                    // Fetch the sender's username using their contact number
                    fetch(`/get_username?contact=${data.sender_contact}`)
                        .then(response => response.json())
                        .then(usernameData => {
                            const senderUsername = usernameData.success ? usernameData.username : 'Unknown User';

                            // Fetch the receiver's username using their contact number
                            fetch(`/get_username?contact=${data.receiver_contact}`)
                                .then(response => response.json())
                                .then(receiverUsernameData => {
                                    const receiverUsername = receiverUsernameData.success ? receiverUsernameData.username : 'Unknown User';

                                    // Update the chat messages in the UI
                                    const messagesDiv = document.getElementById('chat-messages');
                                    const messageDiv = document.createElement('div');
                                    const senderLabel = data.sender_contact === userContact ? 'You' : senderUsername;
                                    const receiverLabel = data.receiver_contact === userContact ? 'You' : receiverUsername;
                                    messageDiv.innerHTML = `<strong>${senderLabel} to ${receiverLabel}: </strong>${data.message}`;
                                    messagesDiv.appendChild(messageDiv);
                                })
                                .catch(error => {
                                    console.error('Error fetching receiver username:', error);
                                });
                        })
                        .catch(error => {
                            console.error('Error fetching sender username:', error);
                        });
                });

                const messageForm = document.getElementById('message-form');
                messageForm.addEventListener('submit', function (event) {
                    event.preventDefault();

                    // Use the fetched contact number as sender_contact
                    const messageInput = document.getElementById('message-input');
                    const message = messageInput.value.trim();

                    if (message !== '') {
                        socket.emit('message', {
                            sender_contact: userContact,
                            receiver_contact: document.getElementById('connected-username').textContent,
                            message: message,
                        });

                        // Clear the message input
                        messageInput.value = '';

                        // Fetch and display updated chat history after sending a message
                        const receiverContact = document.getElementById('connected-username').textContent;
                        fetch(`/get_chat_history?receiver_contact=${receiverContact}`)
                            .then((response) => response.json())
                            .then((data) => {
                                if (data.success) {
                                    const chatMessagesDiv = document.getElementById('chat-messages');
                                    chatMessagesDiv.innerHTML = ''; // Clear existing messages

                                    data.messages.forEach((message) => {
                                        const messageDiv = document.createElement('div');
                                        const senderLabel =
                                            message.sender_contact === userContact ? 'You' : message.sender_username;
                                        messageDiv.innerHTML = `<strong>${senderLabel}: </strong>${message.message}`;
                                        chatMessagesDiv.appendChild(messageDiv);
                                    });
                                }
                            })
                            .catch((error) => {
                                console.error('Error fetching chat history:', error);
                            });
                    }
                });

                document.getElementById('connect-form').addEventListener('submit', function (event) {
                    event.preventDefault();

                    const connectContactInput = document.getElementById('receiver_contact');
                    const connectContact = connectContactInput.value.trim();

                    if (connectContact !== '') {
                        // Fetch the connected user's username from the server
                        fetch(`/user_exists?contact=${connectContact}`)
                            .then((response) => response.json())
                            .then((data) => {
                                if (data.exists) {
                                    const connectedUsername = data.username;
                                    const connectedUsernameElement = document.getElementById('connected-username');
                                    connectedUsernameElement.textContent = connectedUsername;

                                    // Set the receiver_contact for sending messages
                                    const sendButton = document.getElementById('send-button');
                                    sendButton.setAttribute('data-receiver-contact', connectContact);

                                    // Fetch and display chat history for the connected user
                                    fetch(`/get_chat_history?receiver_contact=${connectContact}`)
                                        .then((response) => response.json())
                                        .then((data) => {
                                            if (data.success) {
                                                const chatMessagesDiv = document.getElementById('chat-messages');
                                                chatMessagesDiv.innerHTML = ''; // Clear existing messages

                                                data.messages.forEach((message) => {
                                                    const messageDiv = document.createElement('div');
                                                    const senderLabel =
                                                        message.sender_contact === userContact ? 'You' : message.sender_username;
                                                    messageDiv.innerHTML = `<strong>${senderLabel}: </strong>${message.message}`;
                                                    chatMessagesDiv.appendChild(messageDiv);
                                                });
                                            }
                                        })
                                        .catch((error) => {
                                            console.error('Error fetching chat history:', error);
                                        });
                                } else {
                                    console.log('User not found');
                                }
                            })
                            .catch((error) => {
                                console.error('Error fetching username:', error);
                            });
                    }
                });

            } else {
                console.log('User contact not available');
            }
        })
        .catch(error => {
            console.error('Error fetching user contact:', error);
        });
});
