import React, { useState, useEffect, useRef, useCallback } from 'react';
import { initializeApp } from 'firebase/app';
import { getAuth, signInAnonymously, signInWithCustomToken, onAuthStateChanged } from 'firebase/auth';
import { getFirestore, collection, addDoc, onSnapshot, query, serverTimestamp, doc, deleteDoc, updateDoc, setDoc } from 'firebase/firestore';

// Debounce function
const debounce = (func, delay) => {
    let timeout;
    return function(...args) {
        const context = this;
        clearTimeout(timeout);
        timeout = setTimeout(() => func.apply(context, args), delay);
    };
};

// Message Component
const Message = ({ msg, userId, formatTimestamp, onEdit, onDelete }) => {
    // Defensive check: Ensure msg object and its required properties exist
    if (!msg || typeof msg.senderId === 'undefined' || typeof msg.messageText === 'undefined' || typeof msg.id === 'undefined') {
        console.error("Invalid message object received by Message component:", msg);
        return null; // Don't render malformed messages
    }

    const isCurrentUser = msg.senderId === userId;

    return (
        <div className={`flex ${isCurrentUser ? 'justify-end' : 'justify-start'}`}>
            <div
                className={`max-w-[70%] p-3 rounded-lg shadow-md relative ${
                    isCurrentUser
                        ? 'bg-blue-600 text-white rounded-br-none'
                        : 'bg-gray-600 text-white rounded-bl-none'
                }`}
            >
                <div className="font-semibold text-xs opacity-80 mb-1">
                    {isCurrentUser ? 'You' : (msg.senderNickname || msg.senderId)}
                </div>
                <p className="text-sm break-words">{msg.messageText}</p>
                <div className="text-right text-xs mt-1 opacity-70">
                    {formatTimestamp(msg.timestamp)}
                    {msg.editedAt && <span className="ml-2 italic">(edited)</span>}
                </div>
                {isCurrentUser && (
                    <div className="absolute -top-1 -right-1 flex gap-1">
                        <button
                            onClick={() => onEdit(msg)}
                            className="bg-yellow-500 text-white rounded-full w-5 h-5 flex items-center justify-center text-xs opacity-80 hover:opacity-100 transition-opacity"
                            title="Edit message"
                        >
                            &#9998; {/* Pencil emoji for edit */}
                        </button>
                        <button
                            onClick={() => onDelete(msg.id)}
                            className="bg-red-500 text-white rounded-full w-5 h-5 flex items-center justify-center text-xs opacity-80 hover:opacity-100 transition-opacity"
                            title="Delete message"
                        >
                            &times;
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
};

// EmojiPicker Component
const EmojiPicker = ({ onSelectEmoji, emojiPickerRef }) => {
    const emojis = ['😊', '😂', '❤️', '👍', '🙏', '🔥', '🎉', '💡', '🚀', '✨'];
    return (
        <div
            ref={emojiPickerRef}
            className="absolute bottom-full left-4 mb-2 p-2 bg-gray-700 rounded-lg shadow-lg flex flex-wrap gap-1 max-w-xs z-10"
        >
            {emojis.map((emoji, index) => (
                <button
                    key={index}
                    type="button"
                    onClick={() => onSelectEmoji(emoji)}
                    className="p-1 text-xl hover:bg-gray-600 rounded-md transition-colors"
                >
                    {emoji}
                </button>
            ))}
        </div>
    );
};

// Firebase Initialization and Instance Getters (inlined)
let firebaseAppInstance;
let firestoreDbInstance;
let firebaseAuthInstance;

const initializeFirebaseAndGetInstances = async () => {
    try {
        // Retrieve Firebase config from environment variables
        // These variables are typically loaded from a .env file in your project root
        // and prefixed with REACT_APP_ (for Create React App) or VITE_ (for Vite)
        const firebaseConfig = {
            apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
            authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
            projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
            storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
            messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
            appId: import.meta.env.VITE_FIREBASE_APP_ID,
            measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID, // Optional
        };

        // Validate if essential config values are present
        if (!firebaseConfig.apiKey || !firebaseConfig.authDomain || !firebaseConfig.projectId || !firebaseConfig.appId) {
            const setupError = new Error("Firebase configuration missing. Ensure your .env file is correctly set up with REACT_APP_FIREBASE_... variables and your development server is restarted.");
            console.error(setupError.message, firebaseConfig);
            throw setupError;
        }

        console.log("Attempting to initialize Firebase with config:", firebaseConfig);

        if (!firebaseAppInstance) { // Initialize only once
            firebaseAppInstance = initializeApp(firebaseConfig);
            firestoreDbInstance = getFirestore(firebaseAppInstance);
            firebaseAuthInstance = getAuth(firebaseAppInstance);
        }

        // Always sign in anonymously for local development if no specific auth is implemented
        await signInAnonymously(firebaseAuthInstance);
        console.log('Signed in anonymously for local development.');

        return { db: firestoreDbInstance, auth: firebaseAuthInstance };
    } catch (error) {
        console.error("Failed to initialize Firebase:", error);
        throw new Error("Firebase initialization failed.");
    }
};

const getAppId = () => {
    // Get the projectId from environment variables to use as the appId
    return import.meta.env.VITE_FIREBASE_PROJECT_ID || 'default-app-id-for-local';
};


const App = () => {
    // State variables
    const [messages, setMessages] = useState([]);
    const [newMessage, setNewMessage] = useState('');
    const [userId, setUserId] = useState(null);
    const [nickname, setNickname] = useState(localStorage.getItem('chatNickname') || '');
    const [db, setDb] = useState(null);
    const [auth, setAuth] = useState(null);
    const [isAuthReady, setIsAuthReady] = useState(false);
    const [isLoadingMessages, setIsLoadingMessages] = useState(true);
    const [errorMessage, setErrorMessage] = useState('');
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
    const [messageToDelete, setMessageToDelete] = useState(null);
    const [editingMessageId, setEditingMessageId] = useState(null);
    const [typingUsers, setTypingUsers] = useState({});
    const [showEmojiPicker, setShowEmojiPicker] = useState(false);

    // Refs
    const messagesEndRef = useRef(null);
    const emojiButtonRef = useRef(null);
    const emojiPickerRef = useRef(null);

    // Load nickname from local storage on mount
    useEffect(() => {
        const storedNickname = localStorage.getItem('chatNickname');
        if (storedNickname) {
            setNickname(storedNickname);
        }
    }, []);

    // Save nickname to local storage whenever it changes
    useEffect(() => {
        localStorage.setItem('chatNickname', nickname);
    }, [nickname]);

    // Initialize Firebase and set up authentication and real-time listeners
    useEffect(() => {
        let unsubscribeMessagesSnapshot = () => {};
        let unsubscribeTypingSnapshot = () => {};
        let unsubscribeAuth = () => {};

        const setupFirebaseAndListeners = async () => {
            try {
                const { db: firestoreDb, auth: firebaseAuth } = await initializeFirebaseAndGetInstances();
                setDb(firestoreDb);
                setAuth(firebaseAuth);

                unsubscribeAuth = onAuthStateChanged(firebaseAuth, (user) => {
                    if (user) {
                        setUserId(user.uid);
                        setIsAuthReady(true);
                        setIsLoadingMessages(true);

                        const appId = getAppId();

                        // Set up Firestore listener for messages
                        const messagesCollectionRef = collection(firestoreDb, `artifacts/${appId}/public/data/messages`);
                        const qMessages = query(messagesCollectionRef);

                        unsubscribeMessagesSnapshot = onSnapshot(qMessages, (snapshot) => {
                            const fetchedMessages = snapshot.docs.map(doc => ({
                                id: doc.id,
                                ...doc.data()
                            }));
                            const sortedMessages = fetchedMessages.sort((a, b) => {
                                const timeA = a.timestamp?.toDate ? a.timestamp.toDate().getTime() : 0;
                                const timeB = b.timestamp?.toDate ? b.timestamp.toDate().getTime() : 0;
                                return timeA - timeB;
                            });
                            setMessages(sortedMessages);
                            setIsLoadingMessages(false);
                        }, (error) => {
                            console.error("Error fetching messages:", error);
                            setErrorMessage('Failed to load messages. Please refresh.');
                            setIsLoadingMessages(false);
                        });

                        // Set up Firestore listener for typing status
                        const typingStatusCollectionRef = collection(firestoreDb, `artifacts/${appId}/public/data/typingStatus`);
                        const qTyping = query(typingStatusCollectionRef);

                        unsubscribeTypingSnapshot = onSnapshot(qTyping, (snapshot) => {
                            const currentTypingUsers = {};
                            snapshot.docs.forEach(doc => {
                                const data = doc.data();
                                if (data.isTyping && data.timestamp && (Date.now() - data.timestamp.toDate().getTime() < 2000)) {
                                    if (doc.id !== user.uid) {
                                        currentTypingUsers[doc.id] = data.nickname || doc.id;
                                    }
                                }
                            });
                            setTypingUsers(currentTypingUsers);
                        }, (error) => {
                            console.error("Error fetching typing status:", error);
                        });

                    } else {
                        setUserId(null);
                        setIsAuthReady(true);
                        setMessages([]);
                        setTypingUsers({});
                        unsubscribeMessagesSnapshot();
                        unsubscribeTypingSnapshot();
                        setIsLoadingMessages(false);
                    }
                });

            } catch (error) {
                console.error("Firebase setup failed:", error);
                // The error message is already set by initializeFirebaseAndGetInstances if it's a config issue
                if (!errorMessage) { // Only set if not already set by config check
                    setErrorMessage('Failed to initialize chat. Check console for details.');
                }
                setIsAuthReady(true); // Mark auth as ready even if failed, to stop loading state
                setIsLoadingMessages(false);
            }
        };

        setupFirebaseAndListeners();

        // Cleanup function for all listeners
        return () => {
            unsubscribeAuth();
            unsubscribeMessagesSnapshot();
            unsubscribeTypingSnapshot();
        };
    }, [errorMessage]);

    // Scroll to the latest message whenever messages update
    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages]);

    // Handle clicks outside the emoji picker to close it
    useEffect(() => {
        const handleClickOutside = (event) => {
            if (emojiPickerRef.current && !emojiPickerRef.current.contains(event.target) &&
                emojiButtonRef.current && !emojiButtonRef.current.contains(event.target)) {
                setShowEmojiPicker(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, []);

    // Function to update typing status in Firestore
    const updateTypingStatus = useCallback(debounce(async (isTyping) => {
        if (!db || !userId || !nickname) return;
        const appId = getAppId();
        const typingRef = doc(db, `artifacts/${appId}/public/data/typingStatus`, userId);
        try {
            await setDoc(typingRef, {
                isTyping: isTyping,
                nickname: nickname,
                timestamp: serverTimestamp()
            });
        } catch (error) {
            console.error("Error updating typing status:", error);
        }
    }, 500), [db, userId, nickname]);

    // Handle message input change for typing indicator
    const handleMessageInputChange = (e) => {
        setNewMessage(e.target.value);
        if (userId && nickname) {
            updateTypingStatus(e.target.value.length > 0);
        }
    };

    // Handle sending a new message or saving an edited message
    const handleSendMessage = async (e) => {
        e.preventDefault();
        if (newMessage.trim() === '' || !userId || !db) {
            console.warn('Cannot send empty message or user not authenticated/db not ready.');
            setErrorMessage('Please type a message and ensure you are signed in.');
            return;
        }
        if (nickname.trim() === '') {
            setErrorMessage('Please set your nickname before sending messages.');
            return;
        }

        const appId = getAppId();
        try {
            if (editingMessageId) {
                const messageRef = doc(db, `artifacts/${appId}/public/data/messages`, editingMessageId);
                await updateDoc(messageRef, {
                    messageText: newMessage,
                    editedAt: serverTimestamp()
                });
                setEditingMessageId(null);
            } else {
                await addDoc(collection(db, `artifacts/${appId}/public/data/messages`), {
                    senderId: userId,
                    senderNickname: nickname,
                    messageText: newMessage,
                    timestamp: serverTimestamp(),
                });
            }
            setNewMessage('');
            setErrorMessage('');
            updateTypingStatus(false);
        } catch (error) {
            console.error('Error sending message:', error);
            setErrorMessage('Failed to send message. Please try again.');
        }
    };

    // Prepare for message deletion
    const confirmDelete = (messageId) => {
        setMessageToDelete(messageId);
        setShowDeleteConfirm(true);
    };

    // Handle message deletion
    const handleDeleteMessage = async () => {
        if (!messageToDelete || !db || !userId) {
            console.warn('Cannot delete message: ID missing, DB not ready, or user not authenticated.');
            return;
        }

        const appId = getAppId();
        try {
            const messageRef = doc(db, `artifacts/${appId}/public/data/messages`, messageToDelete);
            await deleteDoc(messageRef);
            setErrorMessage('');
        } catch (error) {
            console.error('Error deleting message:', error);
            setErrorMessage('Failed to delete message. You can only delete your own messages.');
        } finally {
            setShowDeleteConfirm(false);
            setMessageToDelete(null);
        }
    };

    // Start editing a message
    const handleEditMessage = (message) => {
        setEditingMessageId(message.id);
        setNewMessage(message.messageText);
    };

    // Cancel message editing
    const handleCancelEdit = () => {
        setEditingMessageId(null);
        setNewMessage('');
    };

    // Function to format timestamp
    const formatTimestamp = (timestamp) => {
        if (!timestamp?.toDate) return 'Sending...';
        const date = timestamp.toDate();
        return date.toLocaleDateString() + ' ' + date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    };

    // Get names of users currently typing
    const typingUserNames = Object.values(typingUsers).join(', ');

    // Function to insert emoji into message input
    const insertEmoji = (emoji) => {
        setNewMessage((prevMsg) => prevMsg + emoji);
        setShowEmojiPicker(false);
        if (userId && nickname) {
            updateTypingStatus(true);
        }
    };

    return (
        <div className="min-h-screen bg-gray-900 flex items-center justify-center p-4 font-inter">
            <div className="w-full max-w-2xl bg-gray-800 rounded-xl shadow-2xl overflow-hidden flex flex-col h-[90vh]">
                {/* Chat Header */}
                <div className="bg-gray-700 text-white p-4 rounded-t-xl shadow-md">
                    <h1 className="text-2xl font-bold text-center">VibeChat</h1>
                    {userId && (
                        <p className="text-sm text-center mt-1 opacity-90">
                            Your User ID: <span className="font-mono bg-gray-600 px-2 py-0.5 rounded-md">{userId}</span>
                        </p>
                    )}
                </div>

                {/* Nickname Input */}
                <div className="p-3 bg-gray-700 border-b border-gray-600 flex items-center gap-2">
                    <label htmlFor="nickname" className="text-sm text-gray-300 font-medium">Nickname:</label>
                    <input
                        id="nickname"
                        type="text"
                        value={nickname}
                        onChange={(e) => setNickname(e.target.value)}
                        placeholder="Set your nickname"
                        className="flex-1 p-2 border border-gray-600 rounded-md text-sm bg-gray-800 text-white focus:outline-none focus:ring-1 focus:ring-blue-400"
                        maxLength="20"
                    />
                </div>

                {/* Error Message Display */}
                {errorMessage && (
                    <div className="bg-red-900 border border-red-700 text-red-300 px-4 py-2 rounded-md m-3 text-sm" role="alert">
                        {errorMessage}
                    </div>
                )}

                {/* Messages Display Area */}
                <div className="flex-1 p-4 overflow-y-auto space-y-3 custom-scrollbar">
                    {isLoadingMessages ? (
                        <div className="text-center text-gray-400 mt-10">Loading messages...</div>
                    ) : messages.length === 0 ? (
                        <div className="text-center text-gray-400 mt-10">No messages yet. Start the conversation!</div>
                    ) : (
                        messages.map((msg) => (
                            <Message
                                key={msg.id}
                                msg={msg}
                                userId={userId}
                                formatTimestamp={formatTimestamp}
                                onEdit={handleEditMessage}
                                onDelete={confirmDelete}
                            />
                        ))
                    )}
                    <div ref={messagesEndRef} />
                </div>

                {/* Typing Indicator */}
                {Object.keys(typingUsers).length > 0 && (
                    <div className="p-2 text-gray-400 text-sm text-center">
                        {typingUserNames} {Object.keys(typingUsers).length > 1 ? 'are' : 'is'} typing...
                    </div>
                )}

                {/* Message Input Form */}
                <form onSubmit={handleSendMessage} className="p-4 bg-gray-700 border-t border-gray-600 rounded-b-xl flex items-center gap-3 relative">
                    <button
                        type="button"
                        ref={emojiButtonRef}
                        onClick={() => setShowEmojiPicker(!showEmojiPicker)}
                        className="p-2 text-2xl bg-gray-600 hover:bg-gray-500 rounded-lg transition-colors duration-200"
                        title="Insert emoji"
                    >
                        😀
                    </button>

                    {showEmojiPicker && (
                        <EmojiPicker onSelectEmoji={insertEmoji} emojiPickerRef={emojiPickerRef} />
                    )}

                    <input
                        type="text"
                        value={newMessage}
                        onChange={handleMessageInputChange}
                        placeholder={editingMessageId ? "Edit your message..." : "Type your message here..."}
                        className="flex-1 p-3 border border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-400 transition duration-200 bg-gray-800 text-white"
                        disabled={!userId || !nickname.trim()}
                    />
                    {editingMessageId && (
                        <button
                            type="button"
                            onClick={handleCancelEdit}
                            className="bg-gray-500 hover:bg-gray-600 text-white font-bold py-3 px-5 rounded-lg shadow-md transition duration-300 ease-in-out transform hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            Cancel
                        </button>
                    )}
                    <button
                        type="submit"
                        className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-5 rounded-lg shadow-md transition duration-300 ease-in-out transform hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed"
                        disabled={!userId || newMessage.trim() === '' || !nickname.trim()}
                    >
                        {editingMessageId ? 'Save Edit' : 'Send'}
                    </button>
                </form>

                {/* Delete Confirmation Modal */}
                {showDeleteConfirm && (
                    <div className="fixed inset-0 bg-black bg-opacity-70 flex items-center justify-center z-50">
                        <div className="bg-gray-800 p-6 rounded-lg shadow-xl max-w-sm w-full text-white text-center">
                            <h3 className="text-lg font-semibold mb-4">Confirm Deletion</h3>
                            <p className="mb-6">Are you sure you want to delete this message?</p>
                            <div className="flex justify-center gap-4">
                                <button
                                    onClick={() => setShowDeleteConfirm(false)}
                                    className="px-5 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700 transition"
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={handleDeleteMessage}
                                    className="px-5 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 transition"
                                >
                                    Delete
                                </button>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default App;
                
