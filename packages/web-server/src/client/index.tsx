import React, { useState, useEffect, useRef } from 'react';
import { createRoot } from 'react-dom/client';

interface Message {
  role: 'user' | 'assistant';
  content: string;
}

interface Plant {
  id: string;
  name: string;
  species: string;
}

const App = () => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [plants, setPlants] = useState<Plant[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetchPlants();
  }, []);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const fetchPlants = async () => {
    try {
      const res = await fetch('/api/plants');
      const data = await res.json();
      setPlants(data || []);
    } catch (error) {
      console.error('Failed to fetch plants:', error);
    }
  };

  const handleSend = async () => {
    if (!input.trim() || isLoading) return;

    const userMsg: Message = { role: 'user', content: input };
    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setIsLoading(true);

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: [...messages, userMsg] })
      });

      if (!response.body) throw new Error('No response body');

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let assistantContent = '';
      let buffer = '';
      
      setMessages(prev => [...prev, { role: 'assistant', content: '' }]);

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const parts = buffer.split('\n\n');
        buffer = parts.pop() || '';

        for (const part of parts) {
          const line = part.trim();
          if (line.startsWith('data: ')) {
            try {
              const eventData = JSON.parse(line.slice(6));
              if (eventData.type === 'message_update') {
                const delta = eventData.event?.delta || '';
                assistantContent += delta;
                setMessages(prev => {
                  const last = prev[prev.length - 1];
                  if (last && last.role === 'assistant') {
                    return [...prev.slice(0, -1), { ...last, content: assistantContent }];
                  }
                  return prev;
                });
              } else if (eventData.type === 'agent_end') {
                fetchPlants();
              }
            } catch (e) {
              console.error('Failed to parse SSE event:', e, line);
            }
          }
        }
      }
    } catch (error) {
      console.error('Chat error:', error);
      setMessages(prev => [...prev, { role: 'assistant', content: 'Sorry, I encountered an error.' }]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <>
      <header>
        <h1>🌿 Gairdener</h1>
      </header>
      <main>
        <section id="chat-section">
          <div id="messages">
            {messages.map((m, i) => (
              <div key={i} className={`message ${m.role}`}>
                {m.content}
              </div>
            ))}
            <div ref={messagesEndRef} />
          </div>
          <div id="input-area">
            <input 
              type="text" 
              value={input} 
              onChange={e => setInput(e.target.value)}
              onKeyPress={e => e.key === 'Enter' && handleSend()}
              placeholder="Ask Gairdener anything..."
              disabled={isLoading}
            />
            <button onClick={handleSend} disabled={isLoading}>
              {isLoading ? '...' : 'Send'}
            </button>
          </div>
        </section>
        <aside id="plants-section">
          <h3>Your Plants</h3>
          {plants.map(p => (
            <div key={p.id} className="plant-card">
              <span className="plant-name">{p.name}</span>
              <span className="plant-species">{p.species}</span>
            </div>
          ))}
        </aside>
      </main>
    </>
  );
};

const root = createRoot(document.getElementById('root')!);
root.render(<App />);
