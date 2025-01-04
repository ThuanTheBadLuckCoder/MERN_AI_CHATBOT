import React, { useEffect, useRef, useState } from 'react';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import ChatItem from './ChatItem';
import TelegramIcon from '@mui/icons-material/Telegram';
import ChatBubbleOutlineRoundedIcon from '@mui/icons-material/ChatBubbleOutlineRounded';
import CodeIcon from '@mui/icons-material/Code';
import CodeOffIcon from '@mui/icons-material/CodeOff';
import './styles/chat-component.css';

type Message = {
    role: 'user' | 'assistant';
    content: string;
};

type ChatBoxProps = {
    chatMessages: Message[];
    chatBoxRef: React.RefObject<HTMLDivElement>;
    handleSubmit: () => void;
    handleDeleteChats: () => void;
    inputRef: React.MutableRefObject<HTMLInputElement | null>;
    inputValue: string;
    handleInputChange: (event: React.ChangeEvent<HTMLInputElement>) => void;
    handleKeyPress: (event: React.KeyboardEvent<HTMLInputElement>) => void;
};

function ChatBox({
    chatMessages,
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

    useEffect(() => {
        if (endOfMessagesRef.current) {
            endOfMessagesRef.current.scrollIntoView({ behavior: 'smooth' });
        }
    }, [chatMessages]);

    const handleDeleteClick = () => {
        setShowDeleteConfirm(true);
    };

    const confirmDelete = () => {
        handleDeleteChats();
        setShowDeleteConfirm(false);
    };

    const cancelDelete = () => {
        setShowDeleteConfirm(false);
    };

    return (
        <div className='flex h-full flex-col p-1 gap-2.5 justify-between'>
            <div ref={chatBoxRef} id="chat-history" className="h-95percent overflow-y-auto">
                {chatMessages.map((chat, index) => (
                    <ChatItem content={chat.content} role={chat.role} key={index} />
                ))}
                {/* Add an empty div to act as the scrolling target */}
                <div ref={endOfMessagesRef} />
            </div>
            <div id="input-question" className="flex flex-col w-full gap-1.5 px-2">
                <div className="flex w-full gap-1.5 items-center justify-center">
                    <div className="flex w-full gap-1.5 p-2 flex w-full rounded-full bg-inherit outline outline-1 -outline-offset-1 outline-green-900 focus-within:outline focus-within:outline-1 focus-within:-outline-offset-1 focus-within:outline-green-600">
                        <input
                            ref={inputRef}
                            type="text"
                            value={inputValue}
                            onChange={handleInputChange}
                            onKeyDown={handleKeyPress}
                            placeholder="Type your question here..."
                            className="flex w-full text-lg items-center rounded-full bg-inherit pl-3 outline outline-0 -outline-offset-0 outline-inherit focus-within:outline focus-within:outline-0 focus-within:-outline-offset-0 focus-within:outline-inherit-600" />

                        <button onClick={handleSubmit} disabled={!inputValue.trim()} className='flex flex-col items-center justify-center rounded-full size-8 w-8 disabled:cursor-not-allowed disabled:opacity-75 bg-green-900 border border-green-800'>
                            <CodeIcon sx={{ fontSize: 20 }} />
                        </button>
                    </div>
                    <div className='flex size-10 flex-row flex-nowrap justify-center border-red-500 rounded-full hover:bg-red-100'>
                        <button onClick={handleDeleteClick} className='size-full'>
                            <CodeOffIcon className='text-red-500' sx={{ fontSize: 24 }} />
                        </button>
                    </div>
                </div>
            </div>

            {showDeleteConfirm && (
                <div className="absolute inset-0 flex items-center justify-center">
                    <div className="bg-zinc-950 border-2 shadow border-red-700 p-5 rounded-md shadow-lg flex flex-col gap-3 w-96">
                        <div className='grid grid-cols-1 divide-y gap-1.5'>
                            <h1 className="text-lg font-bold">Delete All Messages?</h1>
                            <span>This action will permanently remove both <i>short-term</i> and <i>long-term</i> memories stored by Codfe.</span>
                        </div>
                        <div className="flex gap-3 self-end flex-row-reverse">
                            <button onClick={confirmDelete} className="px-4 py-2 border border-red-950 bg-red-700 text-white rounded-full hover:bg-red-600">
                                Confirm
                            </button>
                            <button onClick={cancelDelete} className="px-4 py-2 bg-gray-600 border rounded-full hover:bg-gray-400">
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
