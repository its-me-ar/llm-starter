import { useState, useRef, useEffect } from 'react';
import './App.css';

interface Message {
  role: 'user' | 'ai';
  content: string;
}

function App() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const chatContainerRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (chatContainerRef.current) {
      chatContainerRef.current.scrollTo({ top: chatContainerRef.current.scrollHeight, behavior: 'smooth' });
    }
  }, [messages, isLoading]);

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`;
    }
  }, [input]);

  const handleSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const val = input.trim();
    if (!val || isLoading) return;

    setInput('');
    setMessages(prev => [...prev, { role: 'user', content: val }, { role: 'ai', content: '' }]);
    setIsLoading(true);

    try {
      const response = await fetch('/api/chat/stream', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: val, temperature: 0.7 }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || `Error ${response.status}`);
      }

      const reader = response.body?.getReader();
      const decoder = new TextDecoder();
      let aiContent = '';

      if (reader) {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          const lines = decoder.decode(value).split('\n');
          for (const line of lines) {
            if (line.startsWith('data: ')) {
              const data = line.slice(6).trim();
              if (data === '[DONE]') break;
              try {
                const parsed = JSON.parse(data);
                if (parsed.error) {
                  setMessages(prev => {
                    const next = [...prev];
                    next[next.length - 1].content = parsed.error;
                    return next;
                  });
                  break;
                }
                if (parsed.token) {
                  aiContent += parsed.token;
                  setMessages(prev => {
                    const next = [...prev];
                    next[next.length - 1].content = aiContent;
                    return next;
                  });
                }
              } catch (err) {}
            }
          }
        }
      }
    } catch (err: any) {
      setMessages(prev => {
        const next = [...prev];
        // If the last message is the empty AI slot we added, fill it with the error
        if (next.length > 0 && next[next.length - 1].role === 'ai') {
          next[next.length - 1].content = err.message || 'Something went wrong.';
          return next;
        }
        return [...prev, { role: 'ai', content: err.message || 'Something went wrong.' }];
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  const startNew = () => { setMessages([]); setInput(''); };

  return (
    <div className="app-layout">
      <header className="top-bar">
        <div className="model-info" onClick={startNew}>
          ChatX
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="m6 9 6 6 6-6"/>
          </svg>
        </div>
        <div className="top-right">
          <button className="share-btn">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8"/><polyline points="16 6 12 2 8 6"/><line x1="12" y1="2" x2="12" y2="15"/>
            </svg>
            Share
          </button>
        </div>
      </header>

      <div className="chat-container" ref={chatContainerRef}>
        {messages.length === 0 ? (
          <div className="welcome-screen">
            <h2>How can I help you today?</h2>
          </div>
        ) : (
          <div className="messages-wrapper">
            {messages.map((msg, i) => (
              <div key={i} className={`message ${msg.role}`}>
                <div className="message-bubble">
                  {msg.content}
                  {isLoading && i === messages.length - 1 && msg.role === 'ai' && msg.content === '' && (
                    <div className="loader-container">
                      <div className="standing-bar"></div>
                      <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', fontStyle: 'italic' }}>Thinking...</span>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="input-wrapper">
        <form onSubmit={handleSubmit} className="input-pill">
          <button type="button" className="add-btn">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
            </svg>
          </button>
          <textarea
            ref={textareaRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Ask anything"
            rows={1}
            disabled={isLoading}
          />
          <button type="submit" className="send-btn-circle" disabled={!input.trim() || isLoading}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <line x1="12" y1="19" x2="12" y2="5"/><polyline points="5 12 12 5 19 12"/>
            </svg>
          </button>
        </form>
        <p className="footer-hint">ChatX can make mistakes. Check important info.</p>
      </div>
    </div>
  );
}

export default App;
