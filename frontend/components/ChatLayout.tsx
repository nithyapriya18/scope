'use client';

import { useState, useEffect, ReactNode } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';

interface ChatLayoutProps {
  mapContent: ReactNode;
  chatContent: ReactNode;
  defaultMapWidth?: number;
  showToggle?: boolean;
  className?: string;
}

export default function ChatLayout({
  mapContent,
  chatContent,
  defaultMapWidth = 60,
  showToggle = true,
  className = '',
}: ChatLayoutProps) {
  const [mapWidth, setMapWidth] = useState(defaultMapWidth);
  const [isChatCollapsed, setIsChatCollapsed] = useState(false);
  const [activeTab, setActiveTab] = useState<'map' | 'chat'>('map');
  const [isResizing, setIsResizing] = useState(false);

  const handleMouseDown = (e: React.MouseEvent) => {
    setIsResizing(true);
    e.preventDefault();
  };

  const handleMouseMove = (e: MouseEvent) => {
    if (!isResizing) return;

    const container = document.getElementById('chat-layout-container');
    if (!container) return;

    const containerRect = container.getBoundingClientRect();
    const newMapWidth = ((e.clientX - containerRect.left) / containerRect.width) * 100;
    setMapWidth(Math.min(80, Math.max(30, newMapWidth)));
  };

  const handleMouseUp = () => {
    setIsResizing(false);
  };

  useEffect(() => {
    const handleMove = (e: MouseEvent) => {
      if (!isResizing) return;
      const container = document.getElementById('chat-layout-container');
      if (!container) return;
      const containerRect = container.getBoundingClientRect();
      const newMapWidth = ((e.clientX - containerRect.left) / containerRect.width) * 100;
      setMapWidth(Math.min(85, Math.max(15, newMapWidth)));
    };

    const handleUp = () => {
      setIsResizing(false);
    };

    if (isResizing) {
      document.addEventListener('mousemove', handleMove);
      document.addEventListener('mouseup', handleUp);
      return () => {
        document.removeEventListener('mousemove', handleMove);
        document.removeEventListener('mouseup', handleUp);
      };
    }
  }, [isResizing]);

  const chatWidth = 100 - mapWidth;

  return (
    <>
      {/* Desktop Layout */}
      <div
        id="chat-layout-container"
        className={`hidden md:flex h-full w-full ${className}`}
        style={{ overflow: 'hidden' }}
      >
        <div
          className="h-full relative"
          style={{ width: isChatCollapsed ? '100%' : `${mapWidth}%` }}
        >
          {mapContent}

          {showToggle && (
            <button
              onClick={() => setIsChatCollapsed(!isChatCollapsed)}
              className="absolute top-4 right-4 z-10 bg-white shadow-lg rounded-lg p-2 hover:bg-gray-50 transition-all duration-200 border border-gray-200"
              title={isChatCollapsed ? 'Show Chat' : 'Hide Chat'}
            >
              {isChatCollapsed ? (
                <ChevronLeft className="w-5 h-5 text-gray-700" />
              ) : (
                <ChevronRight className="w-5 h-5 text-gray-700" />
              )}
            </button>
          )}
        </div>

        {!isChatCollapsed && (
          <div
            className="w-1 bg-gray-200 hover:bg-ps-primary-500 cursor-col-resize transition-colors duration-150 relative group"
            onMouseDown={handleMouseDown}
          >
            <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 bg-gray-400 group-hover:bg-ps-primary-500 rounded-full w-6 h-12 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-200">
              <div className="flex flex-col gap-1">
                <div className="w-0.5 h-1 bg-white rounded-full"></div>
                <div className="w-0.5 h-1 bg-white rounded-full"></div>
                <div className="w-0.5 h-1 bg-white rounded-full"></div>
              </div>
            </div>
          </div>
        )}

        {!isChatCollapsed && (
          <div className="h-full" style={{ width: `${chatWidth}%` }}>
            {chatContent}
          </div>
        )}
      </div>

      {/* Mobile Layout */}
      <div className="md:hidden flex flex-col h-full w-full">
        <div className="flex border-b border-gray-200 bg-white">
          <button
            onClick={() => setActiveTab('map')}
            className={`flex-1 py-3 px-4 text-sm font-medium transition-colors duration-200 ${
              activeTab === 'map'
                ? 'text-ps-primary-600 border-b-2 border-ps-primary-600'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            Workflow
          </button>
          <button
            onClick={() => setActiveTab('chat')}
            className={`flex-1 py-3 px-4 text-sm font-medium transition-colors duration-200 ${
              activeTab === 'chat'
                ? 'text-ps-primary-600 border-b-2 border-ps-primary-600'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            Assistant
          </button>
        </div>

        <div className="flex-1 overflow-hidden">
          {activeTab === 'map' && <div className="h-full">{mapContent}</div>}
          {activeTab === 'chat' && <div className="h-full">{chatContent}</div>}
        </div>
      </div>
    </>
  );
}
