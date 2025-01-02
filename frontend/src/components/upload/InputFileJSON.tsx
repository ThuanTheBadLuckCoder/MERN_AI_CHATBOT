import { useState } from 'react';
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
  const [fileContent, setFileContent] = useState(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  // const [chosenIndices, setChosenIndices] = useState<string>("");

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0] as File;
    setSelectedFile(file);

    if (file && file.type === "application/json") {
      const reader = new FileReader();

      reader.onload = function (e) {
        try {
          const json = JSON.parse(e.target?.result as string); // Parse JSON content 
          setFileContent(json); // Set the file content to state
        } catch (error) {
          console.error("Error parsing JSON:", error);
        }
      };

      reader.readAsText(file); // Read the file as text
    } else {
      toast.error("This is NOT a JSON file");
      setSelectedFile(null);
      console.error("Please upload a valid JSON file.", selectedFile);
    }
  }
  const handleSubmitFile = async () => {
    // event.preventDefault();
    // setChosenIndices(fakeIndex);
    if (!selectedFile || !fileContent) {
      toast.error("Please select a file first!");
      return;
    } else {
      const response = await sendFileRequest(selectedFile.name, fileContent, chosenIndices)
      if (response) {
        toast.success("Successful send FILE to Server!!!");
      }
    }

  };
  return (
    <div id="json-receiver" className='size-full '>
      <div className='flex border items-center border-green-500 rounded-md gap-2 h-10 overflow-hidden'>
        <div id='button-upload-json hover:bg-green-950'>
          <input type="file" accept=".json" className="hidden" id="file-upload" onChange={handleFileChange} multiple={false} />
          <label htmlFor="file-upload" className="flex items-center justify-center cursor-pointer size-10">
            <UploadFileIcon sx={{ fontSize: 20 }} />
          </label>
        </div>
        <div className="w-full flex items-center">
          {selectedFile ? (
            <p>Selected file: {selectedFile.name}</p>
          ) : (
            <p className='italic text-green-500	text-xs	'>Please select a JSON file</p>
          )}
        </div>


      </div>

      <div className='w-full'>
        <button>Cancel</button>
        <button onClick={handleSubmitFile} disabled={!chosenIndices || !selectedFile || !fileContent}>Send</button>

      </div>


    </div>
  );
}