import { ChangeEvent, useState } from 'react';
import { sendFileRequest } from '../../helper/api-communicator';
import toast from 'react-hot-toast';
import mammoth from 'mammoth';
import UploadFileIcon from '@mui/icons-material/UploadFile';

interface InputFileDOCXProps {
    chosenIndices: string;
}

export default function InputFileDOCX({ chosenIndices }: InputFileDOCXProps) {
    const [fileContent, setFileContent] = useState<string>("");
    const [selectedFile, setSelectedFile] = useState<File | null>(null);
    const [isLoading, setIsLoading] = useState(false);

    const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file) return;

        if (file.type === "application/vnd.openxmlformats-officedocument.wordprocessingml.document") {
            setIsLoading(true);
            setSelectedFile(file);
            try {
                const arrayBuffer = await file.arrayBuffer();
                const result = await mammoth.extractRawText({ arrayBuffer });
                setFileContent(result.value);
                console.log("Extracted content:", result.value);
            } catch (error) {
                console.error("Error extracting DOCX text:", error);
                toast.error("Failed to read DOCX file content");
                setSelectedFile(null);
                setFileContent("");
            } finally {
                setIsLoading(false);
            }
        } else {
            toast.error("Please upload a valid DOCX file");
            setSelectedFile(null);
            setFileContent("");
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
            }
        } catch (error) {
            toast.error("Failed to send file to server");
            console.error("Error sending file:", error);
        }
    };

    const handleCancel = () => {
        setSelectedFile(null);
        setFileContent("");
    };

    return (
        <div id="docx-receiver" className="size-full justify-between flex flex-row gap-1.5">
            <div className="flex w-full border items-center border-green-500 rounded-md gap-1.5 h-10 overflow-hidden">
                <div id="button-upload-json" className="size-full">
                    <input 
                        type="file" 
                        accept=".docx" 
                        className="hidden" 
                        id="file-upload" 
                        onChange={handleFileChange} 
                        multiple={false} 
                    />
                    <label 
                        htmlFor="file-upload" 
                        className="flex items-center justify-center cursor-pointer size-full hover:bg-green-950 px-4 gap-1.5"
                    >
                        <UploadFileIcon sx={{ fontSize: 20 }} />
                        <div className="w-full flex items-center">
                            {selectedFile ? (
                                <p className="italic text-green-500 text-xs">Selected file: {selectedFile.name}</p>
                            ) : (
                                <p className="italic text-white text-xs">Please select a DOCX file</p>
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
                    disabled={!chosenIndices || !selectedFile || !fileContent}
                >
                    Submit
                </button>
            </div>
        </div>
    );
}