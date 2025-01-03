import { ChangeEvent, useEffect, useState } from 'react';
import { sendFileRequest } from '../../helper/api-communicator';
import toast from 'react-hot-toast';
import UploadFileIcon from '@mui/icons-material/UploadFile';
import { styled } from '@mui/material/styles';

interface InputFileJSONProps {
  chosenIndices: string;
}

const VisuallyHiddenInput = styled('input')({
  clip: 'rect(0 0 0 0)',
  clipPath: 'inset(50%)',
  height: 1,
  overflow: 'hidden',
  position: 'absolute',
  bottom: 0,
  left: 0,
  whiteSpace: 'nowrap',
  width: 1,
});

export default function InputFileJSON({ chosenIndices }: InputFileJSONProps) {
  const [fileContent, setFileContent] = useState<any>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const handleFileChange = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (file.type !== "application/json") {
      toast.error("Please upload a valid JSON file");
      setSelectedFile(null);
      setFileContent(null);
      return;
    }

    setIsLoading(true);
    setSelectedFile(file);

    try {
      const text = await file.text();
      const json = JSON.parse(text);
      setFileContent(json);
      toast.success("JSON file loaded successfully");
      
    } catch (error) {
      toast.error("Failed to parse JSON file");
      console.error("Error parsing JSON:", error);
      setSelectedFile(null);
      setFileContent(null);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmitFile = async () => {
    if (!selectedFile || !fileContent) {
      toast.error("Please select a file first!");
      return;
    }

    try {
      const response = await sendFileRequest(selectedFile.name, fileContent, chosenIndices);
      if (response) {
        toast.success("Successfully sent file to server!");
        // Optional: Clear the form after successful submission
        setSelectedFile(null);
        setFileContent(null);
      }
    } catch (error) {
      toast.error("Failed to send file to server");
      console.error("Error sending file:", error);
    }
  };

  const handleCancel = () => {
    setSelectedFile(null);
    setFileContent(null);
  };

  return (
    <div id="json-receiver" className="size-full justify-between flex flex-row gap-1.5">
      <div className="flex w-full border items-center border-green-500 rounded-md gap-1.5 h-10 overflow-hidden">
        <div id="button-upload-json" className="size-full">
          <input 
            type="file" 
            accept=".json" 
            className="hidden" 
            id="file-upload" 
            onChange={handleFileChange} 
            multiple={false}
            disabled={isLoading}
          />
          <label 
            htmlFor="file-upload" 
            className="flex items-center justify-center cursor-pointer size-full hover:bg-green-950 px-4 gap-1.5"
          >
            <UploadFileIcon sx={{ fontSize: 20 }} />
            <div className="w-full flex items-center">
              {isLoading ? (
                <p className="italic text-white text-xs">Processing...</p>
              ) : selectedFile ? (
                <p className="italic text-green-500 text-xs truncate">
                  Selected file: {selectedFile.name}
                </p>
              ) : (
                <p className="italic text-white text-xs">Please select a JSON file</p>
              )}
            </div>
          </label>
        </div>
      </div>
      <div className="w-fit flex gap-1.5 justify-end">
        <button 
          className="border-2 border-red-500 px-2 py-1 rounded-md hover:bg-red-600 cursor-pointer disabled:cursor-not-allowed"
          onClick={handleCancel}
          disabled={!selectedFile || isLoading}
        >
          Cancel
        </button>
        <button 
          className="bg-green-500 px-2 py-1 rounded-md hover:bg-green-600 cursor-pointer disabled:cursor-not-allowed" 
          onClick={handleSubmitFile} 
          disabled={!chosenIndices || !selectedFile || !fileContent || isLoading}
        >
          Submit
        </button>
      </div>
    </div>
  );
}