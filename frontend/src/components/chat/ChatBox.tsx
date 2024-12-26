import React, { useEffect, useRef } from 'react';
import { IconButton } from '@mui/material';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import SendIcon from '@mui/icons-material/Send';
import ChatItem from './ChatItem';
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
    const endOfMessagesRef = useRef<HTMLDivElement | null>(null);

    useEffect(() => {
        if (endOfMessagesRef.current) {
            endOfMessagesRef.current.scrollIntoView({ behavior: 'smooth' });
        }
    }, [chatMessages]);

    return (
        <div className='h-full overflow-y-auto'>
            <div ref={chatBoxRef} id="chat-history" className="h-96 overflow-y-auto p-1">
                {chatMessages.map((chat, index) => (
                    <ChatItem content={chat.content} role={chat.role} key={index} />
                ))}
                {/* Add an empty div to act as the scrolling target */}
                <div ref={endOfMessagesRef} />
            </div>
            <div id="input-question" className="h-20 absolute bottom-0 left-0 right-0 py-2 w-full flex flex-row gap-2 flex flex-row	">
                <div className='flex flex-row justify-center size-10 items-center border border-red-500 rounded-md'>
                    <button onClick={handleDeleteChats}>
                        <DeleteOutlineIcon className='text-red-500' />
                    </button>
                </div>
                <div className="flex items-center gap-2 w-full">
                    <div className='mt-2 w-full'>
                        <div className="flex items-center rounded-md bg-inherit pl-3 outline outline-1 -outline-offset-1 outline-gray-300 has-[input:focus-within]:outline has-[input:focus-within]:outline-2 has-[input:focus-within]:-outline-offset-2 has-[input:focus-within]:outline-indigo-600">
                        <input
                        ref={inputRef}
                        type="text"
                        value={inputValue}
                        onChange={handleInputChange}
                        onKeyDown={handleKeyPress}
                        placeholder="Type your question here..."
                        className="block min-w-0 grow py-1.5 pl-1 pr-3 text-base text-gray-900 placeholder:text-gray-400 focus:outline focus:outline-0 sm:text-sm/6 bg-inherit" />
                        </div>

                    </div>
                    
                    <button onClick={handleSubmit} disabled={!inputValue.trim()}>
                        <SendIcon />
                    </button>
                </div>
            </div>
        </div>
    );
}

export default ChatBox;
