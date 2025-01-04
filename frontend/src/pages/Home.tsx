import React, { useState } from "react";
import logo from "../../public/codfe_logo.svg";
import ChatBox from "../components/chat/ChatBox";
import { useNavigate } from "react-router-dom";

const Home = () => {
  const [activeQuestion, setActiveQuestion] = useState<string | null>(null);
  const navigate = useNavigate();
  
  const faqData = [
    {
      id: "faq-1",
      question: "How does Codfe ensure accuracy and reliability in its responses?",
      answer:
        "Codfe combines the power of OpenAI's LLMs and Gemini with advanced libraries like LangChain and Elasticsearch. By utilizing Retrieval-Augmented Generation (RAG), it fetches relevant and factual data from trusted sources to provide accurate, evidence-backed answers while strictly avoiding fabricated information.",
    },
    {
      id: "faq-2",
      question: "What makes Codfe stand out as a developer-focused AI assistant?",
      answer:
        "Codfe is uniquely tailored for developers, offering AI-driven solutions that enhance productivity, streamline workflows, and deliver precise, actionable insights. Its integration of cutting-edge technologies ensures it not only understands developer-specific needs but also evolves to stay ahead in the fast-changing tech landscape.",
    },
    {
      id: "faq-3",
      question: "Which developers does Codfe support?",
      answer:
        "Currently, Codfe is specifically designed to support frontend developers, offering specialized tools and assistance tailored to the unique needs of frontend development.",
    },
  ];

  const toggleAnswer = (id: string) => {
    setActiveQuestion((prev) => (prev === id ? null : id));
  };

  const handleTryCodfe = () => {
    navigate("/chat");
  };

  return (
    <div className="size-full flex flex-col gap-10">
      {/* Intro Section */}
      <div id="intro-codfe" className="flex flex-row gap-5 my-40 px-10">
      <div className="h-96 gap-10 flex flex-col ml-20">
          <h1 className="text-8xl flex relative cursor-not-allowed">
            Meet C
            <img
              src={logo}
              alt="Logo icon"
              className="border border-green-500 bg-green-950 overflow-hidden size-12 self-end mb-4 rounded-full cursor-not-allowed"
            />
            dfe
          </h1>
          <span className="text-4xl cursor-not-allowed">
            Codfe is an AI assistant tailored to empower every developer, every project, and maximize productivity.
          </span>
          <button 
          onClick={handleTryCodfe}
          className="border-2 px-8 py-2 rounded-md border-green-500 bg-green-950 hover:bg-green-900 text-xl w-fit">
            Try Codfe
          </button>

        </div>
        <div className="h-96">
          <img src="https://cdn.dribbble.com/users/214929/screenshots/4967879/ai-loader-opt.gif" />
        </div>
        
      </div>

      {/* Chatbox FAQ Section */}
      <div id="chatbox-faq" className="my-20 px-20">
        <div className="h-96">
          <h1 className="text-2xl mb-5">Codfe FQAs</h1>
          <div className="rounded-md shadow-md bg-zinc-900 text-white flex flex-col gap-4 w-3/4 mx-auto">
            <div className="flex flex-col gap-3 h-72 overflow-y-auto p-4">
              {faqData.map(({ id, question, answer }) => (
                <div key={id} className="flex flex-col gap-2">
                  {/* Question Bubble */}
                  <div
                    onClick={() => toggleAnswer(id)}
                    className="self-end max-w-lg flex flex-row-reverse gap-3"
                  >
                    <div className="flex text-sm font-medium border size-8 rounded-full text-xl p-2 items-center justify-center bg-white">
                      <p className="size-5 flex items-center justify-center text-black font-sans cursor-default">U</p>
                      </div>
                    <div className="bg-green-700 text-white p-3 rounded-2xl text-left cursor-pointer hover:bg-green-600">{question}</div>
                  </div>

                  {/* Answer Bubble */}
                  {activeQuestion === id && (
                    <div className="self-start max-w-lg flex flex-row gap-3">
                      <img src="codfe_logo.svg" alt="openai" className="size-8 border border-green-500 rounded-full" />
                    <div className="bg-gray-700 text-white p-3 rounded-2xl text-left">{answer}</div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          
          </div>
        </div>
      </div>
    </div>
  );
};

export default Home;
