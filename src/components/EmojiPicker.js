// src/components/EmojiPicker.js
import React from 'react';

const emojis = ['😊', '😂', '❤️', '👍', '🙏', '🔥', '🎉', '💡', '🚀', '✨'];

const EmojiPicker = ({ onSelectEmoji, emojiPickerRef }) => {
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

export default EmojiPicker;