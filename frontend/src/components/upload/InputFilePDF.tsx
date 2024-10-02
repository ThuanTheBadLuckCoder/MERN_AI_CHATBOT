import { ChangeEvent, useState } from 'react';
import { sendFileRequest } from '../../helper/api-communicator';
import { styled } from '@mui/material/styles';
import toast from 'react-hot-toast';
import Button from '@mui/material/Button';
import CloudUploadIcon from '@mui/icons-material/CloudUpload';
import { IconButton } from '@mui/material';
import { IoMdSend } from "react-icons/io";
import * as pdfjsLib from 'pdfjs-dist';
import 'pdfjs-dist/build/pdf.worker';  // Ensure the PDF worker is included

interface InputFilePDFProps {
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

export default function InputFilePDF({ chosenIndices }: InputFilePDFProps) {
    const [fileContent, setFileContent] = useState<string>("");
    const [selectedFile, setSelectedFile] = useState<File | null>(null);

    const extractTextFromPDF = async (file: File) => {
        try {
            const arrayBuffer = await file.arrayBuffer();
            const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
            let extractedText = "";

            for (let i = 0; i < pdf.numPages; i++) {
                const page = await pdf.getPage(i + 1);
                const textContent = await page.getTextContent();
                const pageText = textContent.items.map((item: any) => item.str).join(" ");
                extractedText += pageText + "\n";
            }

            return extractedText;
        } catch (error) {
            console.error("Error extracting text from PDF:", error);
            toast.error("Error extracting text from PDF.");
            return "";
        }
    };

    const handleFileChange = async (event: ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        setSelectedFile(file || null);
        
        if (file && file.type === "application/pdf") {
            const extractedText = await extractTextFromPDF(file);
            setFileContent(extractedText);
            console.log("Extracted text:", extractedText);
        } else {
            toast.error("This is NOT a PDF file");
            setSelectedFile(null);
        }
    };

    // console.log("file name: ", selectedFile.name);
    const handleSubmitFile = async () => {
        if (!selectedFile || !fileContent) {
            toast.error("Please select a file first!");
            return;
        }
        try {
            const response = await sendFileRequest(selectedFile.name, fileContent, chosenIndices);
            if (response) {
                toast.success("Successfully sent the file to the server!");
            }
        } catch (error) {
            toast.error("Error sending the file to the server.");
            console.error("Error sending file:", error);
        }
    };

    return (
        <div style={{ width: "100%", borderRadius: 8, backgroundColor: "rgb(17,27,39)", display: "flex", flexDirection: "column", padding: "20px", gap: "10px" }}>
            <p>PDF</p>
            <div>
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
        </div>
    );
}
