'use client';

import React, { createContext, useContext, useReducer, useCallback, useRef } from 'react';
import {
  JourneyState, INITIAL_STATE, Phase, ClarifyAnswers, DynamicQuestion, RecommendedProduct,
  FINISHES, DEFAULT_ADDONS, formatAUD, getStockInfo, BOMLine, QuoteTotals
} from '@/lib/types';

type Action =
  | { type: 'SET_PHASE'; phase: Phase }
  | { type: 'SET_QUOTE_DATA'; title: string; bom: BOMLine[]; jobId?: string; installationSummary?: string; warrantySummary?: string }
  | { type: 'ADD_MESSAGE'; role: 'ai' | 'user' | 'note'; text: string; head?: string }
  | { type: 'SET_CLARIFY'; key: keyof ClarifyAnswers; value: string }
  | { type: 'SET_DYNAMIC_QUESTIONS'; questions: DynamicQuestion[] }
  | { type: 'SET_DYNAMIC_ANSWER'; questionId: string; value: string }
  | { type: 'SET_RECOMMENDED_PRODUCTS'; products: RecommendedProduct[] }
  | { type: 'SET_FINISH'; finish: string }
  | { type: 'SET_QTY'; qty: number }
  | { type: 'TOGGLE_ADDON'; id: string }
  | { type: 'SET_REVEALED'; revealed: boolean }
  | { type: 'SET_TOAST'; show: boolean }
  | { type: 'SET_THINKING'; thinking: boolean }
  | { type: 'SET_ORDER_ID'; orderId: string }
  | { type: 'SET_GUIDE_STEPS'; steps: { id: string; title: string; description: string }[] }
  | { type: 'TOGGLE_GUIDE_STEP'; id: string }
  | { type: 'RESET' };

function reducer(state: JourneyState, action: Action): JourneyState {
  switch (action.type) {
    case 'SET_PHASE':
      return { ...state, phase: action.phase };
    case 'SET_QUOTE_DATA':
      return { 
        ...state, 
        quoteTitle: action.title, 
        customBom: action.bom,
        jobId: action.jobId,
        installationSummary: action.installationSummary,
        warrantySummary: action.warrantySummary
      };
    case 'ADD_MESSAGE':
      return {
        ...state,
        messages: [
          ...state.messages,
          {
            id: `msg-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
            role: action.role,
            text: action.text,
            head: action.head,
          },
        ],
      };
    case 'SET_CLARIFY':
      return {
        ...state,
        clarify: { ...state.clarify, [action.key]: action.value },
        ...(action.key === 'finishQ' ? { finish: action.value } : {}),
      };
    case 'SET_DYNAMIC_QUESTIONS':
      return { ...state, dynamicQuestions: action.questions, dynamicAnswers: {} };
    case 'SET_DYNAMIC_ANSWER':
      return { ...state, dynamicAnswers: { ...state.dynamicAnswers, [action.questionId]: action.value } };
    case 'SET_RECOMMENDED_PRODUCTS':
      return { ...state, recommendedProducts: action.products };
    case 'SET_FINISH':
      return { ...state, finish: action.finish };
    case 'SET_QTY':
      return { ...state, qty: Math.max(1, action.qty) };
    case 'TOGGLE_ADDON':
      return {
        ...state,
        selectedAddons: state.selectedAddons.includes(action.id)
          ? state.selectedAddons.filter(x => x !== action.id)
          : [...state.selectedAddons, action.id],
      };
    case 'SET_REVEALED':
      return { ...state, revealed: action.revealed };
    case 'SET_TOAST':
      return { ...state, showToast: action.show };
    case 'SET_THINKING':
      return { ...state, isThinking: action.thinking };
    case 'SET_ORDER_ID':
      return { ...state, orderId: action.orderId };
    case 'SET_GUIDE_STEPS':
      return { ...state, phase: 'guide', guideSteps: action.steps.map(s => ({ ...s, completed: false })) };
    case 'TOGGLE_GUIDE_STEP':
      return {
        ...state,
        guideSteps: state.guideSteps.map(step =>
          step.id === action.id ? { ...step, completed: !step.completed } : step
        )
      };
    case 'RESET':
      return { ...INITIAL_STATE };
    default:
      return state;
  }
}

function calculateTotals(bom: BOMLine[], selectedAddons: string[], qty: number): QuoteTotals {
  const bomTotal = bom.reduce((s, line) => s + line.lineTotal, 0);
  const addonTotal = selectedAddons.reduce((s, id) => {
    const addon = DEFAULT_ADDONS.find(a => a.id === id);
    return s + (addon ? addon.price * qty : 0);
  }, 0);
  const subtotal = bomTotal + addonTotal;
  const discount = subtotal * 0.12;
  const afterDiscount = subtotal - discount;
  const gst = afterDiscount * 0.10;
  const total = afterDiscount + gst;
  return { subtotal, discount, gst, total };
}

// ── Context ────────────────────────────────────────────────────────────
interface JourneyContextType {
  state: JourneyState;
  dispatch: React.Dispatch<Action>;
  bom: BOMLine[];
  totals: QuoteTotals;
  quoteTitle: string;
  isDynamicClarifyComplete: boolean;
  handleApprove: () => void;
  handleRestart: () => void;
  handleTryRemove: () => void;
}

const JourneyContext = createContext<JourneyContextType | null>(null);

export function JourneyProvider({ children }: { children: React.ReactNode }) {
  const [state, dispatch] = useReducer(reducer, INITIAL_STATE);

  const bom = state.customBom || [];
  const totals = calculateTotals(bom, state.selectedAddons, state.qty);

  const quoteTitle = state.quoteTitle || 'Your bathroom project';

  // Dynamic clarify is complete when every dynamic question has an answer
  const isDynamicClarifyComplete = state.dynamicQuestions.length > 0 &&
    state.dynamicQuestions.every(q => !!state.dynamicAnswers[q.id]);

  const handleApprove = useCallback(() => {
    const id = 'CAR-' + Math.floor(100000 + Math.random() * 899999);
    dispatch({ type: 'SET_ORDER_ID', orderId: id });
    dispatch({ type: 'SET_PHASE', phase: 'ordered' });
    dispatch({ type: 'SET_TOAST', show: false });
    dispatch({
      type: 'ADD_MESSAGE',
      role: 'ai',
      text: `Order ${id} created. Fulfilment scheduled and the spec sheet is on its way to your account.`,
    });
  }, []);

  const handleTryRemove = useCallback(() => {
    dispatch({
      type: 'ADD_MESSAGE',
      role: 'note',
      text: "That's a mandatory in-wall component — removing it would ship an incomplete order, so I'll keep it bundled.",
      head: 'Kept in.',
    });
  }, []);

  const handleRestart = useCallback(() => {
    dispatch({ type: 'RESET' });
  }, []);

  return (
    <JourneyContext.Provider
      value={{
        state,
        dispatch,
        bom,
        totals,
        quoteTitle,
        isDynamicClarifyComplete,
        handleApprove,
        handleRestart,
        handleTryRemove,
      }}
    >
      {children}
    </JourneyContext.Provider>
  );
}

export function useJourney() {
  const ctx = useContext(JourneyContext);
  if (!ctx) throw new Error('useJourney must be inside JourneyProvider');
  return ctx;
}
