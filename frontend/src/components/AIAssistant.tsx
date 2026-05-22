import React, { useState, useRef, useEffect } from 'react';
import './AIAssistant.css';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

export const AIAssistant: React.FC = () => {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: '1',
      role: 'assistant',
      content: 'Hello! I\'m your NBA Dream Team Assistant. I can help you analyze player stats, optimize your team, and provide insights. What would you like to know?',
      timestamp: new Date(),
    },
  ]);
  const [inputValue, setInputValue] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSendMessage = () => {
    if (!inputValue.trim()) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: inputValue,
      timestamp: new Date(),
    };

    setMessages(prev => [...prev, userMessage]);
    setInputValue('');

    setTimeout(() => {
      const assistantMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: 'Thanks for your message! Backend integration coming soon. Stay tuned for real AI insights!',
        timestamp: new Date(),
      };
      setMessages(prev => [...prev, assistantMessage]);
    }, 500);
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  return (
    <div className="ai-assistant">
      <h2>AI Assistant</h2>
      <div className="messages-container">
        {messages.map(msg => (
          <div key={msg.id} className={`message ${msg.role}`}>
            <div className="message-avatar">
              {msg.role === 'assistant' ? '🤖' : '👤'}
            </div>
            <div className="message-content">
              <p>{msg.content}</p>
              <span className="timestamp">
                {msg.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </span>
            </div>
          </div>
        ))}
        <div ref={messagesEndRef} />
      </div>

      <div className="input-area">
        <textarea
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          onKeyPress={handleKeyPress}
          placeholder="Ask a question..."
          className="message-input"
          rows={3}
        />
        <button
          onClick={handleSendMessage}
          disabled={!inputValue.trim()}
          className="send-btn"
        >
          Send
        </button>
      </div>
    </div>
  );
};
