import React from "react";
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter";
import { coldarkDark } from "react-syntax-highlighter/dist/esm/styles/prism";
import { useAuth } from "../../context/AuthContext";
import "./styles/chat-component.css";
import toast from "react-hot-toast";

// Enhanced patterns with better HTML detection
const CODE_PATTERNS = {
  // Updated HTML pattern to catch more HTML structures
  html: /(?:<(!DOCTYPE\s+html|html|head|body|[a-zA-Z]+)[^>]*>|<\/[a-zA-Z]+>)[\s\S]*(?:<\/(?:html|body|div|p|[a-zA-Z]+)>)/i,
  css: /^\s*(?:(?:\.|#|@media|@import|@keyframes)[a-zA-Z][\w-]*\s*{|{[\s\S]*})/,
  javascript: /^\s*(?:function\s+\w+|const\s+\w+|let\s+\w+|var\s+\w+|class\s+\w+|import\s+[\w\s,{]*\s+from|export\s+(?:default\s+)?(?:function|class|const|let|var))/,
};

// Improved HTML-specific detection
function isHtmlContent(str: string): boolean {
  const htmlIndicators = [
    /<!DOCTYPE\s+html>/i,
    /<html[^>]*>/i,
    /<head[^>]*>/i,
    /<body[^>]*>/i,
    // Check for common HTML tags pattern
    /<([a-z]+)([^>]*)>(.*?)<\/\1>/i,
  ];

  return htmlIndicators.some(pattern => pattern.test(str));
}

function isNaturalLanguage(str: string): boolean {
  // Skip natural language check if it looks like HTML
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
  
  // Check for HTML first
  if (isHtmlContent(normalizedCode)) {
    return "html";
  }
  
  // Skip language detection if it looks like natural language
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
  
  // Check for HTML specifically first
  if (isHtmlContent(normalizedStr)) {
    return true;
  }
  
  // Don't identify as code if it looks like natural language
  if (isNaturalLanguage(normalizedStr)) {
    return false;
  }

  return Object.values(CODE_PATTERNS).some(pattern => pattern.test(normalizedStr));
}

function extractCodeBlocks(message: string, isAssistant: boolean) {
  // Handle markdown code blocks
  if (message.includes("```")) {
    const blocks = message.split("```");
    return blocks.map((block, index) => ({
      content: block.trim(),
      isCode: index % 2 === 1,
      language: index % 2 === 1 ? detectLanguage(block) : null,
    }));
  }

  // Only attempt to detect unmarked code blocks in assistant messages
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

  const handleCopy = (code: string) => {
    navigator.clipboard.writeText(code).then(() => {
      toast.success("Copied");
    });
  };

  const blocks = extractCodeBlocks(content, role === "assistant");

  return (
    <div className="py-4 px-2 w-full">
      <div className={`${role} flex w-full items-start gap-4`}>
        <div className="size-8 rounded-full overflow-hidden avatar-size">
          {role === "assistant" ? (
            <img src="codfe_logo.svg" alt="openai" className="size-full" />
          ) : auth?.user?.name ? (
            <div className="border rounded-full size-full flex justify-center items-center cursor-default">
              {auth.user.name[0]}
              {auth.user.name.split(" ")[1]?.[0]}
            </div>
          ) : (
            "U"
          )}
        </div>

        <div className="chat-content my-auto">
          {blocks.map((block, index) => (
            <React.Fragment key={index}>
              {block.isCode ? (
                <div className="w-full">
                  <div id="file-type" className="bg-green-900 px-4 py-2 text-xs font-mono rounded-t-lg flex justify-between items-center">
                    <span>{block.language}</span>
                    <button onClick={() => handleCopy(block.content)} className="copy-button text-xs text-blue-500 hover:underline">Copy</button>
                  </div>
                  <SyntaxHighlighter
                    language={block.language || "plaintext"}
                    style={coldarkDark}
                    className="w-full no-margin rounded-b-lg">
                    {block.content}
                  </SyntaxHighlighter>
                </div>
              ) : (
                <div className="content-container font-serif">
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