import { ChangeEvent, FormEvent, useState } from 'react';
import { sendFileRequest } from '../../helper/api-communicator';
import toast from 'react-hot-toast';
import { Button, IconButton, MenuItem, responsiveFontSizes, Select, SelectChangeEvent } from '@mui/material';
import { IoMdSend } from 'react-icons/io';
import CloudUploadIcon from '@mui/icons-material/CloudUpload';
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
    <div style={{ width: "100%", borderRadius: 8, backgroundColor: "rgb(17,27,39)", display: "flex", flexDirection: "column", padding: "20px", gap: "10px" }}>
      <p>JSON</p>
      <div style={{ width: "100%", borderRadius: 8, backgroundColor: "rgb(17,27,39)", display: "flex", flexDirection: "row", justifyContent: "space-between", height: "60px"}}>
        <Button component="label" variant="contained" startIcon={<CloudUploadIcon />} sx={{gap: "10px"}}>
          Upload files
          <VisuallyHiddenInput type="file" onChange={handleFileChange} multiple={false} />
        </Button>
        {selectedFile && <p className="custom-fileName">Selected file: {selectedFile.name}</p>}
        <IconButton
          onClick={handleSubmitFile}
          sx={{ color: "white", mx: 1 }}
          disabled={!chosenIndices || !selectedFile || !fileContent}
        >
          <IoMdSend />
        </IconButton>
      </div>
    </div>
  );
}