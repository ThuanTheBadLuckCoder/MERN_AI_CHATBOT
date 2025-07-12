import { ChangeEvent, useState } from 'react';
import { sendFileRequest } from '../../helper/api-communicator';
import toast from 'react-hot-toast';
import UploadFileIcon from '@mui/icons-material/UploadFile';
import InfoIcon from '@mui/icons-material/Info';

interface InputFileJSONProps {
  chosenIndices: string;
}

interface FileContentType {
  name: string;
  content: string;
  index?: string;
  description?: string;
  languages?: string[];
  file_format?: string;
}

export default function InputFileJSON({ chosenIndices }: InputFileJSONProps) {
  const [fileContent, setFileContent] = useState<FileContentType | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [description, setDescription] = useState<string>("");
  const [descriptionError, setDescriptionError] = useState<boolean>(false);

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
      
      // Validate that the JSON has at least the required fields
      if (!json.name || !json.content) {
        toast.error("JSON file must include 'name' and 'content' fields");
        setSelectedFile(null);
        setFileContent(null);
        return;
      }
      
      setFileContent(json);
      
      // If description exists in the JSON, pre-fill the description field
      if (json.description) {
        setDescription(json.description);
      }
      
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

    // Validate description is provided
    if (!description.trim()) {
      setDescriptionError(true);
      toast.error("Description is required. Please provide a description for this component.");
      return;
    }

    try {
      // Prepare the data with all required fields for the backend
      const { name, content } = fileContent;
      const index = chosenIndices || fileContent.index || "ui-components";
      const languages = fileContent.languages || ["HTML", "CSS", "JavaScript"];
      const file_format = fileContent.file_format || "HTML";
      
      await sendFileRequest(
        name,
        content,
        index,
        description, // Use the description from the input field
        languages,
        file_format
      );
      
      // If we get here without an error being thrown, the request was successful
      toast.success("Successfully sent file to server!");
      // Clear the form after successful submission
      setSelectedFile(null);
      setFileContent(null);
      setDescription("");
      setDescriptionError(false);
    } catch (error) {
      toast.error("Failed to send file to server");
      console.error("Error sending file:", error);
    }
  };

  const handleCancel = () => {
    setSelectedFile(null);
    setFileContent(null);
    setDescription("");
    setDescriptionError(false);
  };

  const handleDescriptionChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setDescription(e.target.value);
    if (e.target.value.trim()) {
      setDescriptionError(false);
    }
  };

  return (
    <div id="json-receiver" className="size-full flex flex-col gap-2">
      {/* File Upload Section */}
      <div className="justify-between flex flex-row gap-1.5">
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
      </div>
      
      {/* Description Section - Always visible */}
      <div className="w-full">
        <div className="flex items-center mb-1">
          <label htmlFor="description" className="block text-sm font-medium text-gray-300">
            Description <span className="text-red-500">*</span>
          </label>
          <div className="ml-2 text-gray-400 flex items-center">
            <InfoIcon sx={{ fontSize: 16 }} />
            <span className="ml-1 text-xs">Required</span>
          </div>
        </div>
        <textarea
          id="description"
          rows={4}
          className={`w-full px-3 py-2 text-sm border rounded-md ${
            descriptionError ? 'border-red-500 focus:ring-red-500' : 'border-green-500 focus:ring-green-500'
          } bg-gray-800 text-white placeholder-gray-400 focus:outline-none focus:ring-2`}
          placeholder="Enter a detailed description for this component..."
          value={description}
          onChange={handleDescriptionChange}
          disabled={!selectedFile}
        />
        {descriptionError && (
          <p className="mt-1 text-xs text-red-500">Description is required for this component</p>
        )}
        {!selectedFile && (
          <p className="mt-1 text-xs text-gray-400">Please select a file first to enable description entry</p>
        )}
      </div>
      
      {/* Action Buttons */}
      <div className="w-full flex justify-end gap-1.5 mt-2">
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