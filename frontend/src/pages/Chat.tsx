import React from 'react';
import ChatGemini from '../components/chat/ChatGemini';
import OldChat from '../components/chat/OldChat';
import { useParams } from 'react-router-dom';
import NewChat from '../components/chat/NewChat';

const Chat = () => {
  const { conversationId } = useParams<{ conversationId?: string }>();

  return (
    <div id="chat">
      {conversationId ? (
        <OldChat conversationId={conversationId} />
      ) : (
        <NewChat />
      )}
    </div>
  );
};

export default Chat;
