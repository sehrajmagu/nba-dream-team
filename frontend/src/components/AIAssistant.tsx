import React, { useState, useRef, useEffect } from 'react';
import { DraftedRoster, DraftSlot } from '../types';
import { DraftModalData } from './DraftModal';
import './AIAssistant.css';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

interface AIAssistantProps {
  isDraftScreen: boolean;
  draftModal: DraftModalData | null;
  roster: DraftedRoster;
  draftAdviceUsesRemaining: number;
  onUseDraftAdvice: () => void;
}

const ROSTER_SLOT_ORDER: DraftSlot[] = ['PG', 'SG', 'SF', 'PF', 'C', 'B1', 'B2', 'B3', 'B4', 'B5'];

const formatSlotLabel = (slot: DraftSlot): string => {
  if (['PG', 'SG', 'SF', 'PF', 'C'].includes(slot)) return slot;
  return `Bench ${slot.slice(1)}`;
};

const buildDraftAdvicePrompt = (modal: DraftModalData, roster: DraftedRoster): string => {
  const candidateLines = modal.candidates
    .map((p, i) =>
      `${i + 1}. ${p.name} — ${p.position}, ${p.team_abbreviation}, $${p.price}M, ` +
      `PIE ${p.pie}, TS% ${(p.ts_pct * 100).toFixed(1)}, USG% ${(p.usg_pct * 100).toFixed(1)}, ` +
      `DEF RTG ${p.def_rating}, Tier ${p.tier_class}`
    )
    .join('\n');

  const rosterLines = ROSTER_SLOT_ORDER.map(slot => {
    const player = roster[slot];
    return `${formatSlotLabel(slot)}: ${player ? player.name : '(empty)'}`;
  }).join('\n');

  return (
    `I'm drafting for the ${formatSlotLabel(modal.slot)} slot (Tier ${modal.tier} pull). ` +
    `Here are my 5 candidate cards:\n${candidateLines}\n\n` +
    `Here is my roster drafted so far:\n${rosterLines}\n\n` +
    `Which of the 5 candidates should I draft for this slot, and why? ` +
    `Consider fit with my existing roster as well as the stats above. Keep it concise.`
  );
};

export const AIAssistant: React.FC<AIAssistantProps> = ({
  isDraftScreen,
  draftModal,
  roster,
  draftAdviceUsesRemaining,
  onUseDraftAdvice,
}) => {
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

  const sendChatRequest = async (displayText: string, promptOverride?: string) => {
    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: displayText,
      timestamp: new Date(),
    };

    setMessages(prev => [...prev, userMessage]);
    setIsLoading(true);

    try {
      const response = await fetch('http://localhost:5050/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message: promptOverride ?? displayText,
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
        content: 'Sorry, I encountered an error. Make sure the backend is running on http://localhost:5050.',
        timestamp: new Date(),
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSendMessage = () => {
    if (!inputValue.trim()) return;
    const text = inputValue;
    setInputValue('');
    sendChatRequest(text);
  };

  const handleGetDraftAdvice = () => {
    if (!draftModal || draftAdviceUsesRemaining <= 0 || isLoading) return;
    onUseDraftAdvice();
    const prompt = buildDraftAdvicePrompt(draftModal, roster);
    sendChatRequest(`Get Draft Advice — ${formatSlotLabel(draftModal.slot)} (Tier ${draftModal.tier})`, prompt);
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

      {isDraftScreen && draftModal && (
        <div className="draft-advice-bar">
          <button
            onClick={handleGetDraftAdvice}
            disabled={draftAdviceUsesRemaining <= 0 || isLoading}
            className="draft-advice-btn"
          >
            {draftAdviceUsesRemaining > 0
              ? `Get Draft Advice (${draftAdviceUsesRemaining} use${draftAdviceUsesRemaining === 1 ? '' : 's'} remaining)`
              : 'No draft advice remaining'}
          </button>
        </div>
      )}

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
