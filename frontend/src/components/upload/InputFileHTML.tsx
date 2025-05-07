import { ChangeEvent, useState, useRef, useEffect } from 'react';
import { sendFileRequest } from '../../helper/api-communicator';
import toast from 'react-hot-toast';
// import UploadFileIcon from '@mui/icons-material/UploadFile';
import InfoIcon from '@mui/icons-material/Info';
import CodeIcon from '@mui/icons-material/Code';
import ContentCopyIcon from '@mui/icons-material/ContentCopy'; // Import the copy icon

interface InputFileHTMLProps {
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

export default function InputFileHTML({ chosenIndices }: InputFileHTMLProps) {
  const [fileContent, setFileContent] = useState<FileContentType | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [description, setDescription] = useState<string>("");
  const [descriptionError, setDescriptionError] = useState<boolean>(false);
  const [previewMode, setPreviewMode] = useState<'code' | 'render'>('render');
  const previewRef = useRef<HTMLDivElement>(null);
  const [copySuccess, setCopySuccess] = useState<boolean>(false); // State for copy success indicator

  useEffect(() => {
    // Update the preview content whenever fileContent changes
    if (fileContent && previewRef.current && previewMode === 'render') {
      try {
        // Create a sandboxed iframe to properly render the HTML content
        const iframe = document.createElement('iframe');
        iframe.style.width = '100%';
        iframe.style.height = '100%';
        iframe.style.border = 'none';
        iframe.title = 'HTML Preview';
        
        // Clear the preview container first
        while (previewRef.current.firstChild) {
          previewRef.current.removeChild(previewRef.current.firstChild);
        }
        
        // Add the iframe to the preview container
        previewRef.current.appendChild(iframe);
        
        // Wait for iframe to load, then inject the HTML content
        iframe.onload = () => {
          // Get the iframe's document object
          const iframeDocument = iframe.contentDocument || iframe.contentWindow?.document;
          
          if (iframeDocument) {
            // Write the HTML content to the iframe
            iframeDocument.open();
            iframeDocument.write(fileContent.content);
            iframeDocument.close();
          }
        };
        
        // Trigger the iframe load event
        iframe.src = 'about:blank';
      } catch (error) {
        console.error('Error rendering HTML preview:', error);
        previewRef.current.innerHTML = '<div class="p-4 text-red-500">Error rendering HTML preview. See console for details.</div>';
      }
    }
  }, [fileContent, previewMode]);

  const handleFileChange = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Check if file is HTML
    if (!file.name.endsWith('.html') && !file.name.endsWith('.htm') && file.type !== "text/html") {
      toast.error("Please upload a valid HTML file");
      setSelectedFile(null);
      setFileContent(null);
      return;
    }

    setIsLoading(true);
    setSelectedFile(file);

    try {
      const text = await file.text();
      
      // Create file content object
      const htmlContent: FileContentType = {
        name: file.name.replace(/\.[^/.]+$/, ""), // Remove file extension
        content: text,
        file_format: "HTML",
        languages: ["HTML", "CSS", "JavaScript"]
      };
      
      setFileContent(htmlContent);
      toast.success("HTML file loaded successfully");
      
    } catch (error) {
      toast.error("Failed to read HTML file");
      console.error("Error reading HTML:", error);
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
      const file_format = "HTML"; // Always HTML for this component
      
      await sendFileRequest(
        name,
        content,
        index,
        description,
        languages,
        file_format
      );
      
      // If we get here without an error being thrown, the request was successful
      toast.success("Successfully sent HTML file to server!");
      // Clear the form after successful submission
      setSelectedFile(null);
      setFileContent(null);
      setDescription("");
      setDescriptionError(false);
    } catch (error) {
      toast.error("Failed to send HTML file to server");
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

  const togglePreviewMode = () => {
    setPreviewMode(prev => prev === 'code' ? 'render' : 'code');
  };

  // Function to copy HTML code to clipboard
  const copyCodeToClipboard = () => {
    if (fileContent) {
      navigator.clipboard.writeText(fileContent.content)
        .then(() => {
          setCopySuccess(true);
          toast.success("HTML code copied to clipboard!");
          
          // Reset success message after 2 seconds
          setTimeout(() => {
            setCopySuccess(false);
          }, 2000);
        })
        .catch((error) => {
          console.error("Error copying code:", error);
          toast.error("Failed to copy code");
        });
    }
  };

  return (
    <div id="html-receiver" className="size-full flex flex-col gap-2">
      {/* File Upload Section */}
      <div className="justify-between flex flex-row gap-1.5">
        <div className="flex w-full border items-center border-green-500 rounded-md gap-1.5 h-10 overflow-hidden">
          <div id="button-upload-html" className="size-full">
            <input 
              type="file" 
              accept=".html,.htm,text/html" 
              className="hidden" 
              id="html-file-upload" 
              onChange={handleFileChange} 
              multiple={false}
              disabled={isLoading}
            />
            <label 
              htmlFor="html-file-upload" 
              className="flex items-center justify-center cursor-pointer size-full hover:bg-green-950 px-4 gap-1.5"
            >
              <CodeIcon sx={{ fontSize: 20 }} />
              <div className="w-full flex items-center">
                {isLoading ? (
                  <p className="italic text-white text-xs">Processing...</p>
                ) : selectedFile ? (
                  <p className="italic text-green-500 text-xs truncate">
                    Selected file: {selectedFile.name}
                  </p>
                ) : (
                  <p className="italic text-white text-xs">Please select an HTML file</p>
                )}
              </div>
            </label>
          </div>
        </div>
      </div>
      
      {/* Description Section - Always visible */}
      <div className="w-full">
        <div className="flex items-center mb-1">
          <label htmlFor="html-description" className="block text-sm font-medium text-gray-300">
            Description <span className="text-red-500">*</span>
          </label>
          <div className="ml-2 text-gray-400 flex items-center">
            <InfoIcon sx={{ fontSize: 16 }} />
            <span className="ml-1 text-xs">Required</span>
          </div>
        </div>
        <textarea
          id="html-description"
          rows={4}
          className={`w-full px-3 py-2 text-sm border rounded-md ${
            descriptionError ? 'border-red-500 focus:ring-red-500' : 'border-green-500 focus:ring-green-500'
          } bg-gray-800 text-white placeholder-gray-400 focus:outline-none focus:ring-2`}
          placeholder="Enter a detailed description for this HTML component..."
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
      
      {/* File Preview with Toggle and Copy Button */}
      {selectedFile && fileContent && (
        <div className="w-full mt-2">
          <div className="flex items-center justify-between mb-1">
            <label className="block text-sm font-medium text-gray-300">
              HTML Preview
            </label>
            <div className="flex items-center gap-2">
              {/* New Copy Button */}
              <button 
                onClick={copyCodeToClipboard}
                className={`text-xs px-2 py-1 rounded-md flex items-center gap-1 ${
                  copySuccess ? 'bg-green-600' : 'bg-gray-700 hover:bg-gray-600'
                }`}
                disabled={copySuccess}
                title="Copy HTML code to clipboard"
              >
                <ContentCopyIcon sx={{ fontSize: 16 }} />
                {copySuccess ? 'Copied!' : 'Copy Code'}
              </button>
              
              {/* Existing Toggle Button */}
              <button 
                onClick={togglePreviewMode}
                className="text-xs px-2 py-1 rounded-md bg-gray-700 hover:bg-gray-600"
              >
                {previewMode === 'code' ? 'Switch to Rendered View' : 'Switch to Code View'}
              </button>
            </div>
          </div>
          
          {previewMode === 'code' ? (
            <div className="w-full max-h-60 overflow-auto border rounded-md border-green-500 p-2 bg-gray-900">
              <pre className="text-xs text-gray-300 whitespace-pre-wrap">
                {fileContent.content.length > 1000 
                  ? fileContent.content.substring(0, 1000) + '...' 
                  : fileContent.content}
              </pre>
            </div>
          ) : (
            <div className="w-full h-96 overflow-auto border rounded-md border-green-500 p-2 bg-white">
              <div 
                ref={previewRef} 
                className="w-full h-full"
              >
                {/* HTML content will be injected here via iframe */}
              </div>
            </div>
          )}
        </div>
      )}
      
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