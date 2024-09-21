/*
CSV
A comma-separated values (CSV) file is a delimited text file that uses a comma to separate values. Each line of the file is a data record. Each record consists of one or more fields, separated by commas.

Load CSV data with a single row per document.

`cd backend`
`npm install d3-dsv@2`
*/
// Usage, extracting all columns
/*
Example CSV file:

id,text
1,This is a sentence.
2,This is another sentence.
*/

// Example code:
import { CSVLoader } from "@langchain/community/document_loaders/fs/csv";

const loader = new CSVLoader("C:/ITITIU20316/Pre-thesis/MERN_AI_CHATBOT/backend/data/example-csv.csv");

export const doc = await loader.load();

// now import this file of code from index.ts to easy to see the result

/*
[
[1]   Document {
[1]     pageContent: 'Username; Identifier;First name;Last name: booker12;9012;Rachel;Booker',
[1]     metadata: {
[1]       source: 'C:/ITITIU20316/Pre-thesis/MERN_AI_CHATBOT/backend/data/example-csv.csv',
[1]       line: 1
[1]     },
[1]     id: undefined
[1]   },
[1]   Document {
[1]     pageContent: 'Username; Identifier;First name;Last name: grey07;2070;Laura;Grey',
[1]     metadata: {
[1]       source: 'C:/ITITIU20316/Pre-thesis/MERN_AI_CHATBOT/backend/data/example-csv.csv',
[1]       line: 2
[1]     },
[1]     id: undefined
[1]   },
[1]   Document {
[1]     pageContent: 'Username; Identifier;First name;Last name: johnson81;4081;Craig;Johnson',
[1]     metadata: {
[1]       source: 'C:/ITITIU20316/Pre-thesis/MERN_AI_CHATBOT/backend/data/example-csv.csv',
[1]       line: 3
[1]     },
[1]     id: undefined
[1]   },
[1]   Document {
[1]     pageContent: 'Username; Identifier;First name;Last name: jenkins46;9346;Mary;Jenkins',
[1]     metadata: {
[1]       source: 'C:/ITITIU20316/Pre-thesis/MERN_AI_CHATBOT/backend/data/example-csv.csv',
[1]       line: 4
[1]     },
[1]     id: undefined
[1]   },
[1]   Document {
[1]     pageContent: 'Username; Identifier;First name;Last name: smith79;5079;Jamie;Smith',
[1]     metadata: {
[1]       source: 'C:/ITITIU20316/Pre-thesis/MERN_AI_CHATBOT/backend/data/example-csv.csv',
[1]       line: 5
[1]     },
[1]     id: undefined
[1]   }
[1] ]
*/