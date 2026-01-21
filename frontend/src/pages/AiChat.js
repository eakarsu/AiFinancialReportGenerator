import React, { useState, useRef, useEffect } from 'react';
import { Brain, User, Send } from 'lucide-react';
import { chatWithAi } from '../services/api';

function AiChat() {
  const [messages, setMessages] = useState([
    {
      role: 'ai',
      content: 'Hello! I\'m your AI Financial Assistant. I can help you with:\n\n• Analyzing financial statements and reports\n• Understanding revenue forecasts and trends\n• Explaining budget variances\n• Identifying anomalies in your data\n• Providing tax optimization suggestions\n• Answering questions about your financial metrics\n\nHow can I help you today?'
    }
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!input.trim() || loading) return;

    const userMessage = input.trim();
    setInput('');
    setMessages((prev) => [...prev, { role: 'user', content: userMessage }]);
    setLoading(true);

    try {
      const response = await chatWithAi(userMessage, null, null);
      setMessages((prev) => [...prev, { role: 'ai', content: response.data.response }]);
    } catch (error) {
      console.error('Error:', error);
      setMessages((prev) => [...prev, { role: 'ai', content: 'I apologize, but I encountered an error processing your request. Please try again.' }]);
    } finally {
      setLoading(false);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e);
    }
  };

  const suggestedQuestions = [
    'Analyze our Q4 financial performance',
    'What are the key trends in our revenue?',
    'Explain the budget variance in Marketing',
    'How can we optimize our tax strategy?'
  ];

  return (
    <div className="card" style={{ height: 'calc(100vh - 160px)', display: 'flex', flexDirection: 'column' }}>
      <div className="card-header">
        <h3 className="card-title" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Brain size={20} />
          AI Financial Assistant
        </h3>
      </div>

      <div className="chat-messages" style={{ flex: 1, overflowY: 'auto', padding: '24px' }}>
        {messages.map((message, index) => (
          <div key={index} className={`chat-message ${message.role}`}>
            <div className={`chat-avatar ${message.role}`}>
              {message.role === 'ai' ? <Brain size={18} /> : <User size={18} />}
            </div>
            <div className={`chat-bubble ${message.role}`}>
              <div style={{ whiteSpace: 'pre-wrap' }}>{message.content}</div>
            </div>
          </div>
        ))}
        {loading && (
          <div className="chat-message ai">
            <div className="chat-avatar ai">
              <Brain size={18} />
            </div>
            <div className="chat-bubble ai">
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <div className="loading-spinner" style={{ width: '16px', height: '16px', borderWidth: '2px' }}></div>
                Thinking...
              </div>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {messages.length === 1 && (
        <div style={{ padding: '0 24px 16px' }}>
          <div style={{ fontSize: '13px', color: '#6b7280', marginBottom: '12px' }}>Suggested questions:</div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
            {suggestedQuestions.map((question, index) => (
              <button
                key={index}
                onClick={() => setInput(question)}
                style={{
                  padding: '8px 16px',
                  borderRadius: '20px',
                  border: '1px solid #e5e7eb',
                  background: 'white',
                  fontSize: '13px',
                  cursor: 'pointer',
                  transition: 'all 0.2s'
                }}
                onMouseOver={(e) => e.target.style.borderColor = '#3b82f6'}
                onMouseOut={(e) => e.target.style.borderColor = '#e5e7eb'}
              >
                {question}
              </button>
            ))}
          </div>
        </div>
      )}

      <div className="chat-input-container">
        <form onSubmit={handleSubmit} className="chat-input-wrapper">
          <textarea
            className="chat-input"
            placeholder="Ask me anything about your financial data..."
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            rows={1}
            disabled={loading}
          />
          <button type="submit" className="btn btn-primary" disabled={loading || !input.trim()}>
            <Send size={18} />
          </button>
        </form>
      </div>
    </div>
  );
}

export default AiChat;
