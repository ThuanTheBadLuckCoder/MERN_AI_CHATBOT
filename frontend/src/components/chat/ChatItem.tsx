import React from "react";
import { Box, Avatar, Typography, Paper } from "@mui/material";
import { useAuth } from "../../context/AuthContext";
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter";
import { coldarkDark } from "react-syntax-highlighter/dist/esm/styles/prism";

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
    <div className="chat-item-container">
    <Box
      sx={{
        display: "flex",
        p: 2,
        bgcolor: role === "assistant" ? "rgba(0, 77, 86, 0.05)" : "rgba(0, 77, 86, 0.8)",
        gap: 2,
        borderRadius: 2,
        my: 2,
        flexDirection: role === "assistant" ? "row" : "row-reverse",
        transition: "all 0.2s ease-in-out",
        "&:hover": {
          boxShadow: "0 4px 12px rgba(0,0,0,0.1)",
        }
      }}
      className={role}
    >
      <Avatar 
        sx={{ 
          ml: "0",
          width: 40,
          height: 40,
          ...(role === "user" && { 
            bgcolor: "black",
            color: "white",
            fontWeight: "bold"
          })
        }}
      >
        {role === "assistant" ? (
          <img src="codfe_logo.svg" alt="openai" width="30px" />
        ) : (
          auth?.user?.name ? (
            <>
              {auth.user.name[0]}
              {auth.user.name.split(" ")[1]?.[0]}
            </>
          ) : "U"
        )}
      </Avatar>

      <Box sx={{ flex: 1, maxWidth: "calc(100% - 56px)" }}>
        {blocks.map((block, index) => (
          <React.Fragment key={index}>
            {block.isCode ? (
              <Paper 
                elevation={3} 
                sx={{ 
                  my: 2,
                  overflow: "hidden",
                  bgcolor: "#1E1E1E",
                  borderRadius: 1
                }}
              >
                <Box sx={{ 
                  display: "flex",
                  alignItems: "center",
                  px: 2,
                  py: 1,
                  borderBottom: "1px solid rgba(255,255,255,0.1)",
                  bgcolor: "rgba(255,255,255,0.05)"
                }}>
                  <Typography 
                    variant="caption" 
                    sx={{ 
                      color: "#999",
                      textTransform: "uppercase",
                      fontSize: "0.75rem",
                      letterSpacing: "0.5px"
                    }}
                  >
                    {block.language}
                  </Typography>
                </Box>
                <SyntaxHighlighter 
                  language={block.language || "plaintext"}
                  style={coldarkDark}
                  customStyle={{ 
                    margin: 0,
                    padding: "1rem",
                    borderRadius: 0,
                    fontSize: "0.9rem"
                  }}
                >
                  {block.content}
                </SyntaxHighlighter>
              </Paper>
            ) : (
              <Typography 
                sx={{ 
                  fontSize: "1rem",
                  color: role === "assistant" ? "#1A1A1A" : "#FFFFFF",
                  lineHeight: 1.6
                }}
              >
                {block.content}
              </Typography>
            )}
          </React.Fragment>
        ))}
      </Box>
    </Box>
        
    </div>
  );
};

export default ChatItem;