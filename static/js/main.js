const socket = io.connect();

socket.on('connect', () => {
    console.log('Socket connected');

    window.addEventListener('resize', function() {
        const messageInputContainer = document.getElementById('message-input-container');
        const connectForm = document.getElementById('connect-form');

        messageInputContainer.style.top = '0';
        connectForm.style.bottom = 0;
    });

    const userContactPromise = fetch('/get_user_contact')
        .then(response => response.json())
        .then(data => data.contact)
        .catch(error => {
            console.error('Error fetching user contact:', error);
        });


    const audioButton = document.getElementById('audio-button');
    const hangupButton = document.getElementById('hangup-button');

    // audioButton.addEventListener('click', () => {
    //     const recipient = prompt('Enter recipient contact:', connectContact);
    //     if (recipient) {
    //         socket.emit('audio_call', { recipient });
    //     }
    // });

    // hangupButton.addEventListener('click', () => {
    //     socket.emit('hangup_call');
    // });

    userContactPromise.then(userContact => {
        if (userContact) {
            console.log('User Contact:', userContact);

            const connectedUsernameElement = document.getElementById('connected-username');
            const messageForm = document.getElementById('message-form');
            const chatMessagesDiv = document.getElementById('chat-messages');
            const callButton = document.getElementById('call-button');

            callButton.addEventListener('click', function() {
                const receiverContactInput = document.getElementById('receiver_contact');
                const receiverContact = receiverContactInput.value.trim();
                const callStatus = this.getAttribute('data-call-status');

                if (callStatus === 'idle') {
                    this.setAttribute('data-call-status', 'calling');
                    this.textContent = 'Hangup';

                    socket.emit('audio_call', {
                        recipient: receiverContact
                    });
                } else if (callStatus === 'calling') {
                    this.setAttribute('data-call-status', 'idle');
                    this.textContent = 'Audio Call';

                    socket.emit('hangup_call', {
                        recipient: receiverContact
                    });
                }
            });

            socket.on('incoming_call', (data) => {
                // Handle incoming call notification, if needed
                const callerName = data.caller; // Modify this to get the caller's name from the data
                const notificationOptions = {
                    body: `Incoming call from ${callerName}`,
                    icon: 'path_to_your_notification_icon.png', // Replace with the path to your notification icon
                };

                if (Notification.permission === 'granted') {
                    new Notification('Incoming Call', notificationOptions);
                } else if (Notification.permission !== 'denied') {
                    Notification.requestPermission().then(permission => {
                        if (permission === 'granted') {
                            new Notification('Incoming Call', notificationOptions);
                        }
                    });
                }
            });

            socket.on('hangup', () => {
                callButton.setAttribute('data-call-status', 'idle');
                callButton.textContent = 'Audio Call';
            });

            socket.on('call_not_found', () => {
                console.log('Call not found');
            });

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

            messageForm.addEventListener('submit', function(event) {
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
                    const senderLabel = 'You'; // Assuming you always show the sender as 'You' for your own messages
                    const receiverLabel = receiverContact === userContact ? 'You' : receiverContact; // Update this as per your logic
                    messageDiv.innerHTML = `<strong>${senderLabel} : </strong>${message}`;
                    messagesDiv.appendChild(messageDiv);

                    messagesDiv.scrollTop = messagesDiv.scrollHeight;

                    messageInput.value = '';
                }
            });

            document.getElementById('connect-form').addEventListener('submit', function(event) {
                event.preventDefault();

                const connectContactInput = document.getElementById('receiver_contact');
                const connectContact = connectContactInput.value.trim();

                if (connectContact !== '') {
                    fetch(`/connect_user`, {
                            method: 'POST',
                            body: JSON.stringify({
                                receiver_contact: connectContact
                            })
                        })
                        .then(response => response.json())
                        .then(data => {
                            if (data.success) {
                                const connectedUsername = data.username;
                                connectedUsernameElement.textContent = connectedUsername;
                            } else {
                                console.log('Error connecting user');
                            }
                        })
                        .catch(error => {
                            console.error('Error connecting user:', error);
                        });
                }

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

                fetch(`/get_connection_history?receiver_contact=${receiverContact}`)
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

                // fetch('/get_connection_history')
                //     .then(response => response.json())
                //     .then(data => {
                //         const connectionListDiv = document.getElementById('user-connection-list');
                //         connectionListDiv.innerHTML = ''; // Clear existing content

                //         if (data.success) {
                //             data.connection_history.forEach(connection => {
                //                 const connectionItem = document.createElement('div');
                //                 connectionItem.innerHTML = `
                //                     <p><strong>User:</strong> ${connection.receiver_contact}</p>
                //                     <p><strong>Timestamp:</strong> ${connection.timestamp}</p>
                //                 `;
                //                 connectionListDiv.appendChild(connectionItem);
                //             });
                //         } else {
                //             console.log('Connection history not available');
                //         }
                //     })
                //     .catch(error => {
                //         console.error('Error fetching connection history:', error);
                //     });
            }

        } else {
            console.log('User contact not available');
        }
    });
});