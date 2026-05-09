import { useState, useRef, useEffect } from 'react';
import './App.css';

interface Source {
  chunk_index: number;
  source_file: string;
  similarity: number;
  preview: string;
}

interface Message {
  role: 'user' | 'ai';
  content: string;
  sources?: Source[];
}

interface Session {
  id: string;
  created_at: string;
}

function App() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [activeFile, setActiveFile] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [sessions, setSessions] = useState<Session[]>([]);
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  
  const chatContainerRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    initSession();
    fetchSessions();
  }, []);

  const fetchSessions = async () => {
    try {
      const response = await fetch('/api/v2/ai/sessions');
      const data = await response.json();
      if (data.sessions) {
        setSessions(data.sessions);
      }
    } catch (error) {
      console.error('Failed to fetch sessions:', error);
    }
  };

  const loadSession = async (id: string) => {
    try {
      setIsLoading(true);
      const response = await fetch(`/api/v2/ai/sessions/${id}/messages`);
      const data = await response.json();
      if (data.messages) {
        setMessages(data.messages.map((m: any) => ({
          role: m.role,
          content: m.message,
          sources: m.sources // if stored
        })));
        setSessionId(id);
        setActiveFile(null); // Reset file context for old chats unless stored
      }
    } catch (error) {
      console.error('Failed to load session:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const initSession = async () => {
    try {
      const response = await fetch('/api/v2/ai/conversation', { method: 'POST' });
      const data = await response.json();
      if (data.session_id) {
        setSessionId(data.session_id);
        fetchSessions();
      }
    } catch (error) {
      console.error('Failed to initialize session:', error);
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    const formData = new FormData();
    formData.append('pdf', file);

    try {
      const response = await fetch('/api/v2/ai/upload', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) throw new Error('Upload failed');
      
      const data = await response.json();
      setActiveFile(file.name);
    } catch (error) {
      console.error('Upload error:', error);
      alert('Failed to upload PDF');
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

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
      // If we have an active file, use RAG endpoint (v2/ask)
      if (activeFile && sessionId) {
        const response = await fetch(`/api/v2/ai/ask?question=${encodeURIComponent(val)}&session_id=${sessionId}`, {
          method: 'GET',
        });

        if (!response.ok) throw new Error('RAG request failed');
        
        const data = await response.json();
        setMessages(prev => {
          const next = [...prev];
          next[next.length - 1].content = data.answer;
          next[next.length - 1].sources = data.sources;
          return next;
        });
      } else {
        // Fallback to general chat stream
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
      }
    } catch (err: any) {
      setMessages(prev => {
        const next = [...prev];
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

  const startNew = () => { 
    setMessages([]); 
    setInput(''); 
    setActiveFile(null);
    initSession(); 
  };

  return (
    <div className={`app-layout ${isSidebarOpen ? 'sidebar-open' : ''}`}>
      <aside className="sidebar">
        <div className="sidebar-header">
          <button className="new-chat-btn" onClick={startNew}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
            </svg>
            New Chat
          </button>
          <button className="toggle-sidebar" onClick={() => setIsSidebarOpen(false)}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <rect x="3" y="3" width="18" height="18" rx="2" ry="2"/><line x1="9" y1="3" x2="9" y2="21"/>
            </svg>
          </button>
        </div>
        <div className="sessions-list">
          <p className="section-title">Past Chats</p>
          {sessions.map(s => (
            <div 
              key={s.id} 
              className={`session-item ${sessionId === s.id ? 'active' : ''}`}
              onClick={() => loadSession(s.id)}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
              </svg>
              <span>{new Date(s.created_at).toLocaleDateString()} Chat</span>
            </div>
          ))}
        </div>
      </aside>

      <main className="main-content">
        <header className="top-bar">
          <div className="top-left">
            {!isSidebarOpen && (
              <button className="toggle-sidebar-show" onClick={() => setIsSidebarOpen(true)}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <rect x="3" y="3" width="18" height="18" rx="2" ry="2"/><line x1="9" y1="3" x2="9" y2="21"/>
                </svg>
              </button>
            )}
            <div className="model-info" onClick={startNew}>
              ChatX
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="m6 9 6 6 6-6"/>
              </svg>
            </div>
          </div>
          <div className="top-right">
            {activeFile && (
              <div className="file-pill">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/>
                </svg>
                <span>{activeFile}</span>
                <button onClick={() => setActiveFile(null)} className="close-file">×</button>
              </div>
            )}
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
                    
                    {msg.sources && msg.sources.length > 0 && (
                      <div className="sources-container">
                        <p className="sources-title">Sources:</p>
                        <div className="sources-list">
                          {msg.sources.map((s, si) => (
                            <div key={si} className="source-item" title={s.preview}>
                              [{s.chunk_index}] {s.source_file}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {isLoading && i === messages.length - 1 && msg.role === 'ai' && msg.content === '' && (
                      <div className="loader-container">
                        <div className="standing-bar"></div>
                        <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', fontStyle: 'italic' }}>
                          {isUploading ? 'Uploading document...' : 'Thinking...'}
                        </span>
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
            <input 
              type="file" 
              ref={fileInputRef} 
              style={{ display: 'none' }} 
              accept=".pdf" 
              onChange={handleFileUpload}
            />
            <button 
              type="button" 
              className="add-btn" 
              onClick={() => fileInputRef.current?.click()}
              disabled={isUploading}
            >
              {isUploading ? (
                <div className="spinner-small"></div>
              ) : (
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
                </svg>
              )}
            </button>
            <textarea
              ref={textareaRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={activeFile ? `Ask about ${activeFile}...` : "Ask anything"}
              rows={1}
              disabled={isLoading || isUploading}
            />
            <button type="submit" className="send-btn-circle" disabled={!input.trim() || isLoading || isUploading}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <line x1="12" y1="19" x2="12" y2="5"/><polyline points="5 12 12 5 19 12"/>
              </svg>
            </button>
          </form>
          <p className="footer-hint">ChatX can make mistakes. Check important info.</p>
        </div>
      </main>
    </div>
  );
}

export default App;
