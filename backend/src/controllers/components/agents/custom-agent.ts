import { DynamicTool } from "@langchain/core/tools";
import { model } from "../../../config/openai-config.js";
import { ChatPromptTemplate, MessagesPlaceholder, } from "@langchain/core/prompts";

model

const customTool = new DynamicTool({
    name: "get_word_length", description: "Returns the length of a word.",
    func: async (input: string) => input.length.toString(),
});

const tools = [customTool];


const prompt = ChatPromptTemplate.fromMessages([
    ["system", "You are very powerful assistant, but don't know current events"],
    ["human", "{input}"],
    new MessagesPlaceholder("agent_scratchpad"),
]);

export { tools }