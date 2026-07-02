'use client';

import { useRef, useEffect, useState, useCallback } from 'react';
import { useJourney } from '@/context/JourneyContext';
import MessageBubble from './MessageBubble';

export default function ChatPanel() {
  const { state, dispatch } = useJourney();
  const stateRef = useRef(state);
  
  // Keep ref in sync with latest state
  useEffect(() => {
    stateRef.current = state;
  }, [state]);

  const [messages, setMessages] = useState<any[]>([]);
  const [prompt, setPrompt] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isLoading, state.isThinking]);

  const sendToAI = useCallback(async (newMessages: any[]) => {
    setIsLoading(true);

    try {
      // Build clean message array for API
      const apiMessages = newMessages.map(m => {
        let content = m.content;
        if (!content && m.tool_calls) {
          // Summarize tool calls so context is preserved
          content = m.tool_calls.map((c: any) => `[Action: ${c.function?.name || c.name}]`).join('\n');
        }
        return { role: m.role === 'assistant' ? 'assistant' : m.role, content: content || '' };
      }).filter((m: any) => m.content); // Filter empty

      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: apiMessages })
      });

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.error || 'API Error');
      }
      
      const data = await res.json();

      // Add the AI's text response to messages
      const aiText = data.message?.content || '';
      if (aiText) {
        const updatedMessages = [...newMessages, { role: 'assistant', content: aiText }];
        setMessages(updatedMessages);
      }

      let hasPhaseChange = false;
      // Process UI actions from the backend
      if (data.uiActions && data.uiActions.length > 0) {
        for (const action of data.uiActions) {
          if (action.name === 'setPhase') {
            hasPhaseChange = true;
            dispatch({ type: 'SET_PHASE', phase: action.arguments.phase });

            // If the AI sent dynamic questions with the clarify phase, set them
            if (action.arguments.phase === 'clarify' && action.arguments.questions) {
              dispatch({
                type: 'SET_DYNAMIC_QUESTIONS',
                questions: action.arguments.questions
              });
            }
          } else if (action.name === 'updateQuote') {
            // Transform to QuoteItem format
            const bom = action.arguments.items.map((item: any) => ({
              id: item.sku,
              name: item.name,
              price: item.price,
              spec: item.reason || item.category || '',
              sku: item.sku,
              imageUrl: item.imageUrl || undefined,
              category: item.category || '',
              required: item.required || false,
              reason: item.reason,
              quantity: item.quantity || 1,
              lineTotal: item.price * (item.quantity || 1),
              stock: { label: 'In stock · NSW DC', color: '#4E7C59' }
            }));
            dispatch({ 
              type: 'SET_QUOTE_DATA', 
              title: action.arguments.title, 
              bom,
              jobId: action.arguments.jobId,
              installationSummary: action.arguments.installationSummary,
              warrantySummary: action.arguments.warrantySummary
            });
          } else if (action.name === 'showProducts') {
            // Product recommendations — set them in state for ProductsPanel
            dispatch({
              type: 'SET_RECOMMENDED_PRODUCTS',
              products: action.arguments.products
            });
          } else if (action.name === 'showGuide') {
            // Troubleshooting or installation guide steps
            dispatch({
              type: 'SET_GUIDE_STEPS',
              steps: action.arguments.steps
            });
            hasPhaseChange = true;
          }
        }
        // If AI called updateQuote but forgot setPhase('quote'), do it
        if (!hasPhaseChange && data.uiActions.some((a: any) => a.name === 'updateQuote')) {
          dispatch({ type: 'SET_PHASE', phase: 'quote' });
          hasPhaseChange = true;
        }
        // If AI called showProducts but forgot setPhase('products'), do it
        if (!hasPhaseChange && data.uiActions.some((a: any) => a.name === 'showProducts')) {
          dispatch({ type: 'SET_PHASE', phase: 'products' });
          hasPhaseChange = true;
        }
      }
      
      // Safety: if we're stuck on 'validating' and the AI didn't transition us
      if (!hasPhaseChange) {
        const latestState = stateRef.current;
        // Fallback to the most relevant phase based on what we have in state
        if (latestState.customBom && latestState.customBom.length > 0) {
          dispatch({ type: 'SET_PHASE', phase: 'quote' });
        } else if (latestState.guideSteps && latestState.guideSteps.length > 0) {
          dispatch({ type: 'SET_PHASE', phase: 'guide' });
        } else if (latestState.recommendedProducts && latestState.recommendedProducts.length > 0) {
          dispatch({ type: 'SET_PHASE', phase: 'products' });
        } else if (latestState.dynamicQuestions && latestState.dynamicQuestions.length > 0) {
          dispatch({ type: 'SET_PHASE', phase: 'clarify' });
        } else {
          dispatch({ type: 'SET_PHASE', phase: 'intro' });
        }
      }
      dispatch({ type: 'SET_THINKING', thinking: false });
    } catch (err: any) {
      console.error('Chat error:', err);
      setMessages(prev => [...prev, { role: 'assistant', content: `🚨 **Error:** ${err.message}` }]);
      dispatch({ type: 'SET_THINKING', thinking: false });
      dispatch({ type: 'SET_PHASE', phase: 'intro' }); // Reset phase on error
    } finally {
      setIsLoading(false);
    }
  }, [dispatch]);

  // Called when user types a message
  const append = useCallback(async (msg: { role: string; content: string }) => {
    const newMessages = [...messages, msg];
    setMessages(newMessages);
    await sendToAI(newMessages);
  }, [messages, sendToAI]);

  // Called when user submits clarify answers from the right panel
  const handleClarifySubmit = useCallback(async () => {
    // Format answers as a readable message
    const answers = state.dynamicAnswers;
    const questions = state.dynamicQuestions;
    const answerSummary = questions
      .map(q => `${q.title} → ${answers[q.id] || 'Not answered'}`)
      .join('\n');

    const userMsg = { role: 'user', content: `My answers:\n${answerSummary}` };
    const newMessages = [...messages, userMsg];
    setMessages(newMessages);

    dispatch({ type: 'SET_PHASE', phase: 'validating' });
    dispatch({ type: 'SET_THINKING', thinking: true });

    await sendToAI(newMessages);

    dispatch({ type: 'SET_THINKING', thinking: false });
  }, [messages, state.dynamicAnswers, state.dynamicQuestions, sendToAI, dispatch]);

  // Expose handleClarifySubmit globally so ClarifyPanel can call it
  useEffect(() => {
    (window as any).__handleClarifySubmit = handleClarifySubmit;
    return () => { delete (window as any).__handleClarifySubmit; };
  }, [handleClarifySubmit]);

  // Called when user clicks "Build Quote" on ProductsPanel
  const handleBuildQuote = useCallback(async (summary?: string) => {
    const content = summary || 'Build my quote with the recommended products';
    const userMsg = { role: 'user', content };
    const newMessages = [...messages, userMsg];
    setMessages(newMessages);

    dispatch({ type: 'SET_PHASE', phase: 'validating' });
    dispatch({ type: 'SET_THINKING', thinking: true });

    await sendToAI(newMessages);

    dispatch({ type: 'SET_THINKING', thinking: false });
  }, [messages, sendToAI, dispatch]);

  // Expose handleBuildQuote globally so ProductsPanel can call it
  useEffect(() => {
    (window as any).__handleBuildQuote = handleBuildQuote;
    return () => { delete (window as any).__handleBuildQuote; };
  }, [handleBuildQuote]);

  // Expose handleUserMessage globally so GuidePanel can send arbitrary messages back to AI
  const handleUserMessage = useCallback(async (text: string) => {
    const userMsg = { role: 'user', content: text };
    const newMessages = [...messages, userMsg];
    setMessages(newMessages);

    dispatch({ type: 'SET_PHASE', phase: 'validating' });
    dispatch({ type: 'SET_THINKING', thinking: true });

    await sendToAI(newMessages);

    dispatch({ type: 'SET_THINKING', thinking: false });
  }, [messages, sendToAI, dispatch]);

  useEffect(() => {
    (window as any).__handleUserMessage = handleUserMessage;
    return () => { delete (window as any).__handleUserMessage; };
  }, [handleUserMessage]);


  const onSubmit = (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!prompt.trim()) return;
    append({ role: 'user', content: prompt });
    setPrompt('');
  };

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      onSubmit();
    }
  };

  // Merge context messages (welcome) with chat messages
  const allMessages = [...state.messages, ...messages.map((m, i) => ({
    id: `msg-${i}`,
    role: m.role as 'user' | 'ai' | 'note',
    text: m.content || ''
  }))].filter(m => m.text);

  return (
    <div className="chat-panel">
      {/* Header */}
      <div className="chat-header">
        <div className="chat-header__brand">CAROMA</div>
        <div className="chat-header__divider" />
        <div className="chat-header__info">
          <div className="chat-header__title">Bathroom Configurator</div>
          <div className="chat-header__subtitle">Agentic bathroom build</div>
        </div>
        <div className="chat-header__badge">
          <span className="chat-header__badge-dot" />
          <span className="chat-header__badge-text">Consumer · Bathroom</span>
        </div>
      </div>

      {/* Messages */}
      <div className="chat-messages">
        {allMessages.map(msg => (
          <MessageBubble key={msg.id} message={msg} />
        ))}
        {(state.isThinking || isLoading) && (
          <div className="thinking">
            <span className="thinking__dot" />
            <span className="thinking__dot" />
            <span className="thinking__dot" />
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="chat-input-area">
        {state.phase === 'intro' && (
          <div className="chat-suggestions">
            <div
              className="chat-suggestion"
              onClick={() => append({ role: 'user', content: "I'm renovating my bathroom — help me choose a new shower." })}
            >
              <span className="chat-suggestion__arrow">→</span>
              I&apos;m renovating my bathroom — help me choose a shower
            </div>
            <div
              className="chat-suggestion"
              onClick={() => append({ role: 'user', content: "I'm building new — spec a full bathroom with matching finishes." })}
            >
              <span className="chat-suggestion__arrow">→</span>
              I&apos;m building new — spec a full bathroom
            </div>
          </div>
        )}
        <form className="chat-input-row" onSubmit={onSubmit}>
          <input
            className="chat-input"
            value={prompt}
            onChange={e => setPrompt(e.target.value)}
            onKeyDown={onKeyDown}
            placeholder="Describe the build — product, quantity, finish…"
          />
          <button type="submit" className="chat-send-btn" aria-label="Send message">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
              <path d="M4 12h13M11 5l7 7-7 7" stroke="#F7F4EE" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>
        </form>
      </div>
    </div>
  );
}
