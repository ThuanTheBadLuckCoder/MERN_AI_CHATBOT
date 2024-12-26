import React from "react";
import { Box, Avatar, Typography, Paper } from "@mui/material";
import { useAuth } from "../../context/AuthContext";
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter";
import { coldarkDark } from "react-syntax-highlighter/dist/esm/styles/prism";
import './styles/chat-component.css'

const CODE_PATTERNS = {
  html: /<[^>]+>|<!DOCTYPE|<html|<head|<body|<script|<style/i,
  css: /{[\s\S]*}|@media|@import|@keyframes|\.[a-zA-Z][\w-]*\s*{/,
  javascript: /function|const|let|var|=>|import|export|class|async|await/
};

function detectLanguage(code: string): string {
  for (const [lang, pattern] of Object.entries(CODE_PATTERNS)) {
    if (pattern.test(code)) return lang;
  }
  return "plaintext";
}

function extractCodeBlocks(message: string) {
  if (message.includes("```")) {
    const blocks = message.split("```");
    return blocks.map((block, index) => ({
      content: block.trim(),
      isCode: index % 2 === 1,
      language: index % 2 === 1 ? detectLanguage(block) : null
    }));
  }

  if (isCodeBlock(message)) {
    return [{
      content: message,
      isCode: true,
      language: detectLanguage(message)
    }];
  }

  return [{
    content: message,
    isCode: false,
    language: null
  }];
}

function isCodeBlock(str: string): boolean {
  return (
    CODE_PATTERNS.html.test(str) ||
    CODE_PATTERNS.css.test(str) ||
    CODE_PATTERNS.javascript.test(str)
  );
}

const ChatItem = ({
  content,
  role,
}: {
  content: string;
  role: "user" | "assistant";
}) => {
  const auth = useAuth();
  const blocks = extractCodeBlocks(content);

  return (
    <div className="py-4 px-1 w-full">
      <div className={`${role} flex w-full items-center gap-4`}>
        <div className="size-8 rounded-full overflow-hidden avatar-size">
          {role === "assistant" ? (
            <img src="codfe_logo.svg" alt="openai" className="size-full" />
          ) : (
            auth?.user?.name ? (
              <div className="border rounded-full size-full flex justify-center items-center">
                {auth.user.name[0]}
                {auth.user.name.split(" ")[1]?.[0]}
              </div>
            ) : "U"
          )}
        </div>

        <div className="chat-content">
          {blocks.map((block, index) => (
            <React.Fragment key={index}>
              {block.isCode ? (
                <div className="w-full">
                  <div>
                    {block.language}
                  </div>
                  <SyntaxHighlighter
                    language={block.language || "plaintext"}
                    style={coldarkDark} className="w-full"
                  >
                    {block.content}
                  </SyntaxHighlighter>
                </div>
              ) : (
                <div className="content-container">
                  {block.content}
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