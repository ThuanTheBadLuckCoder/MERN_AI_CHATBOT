import React, { RefObject } from 'react';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import IconButton from '@mui/material/IconButton';
import SendIcon from '@mui/icons-material/Send';

// Define types for props
interface InputChatControlsProps {
  handleDeleteChats: () => void;
}

interface InputChatFieldProps {
  inputRef: RefObject<HTMLInputElement>;
  inputValue: string;
  handleInputChange: (event: React.ChangeEvent<HTMLInputElement>) => void;
  handleKeyPress: (event: React.KeyboardEvent<HTMLInputElement>) => void;
  handleSubmit: () => void;
}

interface InputChatProps extends InputChatFieldProps, InputChatControlsProps {}

const InputChatControls: React.FC<InputChatControlsProps> = ({ handleDeleteChats }) => {
  return (
    <div>
      <button onClick={handleDeleteChats}>
        <DeleteOutlineIcon />
      </button>
    </div>
  );
};

const InputChatField: React.FC<InputChatFieldProps> = ({
  inputRef,
  inputValue,
  handleInputChange,
  handleKeyPress,
  handleSubmit,
}) => {
  return (
    <div className="flex items-center gap-2">
      <input
        ref={inputRef}
        type="text"
        value={inputValue}
        onChange={handleInputChange}
        onKeyDown={handleKeyPress}
        placeholder="Type your question here..."
        className="flex-grow p-2 border border-gray-300 rounded"
      />
      <IconButton onClick={handleSubmit} disabled={!inputValue.trim()}>
        <SendIcon />
      </IconButton>
    </div>
  );
};

const InputChat: React.FC<InputChatProps> = ({
  inputRef,
  inputValue,
  handleInputChange,
  handleKeyPress,
  handleSubmit,
  handleDeleteChats,
}) => {
  return (
    <div>
      <div id="input-question" className="absolute bottom-0 left-0 right-0 py-2 w-full">
        <InputChatControls handleDeleteChats={handleDeleteChats} />
        <InputChatField
          inputRef={inputRef}
          inputValue={inputValue}
          handleInputChange={handleInputChange}
          handleKeyPress={handleKeyPress}
          handleSubmit={handleSubmit}
        />
      </div>
    </div>
  );
};

export default InputChat;
