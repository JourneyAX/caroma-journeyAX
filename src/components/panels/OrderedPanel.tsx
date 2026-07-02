'use client';

import { useJourney } from '@/context/JourneyContext';
import { formatAUD } from '@/lib/types';

export default function OrderedPanel() {
  const { state, totals, handleRestart } = useJourney();
  const { qty, orderId } = state;

  return (
    <div className="ordered-panel">
      <div className="ordered-panel__icon">
        <svg width="28" height="28" viewBox="0 0 24 24" fill="none">
          <path d="M5 13l4 4L19 7" stroke="#C6A060" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </div>
      <div className="ordered-panel__eyebrow">Order created · {orderId}</div>
      <h2 className="ordered-panel__heading">Converted to order.</h2>
      <p className="ordered-panel__desc">
        {qty} validated bathroom{qty > 1 ? 's' : ''} — every fixture, finish and required EasySwitch in-wall body — locked in at your price. Fulfilment scheduled; a confirmation and BOM spec sheet are on the way to your account.
      </p>
      <div className="ordered-panel__total-row">
        <span className="ordered-panel__total-label">Order total ex-freight</span>
        <span className="ordered-panel__total-value">{formatAUD(totals.total)}</span>
      </div>
      <button className="ordered-panel__restart" onClick={handleRestart}>
        Start a new configuration
      </button>
    </div>
  );
}
