"use client";

import React, { useState } from 'react';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { api } from '@/services/api';
import { Sparkles, Send, ChevronRight, Bot } from 'lucide-react';

const T = {
  ink: '#101828', secondary: '#344054', muted: '#667085', mutedLight: '#98A2B3',
  surface: '#FFFFFF', border: '#E4E7EC', borderSubtle: '#F2F4F7',
  ai: '#7A5AF8', aiSubtle: '#F4F3FF',
};

const PROMPTS = [
  "How much did I spend this month?",
  "What are my biggest expenses?",
  "Am I on track with my budgets?",
  "Compare my spending to last month.",
  "Find unusual spending.",
  "How much did I save this month?",
];

interface Msg { role: 'user' | 'assistant'; content: string }

export default function AiPage() {
  const [messages, setMessages] = useState<Msg[]>([
    { role: 'assistant', content: "Hi! I'm your AI Finance Assistant. Ask me anything about your spending, budgets, income, or savings." },
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);

  const send = async (q: string) => {
    if (!q.trim() || loading) return;
    setInput('');
    setMessages(prev => [...prev, { role: 'user', content: q }]);
    setLoading(true);
    try {
      const { data } = await api.post('/ai/chat', { query: q });
      setMessages(prev => [...prev, { role: 'assistant', content: typeof data === 'string' ? data : JSON.stringify(data) }]);
    } catch {
      setMessages(prev => [...prev, { role: 'assistant', content: "Sorry, I couldn't process that. Try again." }]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <DashboardLayout>
      <div className="flex items-end justify-between mb-7">
        <div>
          <h1 className="text-[22px] font-bold tracking-tight flex items-center gap-2" style={{ color: T.ink }}>
            <Sparkles size={22} style={{ color: T.ai }} />
            AI Finance Assistant
          </h1>
          <p className="text-[13px] mt-0.5" style={{ color: T.muted }}>Your intelligent financial copilot.</p>
        </div>
        <span className="px-2.5 py-1 text-[10px] font-bold rounded-full uppercase tracking-wider"
          style={{ backgroundColor: T.aiSubtle, color: T.ai }}>Beta</span>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-4" style={{ height: 'calc(100vh - 200px)' }}>
        {/* Suggested prompts */}
        <div className="hidden lg:block">
          <div className="rounded-xl p-5" style={{ backgroundColor: T.surface, border: `1px solid ${T.border}`, boxShadow: '0 1px 3px rgba(16,24,40,0.06)' }}>
            <h3 className="text-[12px] font-bold uppercase tracking-wider mb-3 flex items-center gap-1.5"
              style={{ color: T.muted }}>
              <Sparkles size={12} style={{ color: T.ai }} /> Suggested
            </h3>
            <div className="space-y-1">
              {PROMPTS.map((p, i) => (
                <button key={i} onClick={() => send(p)}
                  className="w-full text-left text-[12.5px] px-3 py-2.5 rounded-lg flex items-center justify-between gap-2 group transition-all"
                  style={{ color: T.secondary }}
                  onMouseEnter={e => { (e.currentTarget as HTMLElement).style.backgroundColor = T.aiSubtle; (e.currentTarget as HTMLElement).style.color = T.ai; }}
                  onMouseLeave={e => { (e.currentTarget as HTMLElement).style.backgroundColor = 'transparent'; (e.currentTarget as HTMLElement).style.color = T.secondary; }}>
                  <span className="leading-snug">{p}</span>
                  <ChevronRight size={13} className="flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity" />
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Chat */}
        <div className="lg:col-span-3 flex flex-col rounded-xl overflow-hidden"
          style={{ backgroundColor: T.surface, border: `1px solid ${T.border}`, boxShadow: '0 1px 3px rgba(16,24,40,0.06)' }}>
          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-5 space-y-4">
            {messages.map((m, i) => (
              <div key={i} className={`flex gap-3 ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                {m.role === 'assistant' && (
                  <div className="w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5"
                    style={{ backgroundColor: T.aiSubtle }}>
                    <Bot size={14} style={{ color: T.ai }} />
                  </div>
                )}
                <div className="max-w-[75%] px-4 py-3 text-[13px] leading-relaxed"
                  style={{
                    borderRadius: m.role === 'user' ? '14px 14px 4px 14px' : '14px 14px 14px 4px',
                    backgroundColor: m.role === 'user' ? T.ink : T.borderSubtle,
                    color: m.role === 'user' ? '#FFFFFF' : T.ink,
                  }}>
                  {m.content}
                </div>
              </div>
            ))}
            {loading && (
              <div className="flex gap-3">
                <div className="w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0" style={{ backgroundColor: T.aiSubtle }}>
                  <Bot size={14} style={{ color: T.ai }} />
                </div>
                <div className="px-4 py-3 flex items-center gap-1.5" style={{ backgroundColor: T.borderSubtle, borderRadius: '14px 14px 14px 4px' }}>
                  {[0,1,2].map(j => <div key={j} className="w-1.5 h-1.5 rounded-full animate-bounce" style={{ backgroundColor: T.ai, animationDelay: `${j*120}ms` }} />)}
                </div>
              </div>
            )}
          </div>

          {/* Mobile prompts */}
          <div className="lg:hidden px-4 pb-3 flex gap-2 overflow-x-auto">
            {PROMPTS.slice(0, 3).map((p, i) => (
              <button key={i} onClick={() => send(p)}
                className="whitespace-nowrap text-[11px] px-3 py-1.5 rounded-full flex-shrink-0"
                style={{ backgroundColor: T.aiSubtle, color: T.ai }}>
                {p}
              </button>
            ))}
          </div>

          {/* Input */}
          <div className="p-4" style={{ borderTop: `1px solid ${T.border}` }}>
            <div className="relative flex items-center">
              <input type="text" value={input} onChange={e => setInput(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && send(input)}
                placeholder="Ask about your finances…"
                className="w-full pl-4 pr-12 py-3 text-[13px] rounded-lg outline-none transition-all"
                style={{ backgroundColor: '#F6F8F7', border: `1px solid ${T.border}`, color: T.ink }}
                onFocus={e => { (e.currentTarget as HTMLElement).style.borderColor = T.ai; }}
                onBlur={e => { (e.currentTarget as HTMLElement).style.borderColor = T.border; }} />
              <button onClick={() => send(input)} disabled={!input.trim() || loading}
                className="absolute right-2 p-2 rounded-lg transition-all disabled:opacity-30"
                style={{ backgroundColor: T.ai, color: '#FFFFFF' }}>
                <Send size={14} />
              </button>
            </div>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
