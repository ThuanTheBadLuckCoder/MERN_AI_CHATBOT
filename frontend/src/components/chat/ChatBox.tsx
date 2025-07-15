import { Message } from '../../types/chat';
import ReferenceDisplay from './ReferenceDisplay';
import React, { useEffect, useRef, useState } from 'react';
import './styles/chat-component.css';
import QuestionInput from './QuestionInput';
import logo from '../../../public/codfe_logo.svg'
import CircleIcon from '@mui/icons-material/Circle';
import ChatItem from './ChatItem';

// type Message = {
//     role: 'user' | 'assistant';
//     content: string;
//     id?: string;
// };

interface ChatBoxProps {
    chatMessages: Message[];
    chatBoxRef: React.RefObject<HTMLDivElement>;
    handleSubmit: () => Promise<void>;
    handleDeleteChats: () => Promise<void>;
    inputRef: React.RefObject<HTMLTextAreaElement>;
    inputValue: string;
    isLoading: boolean;
    handleInputChange: (event: React.ChangeEvent<HTMLTextAreaElement>) => void;
    handleKeyPress: (event: React.KeyboardEvent<HTMLTextAreaElement>) => void;
}

function ChatBox({
    chatMessages,
    chatBoxRef,
    handleSubmit,
    handleDeleteChats,
    inputRef,
    inputValue,
    handleInputChange,
    handleKeyPress,
    isLoading,
}: ChatBoxProps) {
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
    const endOfMessagesRef = useRef<HTMLDivElement | null>(null);
    const [dotCount, setDotCount] = useState(0);
    // isLoading = true;
    
    // Animate the dots when loading
    useEffect(() => {
        let interval: NodeJS.Timeout;
        
        if (isLoading) {
            interval = setInterval(() => {
                setDotCount((prev) => (prev + 1) % 4); // Cycles through 0, 1, 2, 3
            }, 500); // Change dots every 500ms for a gentle rhythm
        }
        
        return () => {
            if (interval) clearInterval(interval);
        };
    }, [isLoading]);

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
    }, [chatMessages, isLoading, dotCount]); // Also scroll when loading state or dots change

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

    // Generate the bouncing dots
    const renderDots = () => {
        // Create dots with staggered animation delay
        return Array(3).fill(null).map((_, index) => (
            <div 
                key={index} 
                className=""
                style={{
                    animation: 'bounce 0.8s infinite',
                    animationDelay: `${index * 0.15}s`, // Stagger the animation
                    position: 'relative',
                    display: 'inline-block'
                }}
            >
                <CircleIcon sx={{ fontSize: 10 }} />
            </div>
        ));
    };

    return (
        <div id='chat-box' className="flex h-full overflow-hidden flex-col py-1 px-1 gap-2 justify-between">
            {/* Add bounce animation keyframes */}
            <style>{`
                @keyframes bounce {
                    0%, 100% {
                        transform: translateY(0);
                    }
                    50% {
                        transform: translateY(-10px);
                    }
                }
            `}</style>
            
            <div
                ref={chatBoxRef}
                id="chat-history"
                className="h-full overflow-auto px-2"
            >

                {/* 
                {chatMessages.map((chat, index) => (
                    <ChatItem content={chat.content} role={chat.role} key={index} />
                ))}
                */}
                {chatMessages.map((message, index) => (
                    <div key={index} className="message-container">
                        {/* Your existing message rendering */}
                        <ChatItem content={message.content} role={message.role} key={index} />

                        {/* Add references display for assistant messages */}
                        {message.role === 'assistant' && message.references && message.references.length > 0 && (
                            <ReferenceDisplay
                                references={message.references}
                                className="mt-4"
                            />
                        )}
                    </div>
                ))}
                
                {/* Loading indicator with bouncing dots */}
                {isLoading && (
                    <div className="py-4 pl-2 pr-4 w-full">
                        <div className='flex items-center gap-4'>
                            <div className="size-8 rounded-full overflow-hidden avatar-size">
                                <img src={logo} className='size-full'/>
                            </div>
                            <div>
                                <p className="flex items-center font-mono font-bold text-lg gap-1.5">
                                    Codfe is thinking to give the best answer
                                    <span className="flex gap-0.5 flex-row flex-wrap">
                                        {renderDots()}
                                    </span>
                                </p>
                            </div>
                        </div>
                    </div>
                )}
                
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