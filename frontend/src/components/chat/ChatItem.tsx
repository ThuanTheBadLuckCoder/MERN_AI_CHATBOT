import React from "react";
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter";
import { coldarkDark } from "react-syntax-highlighter/dist/esm/styles/prism";
import { useAuth } from "../../context/AuthContext";
import toast from "react-hot-toast";
import "./styles/chat-component.css";

const CODE_PATTERNS = {
  html: /(?:<(!DOCTYPE\s+html|html|head|body|[a-zA-Z]+)[^>]*>|<\/[a-zA-Z]+>)[\s\S]*(?:<\/(?:html|body|div|p|[a-zA-Z]+)>)/i,
  css: /^\s*(?:(?:\.|#|@media|@import|@keyframes)[a-zA-Z][\w-]*\s*{|{[\s\S]*})/,
  javascript: /^\s*(?:function\s+\w+|const\s+\w+|let\s+\w+|var\s+\w+|class\s+\w+|import\s+[\w\s,{]*\s+from|export\s+(?:default\s+)?(?:function|class|const|let|var))/,
};

function isHtmlContent(str: string): boolean {
  const htmlIndicators = [
    /<!DOCTYPE\s+html>/i,
    /<html[^>]*>/i,
    /<head[^>]*>/i,
    /<body[^>]*>/i,
    /<([a-z]+)([^>]*)>(.*?)<\/\1>/i,
  ];
  return htmlIndicators.some(pattern => pattern.test(str));
}

function isNaturalLanguage(str: string): boolean {
  if (isHtmlContent(str)) {
    return false;
  }
  const hasSentenceStructure = /[A-Z][^.!?]+[.!?]/.test(str);
  const hasCommonWords = /\b(?:the|is|are|was|were|I|you|he|she|it|we|they)\b/i.test(str);
  const hasMultipleSentences = (str.match(/[.!?]+/g) || []).length > 1;
  return hasSentenceStructure && (hasCommonWords || hasMultipleSentences);
}

function detectLanguage(code: string): string {
  const normalizedCode = code.trim().replace(/\r\n/g, '\n');
  if (isHtmlContent(normalizedCode)) {
    return "html";
  }
  if (isNaturalLanguage(normalizedCode)) {
    return "plaintext";
  }
  for (const [lang, pattern] of Object.entries(CODE_PATTERNS)) {
    if (pattern.test(normalizedCode)) return lang;
  }
  return "plaintext";
}

function isCodeBlock(str: string): boolean {
  const normalizedStr = str.trim();
  if (isHtmlContent(normalizedStr)) {
    return true;
  }
  if (isNaturalLanguage(normalizedStr)) {
    return false;
  }
  return Object.values(CODE_PATTERNS).some(pattern => pattern.test(normalizedStr));
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
    return [{
      content: message.trim(),
      isCode: true,
      language: detectLanguage(message.trim()),
    }];
  }
  return [{
    content: message,
    isCode: false,
    language: null,
  }];
}

const CodeBlock = ({ language, content }: { language: string | null, content: string }) => (
  <div className="w-full">
    <div className="bg-green-900 px-4 py-2 text-xs font-mono rounded-t-lg flex justify-between items-center">
      <span>{language}</span>
      <button 
        onClick={() => handleCopy(content)} 
        className="copy-button text-xs text-blue-500 hover:underline"
        aria-label="Copy code block"
      >
        Copy
      </button>
    </div>
    <SyntaxHighlighter language={language || "plaintext"} style={coldarkDark} className="w-full no-margin rounded-b-lg">
      {content}
    </SyntaxHighlighter>
  </div>
);

const handleCopy = (code: string) => {
  navigator.clipboard.writeText(code).then(() => {
    toast.success("Copied");
  }).catch(() => {
    toast.error("Failed to copy");
  });
};

const ChatItem = ({ content, role }: { content: string; role: "user" | "assistant"; }) => {
  const auth = useAuth();
  const blocks = extractCodeBlocks(content, role === "assistant");

  return (
    <div className="py-4 pl-2 pr-4 w-full">
      <div className={`${role} flex w-full items-start gap-4`}>
        <div className="size-8 rounded-full overflow-hidden avatar-size">
          {role === "assistant" ? (
            <img src="codfe_logo.svg" alt="Assistant avatar" className="size-full" />
          ) : auth?.user?.name ? (
            <div className="border rounded-full size-full flex justify-center items-center cursor-default">
              {auth.user.name[0]}{auth.user.name.split(" ")[1]?.[0]}
            </div>
          ) : (
            "U"
          )}
        </div>

        <div className="chat-content flex flex-col gap-5 my-auto">
          {blocks.map((block, index) => (
            <React.Fragment key={index}>
              {block.isCode ? (
                <CodeBlock language={block.language} content={block.content} />
              ) : (
                <div className="content-container font-serif text-justify">
                  <span>{block.content}</span>
                </div>
              )}
            </React.Fragment>
          ))}
        </div>
      </div>
    </div>
  );
};

export default ChatItem;
