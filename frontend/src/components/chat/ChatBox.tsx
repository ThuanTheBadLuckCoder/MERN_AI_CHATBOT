import { IconButton } from '@mui/material';
import Box from '@mui/material/Box'
import React, { RefObject } from 'react'
import ChatItem from './ChatItem';

type Message = {
    role: 'user' | 'assistant';
    content: string;
};

type ChatBoxProps = {
    chatMessages: Message[];
    chatBoxRef: React.RefObject<HTMLDivElement>;
    handleSubmit: () => void;
    handleDeleteChats: () => void;
    inputRef: React.MutableRefObject<HTMLInputElement | null>
    inputValue: string;
    handleInputChange: (event: React.ChangeEvent<HTMLInputElement>) => void;
    handleKeyPress: (event: React.KeyboardEvent<HTMLInputElement>) => void;
};


function ChatBox( {chatMessages, chatBoxRef, 
    handleSubmit, handleDeleteChats, inputRef,
    inputValue, handleInputChange, handleKeyPress }: ChatBoxProps,
 ) {
  return (
    <Box
            sx={{
                display: "flex !important", flexDirection: "column", flexWrap: "nowrap",
                alignItems: "center", width: "100%", height:  '100%'
            }}
            className="custom-scrollbar background-imgCustom"
        >
            
            <div className="history_input_chat">
            <Box sx={{width: '95%', height: '100%', display: 'flex',
                flexDirection: 'column', flexWrap: 'nowrap', justifyContent:'space-around',
                alignItems: 'center'
            }}>
                <Box sx={{
                    width: "100%",
                    height: "80%",
                    borderRadius: 3,
                    display: "flex",
                    flexDirection: "column",
                    overflow: "scroll",
                    overflowX: "hidden",
                    overflowY: "auto",
                    scrollBehavior: "smooth",
                }} ref={chatBoxRef} >
                    {chatMessages.map((chat, index) => (
                        //@ts-ignore
                        <ChatItem content={chat.content} role={chat.role} key={index} />
                    ))}
                </Box>
                <Box sx={{width: "100%", display: "flex", flexDirection: "row", gap: "10px"}}>
                    <div className="clearButton">
                        <button onClick={handleDeleteChats}>
                            <span className="deleteChatSpan">
                                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                                    <path d="M21 6.72998C20.98 6.72998 20.95 6.72998 20.92 6.72998C15.63 6.19998 10.35 5.99998 5.12 6.52998L3.08 6.72998C2.66 6.76998 2.29 6.46998 2.25 6.04998C2.21 5.62998 2.51 5.26998 2.92 5.22998L4.96 5.02998C10.28 4.48998 15.67 4.69998 21.07 5.22998C21.48 5.26998 21.78 5.63998 21.74 6.04998C21.71 6.43998 21.38 6.72998 21 6.72998Z" fill="#F22D3D" />
                                    <path d="M8.49999 5.72C8.45999 5.72 8.41999 5.72 8.36999 5.71C7.96999 5.64 7.68999 5.25 7.75999 4.85L7.97999 3.54C8.13999 2.58 8.35999 1.25 10.69 1.25H13.31C15.65 1.25 15.87 2.63 16.02 3.55L16.24 4.85C16.31 5.26 16.03 5.65 15.63 5.71C15.22 5.78 14.83 5.5 14.77 5.1L14.55 3.8C14.41 2.93 14.38 2.76 13.32 2.76H10.7C9.63999 2.76 9.61999 2.9 9.46999 3.79L9.23999 5.09C9.17999 5.46 8.85999 5.72 8.49999 5.72Z" fill="#F22D3D" />
                                    <path d="M15.21 22.75H8.79001C5.30001 22.75 5.16001 20.82 5.05001 19.26L4.40001 9.18995C4.37001 8.77995 4.69001 8.41995 5.10001 8.38995C5.52001 8.36995 5.87001 8.67995 5.90001 9.08995L6.55001 19.16C6.66001 20.68 6.70001 21.25 8.79001 21.25H15.21C17.31 21.25 17.35 20.68 17.45 19.16L18.1 9.08995C18.13 8.67995 18.49 8.36995 18.9 8.38995C19.31 8.41995 19.63 8.76995 19.6 9.18995L18.95 19.26C18.84 20.82 18.7 22.75 15.21 22.75Z" fill="#F22D3D" />
                                    <path d="M13.66 17.25H10.33C9.92 17.25 9.58 16.91 9.58 16.5C9.58 16.09 9.92 15.75 10.33 15.75H13.66C14.07 15.75 14.41 16.09 14.41 16.5C14.41 16.91 14.07 17.25 13.66 17.25Z" fill="#F22D3D" />
                                    <path d="M14.5 13.25H9.5C9.09 13.25 8.75 12.91 8.75 12.5C8.75 12.09 9.09 11.75 9.5 11.75H14.5C14.91 11.75 15.25 12.09 15.25 12.5C15.25 12.91 14.91 13.25 14.5 13.25Z" fill="#F22D3D" />
                                </svg>
                            </span>


                        </button>

                    </div>
                    <div
                        style={{
                            width: "100%",
                            borderRadius: "100px",
                            height: "52px",
                            border: "1px solid #515357",
                            display: "flex",
                            marginTop: "0px",
                            overflow: "hidden",
                            flexDirection: "row",
                            alignItems: "center",
                        }}
                    >
                        {""}
                        <input
                            ref={inputRef}
                            type="text"
                            value={inputValue}
                            onChange={handleInputChange}
                            onKeyDown={handleKeyPress}
                            style={{
                                width: "95%",
                                backgroundColor: "transparent",
                                paddingLeft: "20px",
                                paddingRight: "20px",
                                border: "none",
                                outline: "none",
                                color: "white",
                                fontSize: "20px",
                                height: "100%",
                            }}
                            placeholder="Type your question here..."
                        />
                        <IconButton onClick={handleSubmit} sx={{
                            color: "white", mx: 1,
                            backgroundColor: "#01F58C !important", width: "40px", height: "40px",
                            cursor: "pointer !important",
                        }} disabled={!inputValue.trim()}>
                            {/* <IoMdSend /> */}
                            <div className="containerSend">
                                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                                    <path d="M14.2209 21.63C13.0409 21.63 11.3709 20.8 10.0509 16.83L9.33086 14.67L7.17086 13.95C3.21086 12.63 2.38086 10.96 2.38086 9.78001C2.38086 8.61001 3.21086 6.93001 7.17086 5.60001L15.6609 2.77001C17.7809 2.06001 19.5509 2.27001 20.6409 3.35001C21.7309 4.43001 21.9409 6.21001 21.2309 8.33001L18.4009 16.82C17.0709 20.8 15.4009 21.63 14.2209 21.63ZM7.64086 7.03001C4.86086 7.96001 3.87086 9.06001 3.87086 9.78001C3.87086 10.5 4.86086 11.6 7.64086 12.52L10.1609 13.36C10.3809 13.43 10.5609 13.61 10.6309 13.83L11.4709 16.35C12.3909 19.13 13.5009 20.12 14.2209 20.12C14.9409 20.12 16.0409 19.13 16.9709 16.35L19.8009 7.86001C20.3109 6.32001 20.2209 5.06001 19.5709 4.41001C18.9209 3.76001 17.6609 3.68001 16.1309 4.19001L7.64086 7.03001Z" fill="#1D2025" />
                                    <path d="M10.1108 14.4C9.92078 14.4 9.73078 14.33 9.58078 14.18C9.29078 13.89 9.29078 13.41 9.58078 13.12L13.1608 9.53C13.4508 9.24 13.9308 9.24 14.2208 9.53C14.5108 9.82 14.5108 10.3 14.2208 10.59L10.6408 14.18C10.5008 14.33 10.3008 14.4 10.1108 14.4Z" fill="#1D2025" />
                                </svg>

                            </div>

                        </IconButton>
                    </div>

                </Box>
                
                </Box>

            </div>

        </Box>
    
  )
}

export default ChatBox