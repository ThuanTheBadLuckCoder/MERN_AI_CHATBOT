import { ChangeEvent, FormEvent, useState } from 'react';
import { sendFileRequest } from '../../helper/api-communicator';

export default function InputFile() {
  const [fileContent, setFileContent] = useState(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [chosenIndices, setChosenIndices] = useState<string>("");

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
      console.error("Please upload a valid JSON file.");
    }
  }

  // const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
  //   const file = event.target.files?.[0]; // Check if there's a file
  //   if (file) {
  //     setSelectedFile(file);
  //   }
  // };
  const handleSubmitFile = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const fakeIndex = "uncategorized_vectorstore";
    setChosenIndices(fakeIndex);
    if (!selectedFile) {
      alert("Please select a file first!");
      return;
    }
    // console.log(selectedFile);
    let content = ""
    if(fileContent) {
      content = fileContent;

    } else {
      console.log("no content available")
    }
    // Send the file to the API route
    await sendFileRequest(selectedFile.name, content, chosenIndices)
  };


  return (
    <div>
      <form onSubmit={handleSubmitFile}>
        <input type="file" onChange={handleFileChange} />
        <button type="submit">Upload</button>
      </form>
      
      {fileContent && (
        <pre>{JSON.stringify(fileContent, null, 2)}</pre> // Display JSON content in pretty format
      )}
    </div>
  );
}

