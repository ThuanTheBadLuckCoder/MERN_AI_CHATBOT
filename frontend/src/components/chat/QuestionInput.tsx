import React, { ChangeEvent, KeyboardEvent, RefObject, useEffect } from 'react';
import CodeIcon from '@mui/icons-material/Code';
import CodeOffIcon from '@mui/icons-material/CodeOff';

interface QuestionInputProps {
  inputRef: RefObject<HTMLTextAreaElement>;
  inputValue: string;
  handleInputChange: (event: ChangeEvent<HTMLTextAreaElement>) => void;
  handleKeyPress: (event: KeyboardEvent<HTMLTextAreaElement>) => void;
  handleSubmit: () => void;
  handleDeleteClick: () => void;
}

const QuestionInput: React.FC<QuestionInputProps> = ({
  inputRef,
  inputValue,
  handleInputChange,
  handleKeyPress,
  handleSubmit,
  handleDeleteClick
}) => {
  // Function to adjust textarea height
  const adjustHeight = () => {
    if (inputRef.current) {
      // Reset height to default to get the correct scrollHeight
      inputRef.current.style.height = 'auto';
      // Set the height to match the scrollHeight, but cap it at maxHeight
      const maxHeight = 300;
      const scrollHeight = inputRef.current.scrollHeight;
      inputRef.current.style.height = `${Math.min(scrollHeight, maxHeight)}px`;

      // Ensure scrollbar appears when content exceeds maxHeight
      inputRef.current.style.overflowY = scrollHeight > maxHeight ? 'scroll' : 'hidden';
    }
  };

  // Adjust height whenever input value changes
  useEffect(() => {
    adjustHeight();
  }, [inputValue]);

  // Wrap the original handleInputChange to include height adjustment
  const handleInputChangeWithResize = (e: ChangeEvent<HTMLTextAreaElement>) => {
    handleInputChange(e);
    adjustHeight();
  };

  return (
    <div className="flex flex-col w-full gap-1.5 items-center">
      <div className="flex w-full gap-1.5 items-center justify-center">
        <div className="flex flex-col w-full items-center justify-between gap-2 p-4 rounded-2xl bg-inherit outline outline-1 -outline-offset-1 outline-[#515357] focus-within:outline focus-within:outline-1 focus-within:-outline-offset-1">
          
          <div className="flex size-full">
            <textarea
              ref={inputRef}
              value={inputValue}
              onChange={handleInputChangeWithResize}
              onKeyDown={handleKeyPress}
              placeholder="Type your question here..."
              rows={1}
              className="flex w-full text-lg items-center border border-transparent bg-inherit pl-3 outline-none resize-none min-h-[40px] py-1 leading-normal scrollbar-thin scrollbar-thumb-green-900 scrollbar-track-transparent"
              style={{
                height: 'auto',
                maxHeight: '300px',
                overflowY: 'hidden' // Initial state, will be updated by adjustHeight
              }}
            />
            <div className='flex size-fit'>
              <div className='size-fit'>
                <button
                  onClick={handleSubmit}
                  disabled={!inputValue.trim()}
                  className="flex flex-col items-center justify-center rounded-full size-10 disabled:cursor-not-allowed disabled:opacity-75 bg-green-900 border border-green-800 shrink-0"
                >
                  <CodeIcon className="size-5" />
                </button>
              </div>
            </div>
          </div>

          <div className='w-full pl-2 flex justify-between'>
            {/* <span>Codfe 3.5</span> */}
            <div id="rag-selector" className="flex gap-2">

              <button className="bg-blue-500 text-white font-semibold py-2 px-4 rounded-full opacity-50 cursor-not-allowed bg-neutral-900 border border-green-500">Search</button>
              <button className="bg-blue-500 text-white font-semibold py-2 px-4 rounded-full opacity-100 bg-neutral-900 border border-green-500">Chain of Thought</button>
            </div>
            <div id="model-selector" className="bg-neutral-900 px-2 py-1 rounded-md">
              <select className="bg-inherit h-full">
                <option>Codfe 3.5</option>
              </select>

            </div>
          </div>
        </div>
      </div>
      <span>Codfe can make mistakes. Check information info.</span>
    </div>
  );
};

export default QuestionInput;