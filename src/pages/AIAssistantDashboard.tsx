import React, { useState, useRef, useEffect } from 'react';
import { Bot, Send, Sparkles, User } from 'lucide-react';
import { motion } from 'motion/react';
import { cn } from '../lib/utils';

interface Message {
  id: string;
  sender: 'assistant' | 'user';
  text: string;
}

const initialMessages: Message[] = [
  {
    id: '1',
    sender: 'assistant',
    text: 'Hello! I am the Mill AI Assistant. How can I help you with your business today?'
  }
];

export default function AIAssistantDashboard() {
  const [messages, setMessages] = useState<Message[]>(initialMessages);
  const [inputValue, setInputValue] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const sessionId = useRef(Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15));

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isTyping]);

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputValue.trim()) return;

    const userText = inputValue.trim();
    const newUserMsg: Message = {
      id: Date.now().toString(),
      sender: 'user',
      text: userText
    };

    setMessages(prev => [...prev, newUserMsg]);
    setInputValue('');
    setIsTyping(true);

    try {
      const response = await fetch('https://n8n.srv843245.hstgr.cloud/webhook/ad8607fb-86d3-4f87-9ac4-2e3c596991ff', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          sessionId: sessionId.current,
          message: userText 
        }),
      });

      if (!response.ok) {
        throw new Error('Network response was not ok');
      }

      const contentType = response.headers.get("content-type");
      let aiText = "Message received successfully.";
      
      if (contentType && contentType.indexOf("application/json") !== -1) {
        const data = await response.json();
        // Try to extract a meaningful text response from common n8n webhook output formats
        aiText = data.output || data.message || data.text || data.response || (typeof data === 'string' ? data : JSON.stringify(data));
      } else {
        aiText = await response.text();
      }

      const newAiMsg: Message = {
        id: (Date.now() + 1).toString(),
        sender: 'assistant',
        text: aiText || 'Message received successfully.'
      };
      setMessages(prev => [...prev, newAiMsg]);
    } catch (error) {
      console.error('Error sending message to webhook:', error);
      const errorMsg: Message = {
        id: (Date.now() + 1).toString(),
        sender: 'assistant',
        text: 'Sorry, I encountered an error while trying to process your request.'
      };
      setMessages(prev => [...prev, errorMsg]);
    } finally {
      setIsTyping(false);
    }
  };

  // Helper to format text: highlights numbers and handles newlines/bullets
  const formatMessage = (text: string) => {
    return text.split('\n').map((line, i) => {
      // Highlight numbers and percentages (e.g., 24,680, 91.6%)
      const parts = line.split(/(\b\d+(?:,\d+)*(?:\.\d+)?%?\b)/g);
      
      return (
        <p key={i} className={cn("mb-1.5 last:mb-0", line.startsWith('•') ? "pl-4" : "")}>
          {parts.map((part, j) => {
            if (/^\d+(?:,\d+)*(?:\.\d+)?%?$/.test(part)) {
              return <span key={j} className="text-white font-semibold">{part}</span>;
            }
            return part;
          })}
        </p>
      );
    });
  };

  return (
    <div className="space-y-6 h-full flex flex-col">
      {/* Header Section */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 shrink-0">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight">AI Assistant</h1>
          <p className="text-sm text-slate-400 mt-1">Ask anything about your business</p>
        </div>
        <div className="hidden sm:block text-sm font-medium text-slate-400 bg-slate-900/50 px-4 py-2 rounded-lg border border-slate-800">
          Fri, 10 Apr 2026
        </div>
      </div>

      {/* Main Chat Container */}
      <div className="bg-[#111827] border border-slate-800 rounded-2xl flex flex-col flex-1 shadow-xl overflow-hidden min-h-[500px]">
        
        {/* Chat Header */}
        <div className="px-6 py-4 border-b border-slate-800 bg-slate-900/50 flex justify-between items-center shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-500/10 flex items-center justify-center text-blue-500 shadow-[0_0_15px_rgba(59,130,246,0.2)]">
              <Bot className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-white font-semibold tracking-tight">Mill AI Assistant</h2>
              <div className="flex items-center gap-1.5 text-xs text-emerald-400 font-medium mt-0.5">
                <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse shadow-[0_0_8px_rgba(52,211,153,0.8)]" />
                Connected via n8n webhook
              </div>
            </div>
          </div>
          <div className="px-3 py-1.5 rounded-full bg-slate-800 border border-slate-700 text-xs font-medium text-slate-300 flex items-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5 text-yellow-500" />
            Powered by AI Agent
          </div>
        </div>

        {/* Chat Messages Area */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6 scroll-smooth">
          {messages.map((msg) => (
            <motion.div 
              key={msg.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3 }}
              className={cn(
                "flex gap-4 max-w-[85%]",
                msg.sender === 'user' ? "ml-auto flex-row-reverse" : ""
              )}
            >
              {/* Avatar */}
              <div className="shrink-0 mt-1">
                {msg.sender === 'assistant' ? (
                  <div className="w-8 h-8 rounded-lg bg-blue-500/10 flex items-center justify-center text-blue-500 border border-blue-500/20">
                    <Bot className="w-5 h-5" />
                  </div>
                ) : (
                  <div className="w-8 h-8 rounded-lg bg-yellow-500/10 flex items-center justify-center text-yellow-500 border border-yellow-500/20">
                    <User className="w-5 h-5" />
                  </div>
                )}
              </div>

              {/* Message Bubble */}
              <div 
                className={cn(
                  "px-5 py-3.5 rounded-2xl text-sm leading-relaxed shadow-sm",
                  msg.sender === 'assistant' 
                    ? "bg-slate-800/80 text-slate-300 border border-slate-700/50 rounded-tl-sm" 
                    : "bg-yellow-500 text-slate-900 rounded-tr-sm font-medium shadow-[0_4px_15px_rgba(234,179,8,0.15)]"
                )}
              >
                {msg.sender === 'assistant' ? formatMessage(msg.text) : msg.text}
              </div>
            </motion.div>
          ))}
          
          {/* Typing Indicator */}
          {isTyping && (
            <motion.div 
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex gap-4 max-w-[85%]"
            >
              <div className="shrink-0 mt-1">
                <div className="w-8 h-8 rounded-lg bg-blue-500/10 flex items-center justify-center text-blue-500 border border-blue-500/20">
                  <Bot className="w-5 h-5" />
                </div>
              </div>
              <div className="px-5 py-4 rounded-2xl bg-slate-800/80 border border-slate-700/50 rounded-tl-sm flex items-center gap-1.5">
                <div className="w-1.5 h-1.5 bg-slate-500 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                <div className="w-1.5 h-1.5 bg-slate-500 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                <div className="w-1.5 h-1.5 bg-slate-500 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
              </div>
            </motion.div>
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Bottom Input Section */}
        <div className="p-4 bg-slate-900/80 border-t border-slate-800 shrink-0">
          <form onSubmit={handleSend} className="flex gap-3 max-w-5xl mx-auto">
            <input 
              type="text"
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              placeholder="Ask anything about your business — sales, production, inventory, payments..."
              className="flex-1 bg-slate-800/50 border border-slate-700 rounded-xl px-5 py-3.5 text-sm text-white placeholder:text-slate-500 focus:outline-none focus:border-yellow-500 focus:ring-1 focus:ring-yellow-500 transition-all shadow-inner"
            />
            <button 
              type="submit"
              disabled={!inputValue.trim() || isTyping}
              className="bg-yellow-500 hover:bg-yellow-400 disabled:opacity-50 disabled:hover:bg-yellow-500 text-slate-900 px-6 py-3.5 rounded-xl font-semibold flex items-center gap-2 transition-all shadow-[0_0_15px_rgba(234,179,8,0.2)]"
            >
              <span>Send</span>
              <Send className="w-4 h-4" />
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
