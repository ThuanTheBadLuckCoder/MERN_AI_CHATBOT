import { ChangeEvent, useState } from 'react';
import { sendFileRequest } from '../../helper/api-communicator';
import toast from 'react-hot-toast';
import UploadFileIcon from '@mui/icons-material/UploadFile';
import * as pdfjsLib from 'pdfjs-dist';
import 'pdfjs-dist/build/pdf.worker';

interface InputFilePDFProps {
    chosenIndices: string;
}

export default function InputFilePDF({ chosenIndices }: InputFilePDFProps) {
    const [fileContent, setFileContent] = useState<string>("");
    const [selectedFile, setSelectedFile] = useState<File | null>(null);
    const [isLoading, setIsLoading] = useState(false);

    const extractTextFromPDF = async (file: File): Promise<string> => {
        try {
            const arrayBuffer = await file.arrayBuffer();
            const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
            let extractedText = "";

            for (let i = 0; i < pdf.numPages; i++) {
                const page = await pdf.getPage(i + 1);
                const textContent = await page.getTextContent();
                const pageText = textContent.items
                    .map((item: any) => item.str)
                    .join(" ")
                    .trim();
                if (pageText) {
                    extractedText += pageText + "\n\n";
                }
            }

            return extractedText.trim();
        } catch (error) {
            console.error("Error extracting text from PDF:", error);
            throw new Error("Failed to extract text from PDF");
        }
    };

    const handleFileChange = async (event: ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file) return;

        if (file.type !== "application/pdf") {
            toast.error("Please upload a valid PDF file");
            setSelectedFile(null);
            setFileContent("");
            return;
        }

        setIsLoading(true);
        setSelectedFile(file);

        try {
            const extractedText = await extractTextFromPDF(file);
            if (!extractedText) {
                throw new Error("No text content found in PDF");
            }
            setFileContent(extractedText);
            toast.success("PDF content loaded successfully");
        } catch (error) {
            toast.error(error instanceof Error ? error.message : "Failed to process PDF file");
            setSelectedFile(null);
            setFileContent("");
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
                setSelectedFile(null);
                setFileContent("");
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
        <div id="pdf-receiver" className="size-full justify-between flex flex-row gap-1.5">
            <div className="flex w-full border items-center border-green-500 rounded-md gap-1.5 h-10 overflow-hidden">
                <div id="button-upload-pdf" className="size-full">
                    <input 
                        type="file" 
                        accept=".pdf" 
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
                                <p className="italic text-white text-xs">Processing PDF...</p>
                            ) : selectedFile ? (
                                <p className="italic text-green-500 text-xs truncate">
                                    Selected file: {selectedFile.name}
                                </p>
                            ) : (
                                <p className="italic text-white text-xs">Please select a PDF file</p>
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