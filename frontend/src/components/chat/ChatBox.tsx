import React, { useEffect, useRef } from 'react';
import { IconButton } from '@mui/material';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import SendIcon from '@mui/icons-material/Send';
import ChatItem from './ChatItem';
import ErrorOutlineIcon from '@mui/icons-material/ErrorOutline';
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
        <div className='flex h-full flex-col p-1 gap-2.5 justify-between'>
            <div ref={chatBoxRef} id="chat-history" className="h-95percent overflow-y-auto">
                {chatMessages.map((chat, index) => (
                    <ChatItem content={chat.content} role={chat.role} key={index} />
                ))}
                {/* Add an empty div to act as the scrolling target */}
                <div ref={endOfMessagesRef} />
            </div>
            <div id="input-question" className="flex flex-col w-full gap-0.5">
                <div className="flex w-full gap-2.5">
                <div className='w-12 flex h-12 flex-row	flex-nowrap	justify-center border-red-500 border rounded-md hover:bg-red-300'>
                    <button onClick={handleDeleteChats} className='size-full'>
                        <DeleteOutlineIcon className='text-red-500' sx={{fontSize: 24}} />
                    </button>
                </div>
                <div className="flex w-full border border-green-500 rounded-md overflow-hidden px-4 gap-1.5">
                    <div className='flex w-full h-full'>
                        <input
                        ref={inputRef}
                        type="text"
                        value={inputValue}
                        onChange={handleInputChange}
                        onKeyDown={handleKeyPress}
                        placeholder="Type your question here..."
                        className="block min-w-0 grow py-1.5 text-base text-gray-900 placeholder:text-gray-400 focus:outline focus:outline-0 bg-inherit font-sans" />
                    </div>
                    
                    <button onClick={handleSubmit} disabled={!inputValue.trim()}>
                        <SendIcon />
                    </button>
                </div>
                </div>
                <div className='flex gap-1.5 items-center w-full'>
                    <ErrorOutlineIcon sx={{ fontSize: 14 }}/>
                    <p className='font-sans text-xs text-gray-500'>Codfe can make mistakes. Check important info.</p>

                </div>
            </div>
            
        </div>
    );
}

export default ChatBox;
