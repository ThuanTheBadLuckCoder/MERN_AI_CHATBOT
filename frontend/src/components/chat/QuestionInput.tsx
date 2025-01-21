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
    <div className="flex flex-col w-full gap-1.5">
      <div className="flex w-full gap-1.5 items-center justify-center">
        <div className="flex w-full items-center justify-between gap-1.5 p-2 rounded-3xl bg-inherit outline outline-1 -outline-offset-1 outline-green-900 focus-within:outline focus-within:outline-1 focus-within:-outline-offset-1 focus-within:outline-green-600">
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

            {/* <div className="flex size-10 flex-row flex-nowrap justify-center border-red-500 rounded-full hover:bg-red-100">

              <button onClick={handleDeleteClick} className="size-full">
                <CodeOffIcon className="text-red-500 size-5" />
              </button>
            </div> */}
          </div>

        </div>
      </div>
    </div>
  );
};

export default QuestionInput;