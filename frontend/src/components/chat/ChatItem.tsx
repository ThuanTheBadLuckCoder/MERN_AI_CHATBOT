import React, { useState, useEffect } from "react";
import { useAuth } from "../../context/AuthContext";
import "./styles/chat-component.css";
import TabsChatItems from "../tabs/Tabs";
import logo from '../../../public/codfe_logo.svg'

const CODE_PATTERNS = {
  html: /(?:<(!DOCTYPE\s+html|html|head|body|[a-zA-Z]+)[^>]*>|<\/[a-zA-Z]+>)[\s\S]*(?:<\/(?:html|body|div|p|[a-zA-Z]+)>)/i,
  css: /^\s*(?:(?:\.|#|@media|@import|@keyframes)[a-zA-Z][\w-]*\s*{|{[\s\S]*})/,
  javascript: /^\s*(?:function\s+\w+|const\s+\w+|let\s+\w+|var\s+\w+|class\s+\w+|import\s+[\w\s,{]*\s+from|export\s+(?:default\s+)?(?:function|class|const|let|var))/,
  typescript: /^(?:interface\s+\w+|type\s+\w+|enum\s+\w+|namespace\s+\w+|abstract\s+class)/,
  jsx: /(?:<[A-Z][a-zA-Z]*|<>\s*{)/,
  tsx: /(?:<[A-Z][a-zA-Z]*(?:<.*?>)?\s*(?:{.*?})?|<>\s*{)/,
};

const FILE_EXTENSION_MAP: Record<string, string> = {
  'js': 'javascript',
  'jsx': 'jsx',
  'ts': 'typescript',
  'tsx': 'tsx',
  'html': 'html',
  'css': 'css',
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
    return blocks.map((block, index) => {
      if (index % 2 === 1) { // This is a code block
        const firstLineBreak = block.indexOf('\n');
        let content = block;
        let language = null;
        
        if (firstLineBreak !== -1) {
          const possibleLang = block.substring(0, firstLineBreak).trim();
          if (possibleLang) {
            if (possibleLang.startsWith('.')) {
              // It's a file extension - use the mapping
              const ext = possibleLang.slice(1);
              language = FILE_EXTENSION_MAP[ext] || ext;
            } else {
              // It's a language identifier - check if it's a known extension
              language = FILE_EXTENSION_MAP[possibleLang] || possibleLang;
            }
            content = block.substring(firstLineBreak + 1);
          }
        }

        // Clean up the content
        content = content.replace(/^(html|javascript|css|tsx?|jsx?)?\s*\n?/, '').trim();
        
        // If no language was detected from the marker, try to detect from content
        if (!language) {
          const detectedLang = detectLanguage(content);
          // Map the detected language if it has a mapping
          language = FILE_EXTENSION_MAP[detectedLang] || detectedLang;
        }
        
        return {
          content,
          isCode: true,
          language,
        };
      }
      
      return {
        content: block.trim(),
        isCode: false,
        language: null,
      };
    });
  }

  // Handle code without markers
  if (isAssistant && isCodeBlock(message)) {
    const fileExtMatch = message.match(/^\.([a-zA-Z]+)\s*\n/);
    if (fileExtMatch) {
      const ext = fileExtMatch[1];
      return [{
        content: message.substring(fileExtMatch[0].length).trim(),
        isCode: true,
        language: FILE_EXTENSION_MAP[ext] || ext,
      }];
    }
    
    const detectedLang = detectLanguage(message.trim());
    return [{
      content: message.trim(),
      isCode: true,
      language: FILE_EXTENSION_MAP[detectedLang] || detectedLang,
    }];
  }

  // Default case: treat as regular text
  return [{
    content: message,
    isCode: false,
    language: null,
  }];
}

const formatContent = (content: string): React.ReactNode[] => {
  // First split by newlines to handle bullet points
  const lines = content.split('\n');
  const formattedLines: React.ReactNode[] = [];

  lines.forEach((line, lineIndex) => {
    // Check if line starts with single asterisk for bullet point
    if (line.trim().startsWith('*') && !line.trim().startsWith('**')) {
      // Remove the asterisk and trim
      const bulletContent = line.trim().slice(1).trim();
      formattedLines.push(
        <div key={`line-${lineIndex}`} className="flex items-start gap-2">
          <span className="">•</span>
          <span>{formatInlineContent(bulletContent)}</span>
        </div>
      );
    } else {
      // Handle regular line with inline formatting
      formattedLines.push(
        <div key={`line-${lineIndex}`}>
          {formatInlineContent(line)}
        </div>
      );
    }
  });

  return formattedLines;
};

const MARKDOWN_LINK_PATTERN = /\[([^\]]+)\]\(([^)]+)\)/g;

// Helper function to handle inline formatting (bold and code)
const formatInlineContent = (text: string): React.ReactNode[] => {
  const parts: React.ReactNode[] = [];
  let currentIndex = 0;
  let lastMatchEnd = 0;
  const matches = Array.from(text.matchAll(MARKDOWN_LINK_PATTERN));

  if (matches.length === 0) {
    // If no links found, process the text for other formatting
    return processNonLinkContent(text);
  }

  matches.forEach((match, index) => {
    const [fullMatch, title, url] = match;
    const matchStart = match.index!;

    // Add any text before the link with regular formatting
    if (matchStart > lastMatchEnd) {
      const textBefore = text.slice(lastMatchEnd, matchStart);
      parts.push(...processNonLinkContent(textBefore));
    }

    // Add the link
    parts.push(
      <a
        key={`link-${index}`}
        href={url}
        target="_blank"
        rel="noopener noreferrer"
        className="text-blue-500 hover:text-blue-600 underline"
      >
        {title}
      </a>
    );

    lastMatchEnd = matchStart + fullMatch.length;
  });

  // Add any remaining text after the last link
  if (lastMatchEnd < text.length) {
    const textAfter = text.slice(lastMatchEnd);
    parts.push(...processNonLinkContent(textAfter));
  }

  return parts;
};

// Helper function to process text without links for bold and code formatting
const processNonLinkContent = (text: string): React.ReactNode[] => {
  const parts: React.ReactNode[] = [];
  let currentIndex = 0;

  while (currentIndex < text.length) {
    const boldIndex = text.indexOf('**', currentIndex);
    const codeIndex = text.indexOf('`', currentIndex);

    if (boldIndex === -1 && codeIndex === -1) {
      parts.push(
        <span key={`text-${currentIndex}`}>
          {text.slice(currentIndex)}
        </span>
      );
      break;
    }

    let nextIndex: number;
    let isCode: boolean;

    if (boldIndex === -1) {
      nextIndex = codeIndex;
      isCode = true;
    } else if (codeIndex === -1) {
      nextIndex = boldIndex;
      isCode = false;
    } else {
      if (codeIndex < boldIndex) {
        nextIndex = codeIndex;
        isCode = true;
      } else {
        nextIndex = boldIndex;
        isCode = false;
      }
    }

    if (nextIndex > currentIndex) {
      parts.push(
        <span key={`text-${currentIndex}`}>
          {text.slice(currentIndex, nextIndex)}
        </span>
      );
    }

    if (isCode) {
      const endCode = text.indexOf('`', nextIndex + 1);
      if (endCode === -1) {
        parts.push(
          <span key={`text-${nextIndex}`}>
            {text.slice(nextIndex)}
          </span>
        );
        break;
      }
      const codeContent = text.slice(nextIndex + 1, endCode);
      parts.push(
        <code 
          key={`code-${nextIndex}`}
          className="px-1.5 py-0.5 rounded bg-gray-700 text-gray-200 font-mono text-sm"
        >
          {codeContent}
        </code>
      );
      currentIndex = endCode + 1;
    } else {
      const endBold = text.indexOf('**', nextIndex + 2);
      if (endBold === -1) {
        parts.push(
          <span key={`text-${nextIndex}`}>
            {text.slice(nextIndex)}
          </span>
        );
        break;
      }
      const boldContent = text.slice(nextIndex + 2, endBold);
      parts.push(
        <strong 
          key={`bold-${nextIndex}`} 
          className="font-bold text-lg"
        >
          {boldContent}
        </strong>
      );
      currentIndex = endBold + 2;
    }
  }

  return parts;
};

// Thinking animation component
const ThinkingIndicator = () => {
  const [dots, setDots] = useState('.');
  
  useEffect(() => {
    const interval = setInterval(() => {
      setDots(prev => {
        if (prev.length >= 3) return '.';
        return prev + '.';
      });
    }, 500);
    
    return () => clearInterval(interval);
  }, []);
  
  return (
    <div className="thinking-indicator flex items-center gap-2">
      <span className="text-gray-600 font-medium">Codfe is thinking{dots}</span>
      <div className="flex gap-1">
        <div className="h-2 w-2 bg-blue-500 rounded-full animate-pulse" style={{ animationDelay: '0ms' }}></div>
        <div className="h-2 w-2 bg-blue-500 rounded-full animate-pulse" style={{ animationDelay: '200ms' }}></div>
        <div className="h-2 w-2 bg-blue-500 rounded-full animate-pulse" style={{ animationDelay: '400ms' }}></div>
      </div>
    </div>
  );
};

interface ChatItemProps {
  content: string; 
  role: "user" | "assistant";
  isTyping?: boolean;
}

const ChatItem = ({ content, role, isTyping = false }: ChatItemProps) => {
  const auth = useAuth();
  const blocks = extractCodeBlocks(content, role === "assistant");

  return (
    <div className="py-4 pl-2 pr-4 w-full">
      <div className={`${role} flex w-full items-start gap-4`}>
        <div className="size-8 rounded-full overflow-hidden avatar-size">
          {role === "assistant" ?  (
            <img src={logo} alt="Assistant avatar" className="size-full" />
          ) : auth?.user?.name ? (
            <div className="border rounded-full size-full flex justify-center items-center cursor-default">
              {auth.user.name[0]}{auth.user.name.split(" ")[1]?.[0]}
            </div>
          ) : (
            "U"
          )}
        </div>

        <div className="w-3/5 flex flex-col my-auto justify-start gap-2">
          {isTyping && role === "assistant" ? (
            <ThinkingIndicator />
          ) : (
            blocks.map((block, index) => (
              <React.Fragment key={index}>
                {block.isCode ? (
                  <div className="h-fit w-full">
                    {block.language && (
                      <TabsChatItems language={block.language} content={block.content}/>
                    )}
                  </div>
                ) : (
                  block.content && (
                    <div className="content-container text-justify">
                      <span>{formatContent(block.content)}</span>
                    </div>
                  )
                )}
              </React.Fragment>
            ))
          )}
        </div>
      </div>
    </div>
  );
};

export default ChatItem;