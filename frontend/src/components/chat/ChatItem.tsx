import React from "react";
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter";
import { coldarkDark } from "react-syntax-highlighter/dist/esm/styles/prism";
import { useAuth } from "../../context/AuthContext";
import "./styles/chat-component.css";
import toast from "react-hot-toast";

const CODE_PATTERNS = {
  html: /<[^>]+>|<!DOCTYPE|<html|<head|<body|<script|<style|<\/[^>]+>/i, // Updated to include closing tags
  css: /{[\s\S]*}|@media|@import|@keyframes|\.[a-zA-Z][\w-]*\s*{/,
  javascript: /function|const|let|var|=>|import|export|class|async|await/,
};

function detectLanguage(code: string): string {
  for (const [lang, pattern] of Object.entries(CODE_PATTERNS)) {
    if (pattern.test(code)) return lang;
  }
  return "plaintext";
}

function isCodeBlock(str: string): boolean {
  return (
    CODE_PATTERNS.html.test(str) ||
    CODE_PATTERNS.css.test(str) ||
    CODE_PATTERNS.javascript.test(str)
  );
}

function extractCodeBlocks(message: string, isAssistant: boolean) {
  if (message.includes("```")) {
    const blocks = message.split("```");
    return blocks.map((block, index) => ({
      content: block.trim(),
      isCode: index % 2 === 1,
      language: index % 2 === 1 ? detectLanguage(block) : null,
    }));
  }

  if (isAssistant && isCodeBlock(message)) {
    return [
      {
        content: message.trim(),
        isCode: true,
        language: detectLanguage(message.trim()),
      },
    ];
  }

  return [
    {
      content: message,
      isCode: false,
      language: null,
    },
  ];
}

const ChatItem = ({
  content,
  role,
}: {
  content: string;
  role: "user" | "assistant";
}) => {
  const auth = useAuth();
  const blocks = extractCodeBlocks(content, role === "assistant");

  const handleCopy = (code: string) => {
    navigator.clipboard.writeText(code).then(() => {
      toast.success("Copied");
    });
  };

  return (
    <div className="py-4 px-2 w-full">
      <div className={`${role} flex w-full items-center gap-4`}>
        <div className="size-8 rounded-full overflow-hidden avatar-size">
          {role === "assistant" ? (
            <img src="codfe_logo.svg" alt="openai" className="size-full" />
          ) : auth?.user?.name ? (
            <div className="border rounded-full size-full flex justify-center items-center">
              {auth.user.name[0]}
              {auth.user.name.split(" ")[1]?.[0]}
            </div>
          ) : (
            "U"
          )}
        </div>

        <div className="chat-content">
          {blocks.map((block, index) => (
            <React.Fragment key={index}>
              {block.isCode ? (
                <div className="w-full">
                  <div
                    id="file-type"
                    className="bg-gray-950 px-4 py-2 text-xs font-mono rounded-t-lg flex justify-between items-center"
                  >
                    <span>{block.language}</span>
                    <button
                      onClick={() => handleCopy(block.content)}
                      className="copy-button text-xs text-blue-500 hover:underline"
                    >
                      Copy
                    </button>
                  </div>
                  <SyntaxHighlighter
                    language={block.language || "plaintext"}
                    style={coldarkDark}
                    className="w-full no-margin rounded-b-lg"
                  >
                    {block.content}
                  </SyntaxHighlighter>
                </div>
              ) : (
                <div className="content-container">{block.content}</div>
              )}
            </React.Fragment>
          ))}
        </div>
      </div>
    </div>
  );
};

export default ChatItem;
