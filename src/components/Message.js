// src/components/Message.js
import React from 'react';

const Message = ({ msg, userId, formatTimestamp, onEdit, onDelete }) => {
    // Defensive check: Ensure msg object and its required properties exist
    if (!msg || typeof msg.senderId === 'undefined' || typeof msg.messageText === 'undefined' || typeof msg.id === 'undefined') {
        console.error("Invalid message object received by Message component:", msg);
        // Return null to prevent rendering an invalid message, which can cause further errors.
        // This will effectively skip rendering any malformed messages.
        return null;
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

export default Message;
