import React, { useEffect, useRef, useState } from 'react';
import ChatItem from './ChatItem';
import './styles/chat-component.css';
import QuestionInput from './QuestionInput';

type Message = {
    role: 'user' | 'assistant';
    content: string;
};

interface ChatBoxProps {
    chatMessages: Message[];
    chatBoxRef: React.RefObject<HTMLDivElement>;
    handleSubmit: () => Promise<void>;
    handleDeleteChats: () => Promise<void>;
    inputRef: React.RefObject<HTMLTextAreaElement>;
    inputValue: string;
    isLoading: boolean; // Add this prop
    handleInputChange: (event: React.ChangeEvent<HTMLTextAreaElement>) => void;
    handleKeyPress: (event: React.KeyboardEvent<HTMLTextAreaElement>) => void;
}

function ChatBox({
    chatMessages = [],
    chatBoxRef,
    handleSubmit,
    handleDeleteChats,
    inputRef,
    inputValue,
    handleInputChange,
    handleKeyPress,
}: ChatBoxProps) {
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
    const endOfMessagesRef = useRef<HTMLDivElement | null>(null);

    // Smooth scrolling to the latest message
    useEffect(() => {
        const scrollToEnd = () => {
            if (endOfMessagesRef.current) {
                // Using requestAnimationFrame for smoother animations
                requestAnimationFrame(() => {
                    endOfMessagesRef.current?.scrollIntoView({ behavior: 'smooth' });
                });
            }
        };

        // Ensure DOM rendering is complete
        const timer = setTimeout(scrollToEnd, 50); // Adjust delay as needed
        return () => clearTimeout(timer);
    }, [chatMessages]);

    const handleDeleteClick = () => setShowDeleteConfirm(true);

    const confirmDelete = () => {
        handleDeleteChats();
        setShowDeleteConfirm(false);
    };

    const cancelDelete = () => setShowDeleteConfirm(false);

    const adjustHeight = () => {
        if (inputRef.current) {
            inputRef.current.style.height = 'auto'; // Reset height
            inputRef.current.style.height = `${inputRef.current.scrollHeight}px`; // Match content
        }
    };

    useEffect(() => {
        adjustHeight();
    }, [inputValue]);

    return (
        <div id='chat-box' className="flex h-full overflow-hidden flex-col py-1 px-1 gap-2 justify-between">
            <div
                ref={chatBoxRef}
                id="chat-history"
                className="h-full overflow-auto px-2"
            >
                {chatMessages.map((chat, index) => (
                    <ChatItem content={chat.content} role={chat.role} key={index} />
                ))}
                {/* Scroll target */}
                <div ref={endOfMessagesRef} />
            </div>
            <div
                id="input-container"
                className="flex flex-col items-center justify-center mx-2 gap-1"
            >
                <QuestionInput
                    inputRef={inputRef}
                    inputValue={inputValue}
                    handleInputChange={handleInputChange}
                    handleKeyPress={handleKeyPress}
                    handleSubmit={handleSubmit}
                    handleDeleteClick={handleDeleteClick}
                />
                
            </div>

            {/* Delete Confirmation Modal */}
            {showDeleteConfirm && (
                <div className="absolute inset-0 flex items-center justify-center bg-opacity-50 bg-black transition-opacity">
                    <div className="bg-zinc-950 border-2 shadow border-red-700 p-5 rounded-md shadow-lg flex flex-col gap-3 w-96 transition-transform transform scale-100">
                        <div className="grid grid-cols-1 divide-y gap-1.5">
                            <h1 className="text-lg font-bold">Delete All Messages?</h1>
                            <span>
                                This action will permanently remove both{' '}
                                <i>short-term</i> and <i>long-term</i> memories stored by
                                Codfe.
                            </span>
                        </div>
                        <div className="flex gap-3 self-end flex-row-reverse">
                            <button
                                onClick={confirmDelete}
                                className="px-4 py-2 border border-red-950 bg-red-700 text-white rounded-full hover:bg-red-600"
                            >
                                Confirm
                            </button>
                            <button
                                onClick={cancelDelete}
                                className="px-4 py-2 bg-gray-600 border rounded-full hover:bg-gray-400"
                            >
                                Cancel
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

export default ChatBox;
