import React, { useState } from "react";
import logo from "../../public/codfe_logo.svg";
import bg from '../../public/main_bg.png'
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
    navigate("/login");
  };

  return (
    <div className="size-full flex flex-col gap-40 my-40">
      {/* Intro Section */}
      <div id="intro-codfe" className="flex flex-row gap-5 mt-40 px-10">
        <div className="size-full" style={{
      backgroundImage: `url(${bg})`,
      backgroundSize: "contain",
      backgroundPosition: "left",
      backgroundRepeat: "no-repeat",
    }}>

        <div className="h-96 gap-10 flex flex-col ml-20">
          <h1 className="text-8xl flex relative cursor-not-allowed font-bold">
            Meet C
            <img
              src={logo}
              alt="Logo icon"
              className="border border-green-500 bg-green-950 overflow-hidden size-12 self-end mb-4 rounded-full cursor-not-allowed"
            />
            dfe
          </h1>
          <span className="text-5xl cursor-not-allowed">
            Codfe is an AI assistant tailored to empower every developer, <br />every project, and maximize productivity.
          </span>
          <button
            onClick={handleTryCodfe}
            className="border-2 px-8 py-2 rounded-md border-green-500 bg-green-950 hover:bg-green-900 text-xl w-fit">
            Try Codfe
          </button>
        </div>
    </div>

      </div>

      {/* Chatbox FAQ Section */}
      <div id="chatbox-faq" className="">
        <div className="h-96">
          <div className=" text-white flex flex-col gap-4 w-11/12 mx-auto">
            <div className="flex flex-col gap-3 h-96 overflow-y-auto rounded-2xl shadow-md bg-zinc-900">
              <div className="bg-zinc-900 sticky top-0">
                <div className="h-10 flex flex-row justify-between items-start mx-2 my-2 z-50">
                <div className="relative w-fit h-full">
                  <button type="button" className="flex w-full bg-neutral-900 h-full text-white font-bold py-2 px-4 border border-green-500 rounded-xl overflow-hidden text-left gap-2.5 justify-between">
                    <div className="w-5/6 flex flex-row justify-between truncate flex-1 px-4">Codfe FQAs</div>
                  </button>
                </div>
                </div>
              </div>
              {faqData.map(({ id, question, answer }) => (
                <div key={id} className="flex flex-col gap-2 mx-4">
                  {/* Question Bubble */}
                  <div
                    onClick={() => toggleAnswer(id)}
                    className="self-end max-w-lg flex flex-row-reverse gap-3"
                  >
                    <div className="bg-neutral-800 text-white px-4 py-2 border border-neutral-800 rounded-full text-left cursor-pointer hover:bg-green-500 hover:border-green-500 text-lg">{question}</div>
                  </div>

                  {/* Answer Bubble */}
                  {activeQuestion === id && (
                    <div className="self-start max-w-lg flex flex-row gap-3">
                      <img src="codfe_logo.svg" alt="openai" className="size-8 border border-green-500 rounded-full" />
                      <div className="text-white text-justify rounded-2xl text-left text-lg">{answer}</div>
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
