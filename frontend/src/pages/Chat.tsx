import React, { useEffect, useState } from "react";
import OldChat from "../components/chat/OldChat";
import { useParams } from "react-router-dom";
import NewChat from "../components/chat/NewChat";

// Define the custom event interface
interface RefreshConversationsEvent extends Event {
  detail?: {
    conversationId?: string;
  };
}

const Chat = () => {
  const { conversationId } = useParams<{ conversationId?: string }>();

  // Ensure conversationId is a string or null
  const initialConversationId = sessionStorage.getItem("conversationId") || conversationId || null;
  const [currentConversation, setCurrentConversation] = useState<string | null>(initialConversationId);

  // Update current conversation when the URL parameter changes
  useEffect(() => {
    if (conversationId) {
      sessionStorage.setItem("conversationId", conversationId);
      setCurrentConversation(conversationId);
    } else {
      setCurrentConversation(null); // Ensure the state is consistent
    }
  }, [conversationId]);

  // Listen for the custom event with additional data
  useEffect(() => {
    const handleRefresh = (event: Event) => {
      const customEvent = event as RefreshConversationsEvent;

      if (customEvent.detail?.conversationId) {
        setCurrentConversation(customEvent.detail.conversationId);
      } else {
        setCurrentConversation(conversationId ?? null);
      }
    };

    window.addEventListener("refreshConversations", handleRefresh);
    return () => {
      window.removeEventListener("refreshConversations", handleRefresh);
    };
  }, [conversationId]);

  return (
    <div id="chat" className="size-full">
      {currentConversation ? (
        <OldChat key={currentConversation} conversationId={currentConversation} />
      ) : (
        <NewChat />
      )}
    </div>
  );
};

export default Chat;
