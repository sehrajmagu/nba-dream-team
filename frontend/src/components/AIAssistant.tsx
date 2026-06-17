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
      content: 'Hello! I\'m your NBA Gauntlet Assistant. I can help you scout players, plan your draft picks, and break down matchups. What would you like to know?',
      timestamp: new Date(),
    },
  ]);
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSendMessage = async () => {
    if (!inputValue.trim()) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: inputValue,
      timestamp: new Date(),
    };

    setMessages(prev => [...prev, userMessage]);
    setInputValue('');
    setIsLoading(true);

    try {
      const response = await fetch('http://localhost:5000/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message: userMessage.content,
        }),
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      const data = await response.json();
      const assistantMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: data.response || 'Sorry, I couldn\'t generate a response. Please try again.',
        timestamp: new Date(),
      };
      setMessages(prev => [...prev, assistantMessage]);
    } catch (error) {
      console.error('Chat error:', error);
      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: 'Sorry, I encountered an error. Make sure the backend is running on http://localhost:5000.',
        timestamp: new Date(),
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
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
              {msg.role === 'assistant' ? (
                <div className="formatted-response">
                  {msg.content.split('\n').map((line, idx) => {
                    if (!line.trim()) return <br key={idx} />;
                    
                    // Parse markdown: **text** → bold, * item → bullet point
                    const parts: React.ReactNode[] = [];
                    let lastIdx = 0;
                    const boldRegex = /\*\*([^\*]+)\*\*/g;
                    let match;
                    
                    while ((match = boldRegex.exec(line)) !== null) {
                      if (match.index > lastIdx) {
                        parts.push(line.slice(lastIdx, match.index));
                      }
                      parts.push(<strong key={`bold-${idx}-${match.index}`}>{match[1]}</strong>);
                      lastIdx = boldRegex.lastIndex;
                    }
                    
                    if (lastIdx < line.length) {
                      parts.push(line.slice(lastIdx));
                    }
                    
                    // Format bullet points
                    if (line.trim().startsWith('*')) {
                      return (
                        <li key={idx} style={{ marginLeft: '20px' }}>
                          {parts.length > 0 ? parts : line.replace(/^\*\s/, '')}
                        </li>
                      );
                    }
                    
                    return (
                      <p key={idx} style={{ margin: '8px 0' }}>
                        {parts.length > 0 ? parts : line}
                      </p>
                    );
                  })}
                </div>
              ) : (
                <p>{msg.content}</p>
              )}
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
          disabled={isLoading}
        />
        <button
          onClick={handleSendMessage}
          disabled={!inputValue.trim() || isLoading}
          className="send-btn"
        >
          {isLoading ? 'Sending...' : 'Send'}
        </button>
      </div>
    </div>
  );
};
