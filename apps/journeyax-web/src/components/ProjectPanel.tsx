'use client';

import { useJourney } from '@/context/JourneyContext';
import HeroPanel from './panels/HeroPanel';
import ClarifyPanel from './panels/ClarifyPanel';
import ValidatingPanel from './panels/ValidatingPanel';
import ProductsPanel from './panels/ProductsPanel';
import QuotePanel from './panels/QuotePanel';
import OrderedPanel from './panels/OrderedPanel';
import GuidePanel from './panels/GuidePanel';

export default function ProjectPanel() {
  const { state } = useJourney();

  return (
    <div className="project-panel">
      {state.phase === 'intro' && <HeroPanel />}
      {state.phase === 'clarify' && <ClarifyPanel />}
      {state.phase === 'validating' && <ValidatingPanel />}
      {state.phase === 'products' && <ProductsPanel />}
      {state.phase === 'guide' && <GuidePanel />}
      {state.phase === 'quote' && <QuotePanel />}
      {state.phase === 'ordered' && <OrderedPanel />}
    </div>
  );
}
