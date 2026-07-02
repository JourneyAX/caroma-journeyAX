'use client';

import { JourneyProvider } from '@/context/JourneyContext';
import ChatPanel from '@/components/ChatPanel';
import ProjectPanel from '@/components/ProjectPanel';
import EasySwitchToast from '@/components/EasySwitchToast';

export default function Home() {
  return (
    <JourneyProvider>
      <div className="app-layout">
        <ChatPanel />
        <ProjectPanel />
        <EasySwitchToast />
      </div>
    </JourneyProvider>
  );
}
