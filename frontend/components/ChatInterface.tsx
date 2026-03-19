'use client';

import { useState, useEffect, useRef } from 'react';
import { Send, Bot, User, Loader2, X, MessageSquare } from 'lucide-react';
import { getCurrentUser } from '@/lib/auth';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  created_at: string;
}

interface ChatInterfaceProps {
  opportunityId: string;
  isOpen?: boolean;
  onToggle?: (open: boolean) => void;
}

function MarkdownMessage({ content }: { content: string }) {
  const lines = content.split('\n');
  const elements: React.ReactNode[] = [];
  let i = 0;

  const renderInline = (text: string) => {
    const parts = text.split(/(\*\*[^*]+\*\*|\*[^*]+\*|`[^`]+`)/g);
    return parts.map((part, idx) => {
      if (part.startsWith('**') && part.endsWith('**'))
        return <strong key={idx}>{part.slice(2, -2)}</strong>;
      if (part.startsWith('*') && part.endsWith('*'))
        return <em key={idx}>{part.slice(1, -1)}</em>;
      if (part.startsWith('`') && part.endsWith('`'))
        return <code key={idx} className="bg-gray-200 dark:bg-gray-600 rounded px-1 text-xs font-mono">{part.slice(1, -1)}</code>;
      return part;
    });
  };

  while (i < lines.length) {
    const line = lines[i];
    if (line.startsWith('### ')) {
      elements.push(<p key={i} className="font-bold text-sm mt-2 mb-1">{renderInline(line.slice(4))}</p>);
    } else if (line.startsWith('## ')) {
      elements.push(<p key={i} className="font-bold text-base mt-3 mb-1">{renderInline(line.slice(3))}</p>);
    } else if (line.startsWith('# ')) {
      elements.push(<p key={i} className="font-bold text-base mt-3 mb-1">{renderInline(line.slice(2))}</p>);
    } else if (/^[-*] /.test(line)) {
      const items: React.ReactNode[] = [];
      while (i < lines.length && /^[-*] /.test(lines[i])) {
        items.push(<li key={i}>{renderInline(lines[i].slice(2))}</li>);
        i++;
      }
      elements.push(<ul key={`ul-${i}`} className="list-disc pl-4 space-y-0.5 my-1">{items}</ul>);
      continue;
    } else if (/^\d+\. /.test(line)) {
      const items: React.ReactNode[] = [];
      while (i < lines.length && /^\d+\. /.test(lines[i])) {
        items.push(<li key={i}>{renderInline(lines[i].replace(/^\d+\. /, ''))}</li>);
        i++;
      }
      elements.push(<ol key={`ol-${i}`} className="list-decimal pl-4 space-y-0.5 my-1">{items}</ol>);
      continue;
    } else if (line.startsWith('> ')) {
      elements.push(<blockquote key={i} className="border-l-2 border-gray-400 pl-3 italic text-gray-600 dark:text-gray-400 my-1">{renderInline(line.slice(2))}</blockquote>);
    } else if (line.trim() === '') {
      elements.push(<div key={i} className="h-2" />);
    } else {
      elements.push(<p key={i} className="leading-relaxed">{renderInline(line)}</p>);
    }
    i++;
  }

  return <div className="space-y-0.5 text-sm">{elements}</div>;
}

export default function ChatInterface({ opportunityId, isOpen = false, onToggle }: ChatInterfaceProps) {
  const [open, setOpen] = useState(isOpen);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Sync with parent state
  useEffect(() => {
    setOpen(isOpen);
  }, [isOpen]);

  const toggleOpen = (newState: boolean) => {
    setOpen(newState);
    onToggle?.(newState);
  };

  useEffect(() => {
    if (open && messages.length === 0 && !initialLoading) {
      fetchMessages();
    }
  }, [open, opportunityId]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const fetchMessages = async () => {
    setInitialLoading(true);
    try {
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_BACKEND_URL}/api/opportunities/${opportunityId}/messages`
      );
      if (response.ok) {
        const data = await response.json();
        setMessages(data.messages || []);
      }
    } catch (error) {
      console.error('Error fetching messages:', error);
    } finally {
      setInitialLoading(false);
    }
  };

  const sendMessage = async () => {
    if (!input.trim() || loading) return;

    const userMessage = input.trim();
    setInput('');
    setLoading(true);

    try {
      const user = getCurrentUser();
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_BACKEND_URL}/api/opportunities/${opportunityId}/chat`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            userId: user?.id || 'demo-user',
            message: userMessage,
          }),
        }
      );

      if (response.ok) {
        const data = await response.json();
        setMessages((prev) => [
          ...prev,
          data.userMessage,
          data.assistantMessage,
        ]);
      } else {
        console.error('Failed to send message');
      }
    } catch (error) {
      console.error('Error sending message:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  return (
    <>
      {/* Floating Chat Button - Always visible when closed */}
      {!open && (
        <button
          onClick={() => toggleOpen(true)}
          className="fixed bottom-6 right-6 z-50 flex h-14 w-14 items-center justify-center rounded-full bg-gradient-to-br from-primary to-secondary text-white shadow-lg transition-all hover:scale-110 active:scale-95 hover:shadow-xl"
          aria-label="Open chat"
        >
          <MessageSquare className="h-6 w-6" />
        </button>
      )}

      {/* Backdrop when open */}
      {open && (
        <div
          className="fixed inset-0 z-40 bg-black/20 dark:bg-black/40 backdrop-blur-sm transition-opacity"
          onClick={() => toggleOpen(false)}
        />
      )}

      {/* Chat Panel - Bottom Drawer */}
      <div className={`
        fixed bottom-0 right-0 z-50
        transition-all duration-300 ease-in-out
        ${open ? 'translate-y-0 opacity-100' : 'translate-y-full opacity-0 pointer-events-none'}
      `}>
        <div className="bg-white dark:bg-gray-800 rounded-lg-t-2xl shadow-2xl border border-gray-200 dark:border-gray-700 flex flex-col w-screen sm:w-[560px] md:w-[680px] h-[75vh] max-h-[800px] m-4 mb-0">
          {/* Header */}
          <div className="flex h-14 items-center justify-between border-b border-gray-200 dark:border-gray-700 px-5 flex-shrink-0 rounded-lg-t-2xl bg-gradient-to-r from-cyan-50 to-white dark:from-gray-800 dark:to-gray-800">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-primary to-secondary flex items-center justify-center">
                <Bot className="h-5 w-5 text-white" />
              </div>
              <span className="text-sm font-semibold text-gray-900 dark:text-white">AI Assistant</span>
            </div>
            <button
              onClick={() => toggleOpen(false)}
              className="flex h-8 w-8 items-center justify-center rounded-full text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          {/* Messages */}
          {initialLoading ? (
            <div className="flex-1 flex items-center justify-center">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : (
            <div className="flex-1 overflow-y-auto p-5 space-y-4">
              {messages.length === 0 ? (
                <div className="text-center text-gray-600 dark:text-gray-400 mt-12">
                  <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-cyan-100 dark:bg-cyan-900/30 flex items-center justify-center">
                    <Bot className="w-8 h-8 text-primary" />
                  </div>
                  <p className="font-semibold text-base mb-2">Start a conversation</p>
                  <p className="text-sm">Ask me anything about this RFP</p>
                </div>
              ) : (
                messages.map((message) => (
                  <div
                    key={message.id}
                    className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
                  >
                    <div
                      className={`max-w-[85%] rounded-2xl px-4 py-2.5 ${
                        message.role === 'user'
                          ? 'bg-primary text-white text-sm'
                          : 'bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-white'
                      }`}
                    >
                      {message.role === 'assistant'
                        ? <MarkdownMessage content={message.content} />
                        : message.content}
                    </div>
                  </div>
                ))
              )}
              {loading && (
                <div className="flex justify-start">
                  <div className="rounded-2xl bg-gray-100 dark:bg-gray-700 px-4 py-2.5 text-sm text-gray-600 dark:text-gray-400">
                    <span className="inline-flex gap-1">
                      <span className="animate-pulse">●</span>
                      <span className="animate-pulse [animation-delay:0.2s]">●</span>
                      <span className="animate-pulse [animation-delay:0.4s]">●</span>
                    </span>
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>
          )}

          {/* Input */}
          <div className="border-t border-gray-200 dark:border-gray-700 p-4 flex-shrink-0 bg-gray-50 dark:bg-gray-800/50">
            <div className="flex items-center gap-3">
              <input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyPress}
                placeholder="Type your message..."
                className="flex-1 rounded-full border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 px-4 py-2.5 text-sm text-gray-900 dark:text-white placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                disabled={loading}
              />
              <button
                onClick={sendMessage}
                disabled={!input.trim() || loading}
                className="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br from-primary to-secondary text-white disabled:opacity-50 disabled:cursor-not-allowed hover:opacity-90 transition-opacity shadow-md"
              >
                <Send className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
