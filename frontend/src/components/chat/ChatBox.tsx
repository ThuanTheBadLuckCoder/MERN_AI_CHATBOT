import React, { useEffect, useRef } from 'react';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import ChatItem from './ChatItem';
import KeyboardArrowUpIcon from '@mui/icons-material/KeyboardArrowUp';
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
            <div id="input-question" className="flex flex-col w-full gap-1.5">
            
                <div className="flex w-full gap-1.5">
                    <div className='w-12 flex h-12 flex-row	flex-nowrap	justify-center border-red-500 border rounded-md hover:bg-red-300'>
                        <button onClick={handleDeleteChats} className='size-full'>
                            <DeleteOutlineIcon className='text-red-500' sx={{ fontSize: 24 }} />
                        </button>
                    </div>
                    <div className="flex w-full gap-1.5">
                        <input
                            ref={inputRef}
                            type="text"
                            value={inputValue}
                            onChange={handleInputChange}
                            onKeyDown={handleKeyPress}
                            placeholder="Type your question here..."
                            className="flex w-full items-center rounded-md bg-inherit pl-3 outline outline-1 -outline-offset-1 outline-green-900 focus-within:outline focus-within:outline-1 focus-within:-outline-offset-1 focus-within:outline-green-600" />

                        <button onClick={handleSubmit} disabled={!inputValue.trim()} className='disabled:cursor-not-allowed size-12 bg-green-900 border border-green-800 rounded-md'>
                            <KeyboardArrowUpIcon />
                        </button>

                    </div>
                </div>
                
            </div>

        </div>
    );
}

export default ChatBox;
