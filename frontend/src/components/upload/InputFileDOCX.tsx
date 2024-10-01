import { ChangeEvent, FormEvent, useState } from 'react';
import { sendFileRequest } from '../../helper/api-communicator';
import { styled } from '@mui/material/styles';
import toast from 'react-hot-toast';
import mammoth from 'mammoth'
import Button from '@mui/material/Button';
import CloudUploadIcon from '@mui/icons-material/CloudUpload';
import { IconButton } from '@mui/material';
import { IoMdSend } from "react-icons/io";

interface InputFileDOCXProps {
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

export default function InputFileDOCX({ chosenIndices }: InputFileDOCXProps) {
    const [fileContent, setFileContent] = useState<string>("");
    const [selectedFile, setSelectedFile] = useState<File | null>(null);
    // const [chosenIndices, setChosenIndices] = useState<string>("");
    console.log(chosenIndices);

    const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0] as File;
        setSelectedFile(file);

        if (file && file.type === "application/vnd.openxmlformats-officedocument.wordprocessingml.document") {
            const reader = new FileReader();

            reader.onload = async function (e) {

                try {
                    const arrayBuffer = e.target?.result as ArrayBuffer; // Get file as ArrayBuffer
                    const result = mammoth.extractRawText({ arrayBuffer });
                    if (result) {
                        setFileContent((await result).value);
                    }
                    console.log(fileContent);
                } catch (error) {
                    console.error("Error extracting DOCX text:", error);
                }
            };

            reader.readAsArrayBuffer(file); // Read the file as text
        } else {
            console.error("Please upload a valid DOCX file.");
        }
    }
    const handleSubmitFile = async () => {
        // event.preventDefault();
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
        <div style={{ width: "100%", borderRadius: 8, backgroundColor: "rgb(17,27,39)", display: "flex" }}>
            <div>
                <p>DOCX</p>
                <Button component="label" variant="contained" startIcon={<CloudUploadIcon />}>
                    Upload files
                    <VisuallyHiddenInput type="file" onChange={handleFileChange} multiple={false} />
                </Button>
                {selectedFile && <p>Selected file: {selectedFile.name}</p>}
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