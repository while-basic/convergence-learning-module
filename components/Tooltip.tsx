import React, { ReactNode } from 'react';

interface TooltipProps {
  children: ReactNode;
  content: string;
}

const Tooltip: React.FC<TooltipProps> = ({ children, content }) => {
  return (
    <div className="group relative flex flex-col items-center">
      {children}
      <div className="absolute bottom-full mb-2 w-max max-w-xs scale-0 opacity-0 transition-all duration-200 group-hover:scale-100 group-hover:opacity-100 z-50">
        <div className="bg-apple-gray-light border border-white/20 text-white text-xs rounded-lg py-2 px-3 shadow-xl backdrop-blur-xl">
          {content}
          <div className="absolute top-full left-1/2 -ml-1 h-2 w-2 -translate-y-1 rotate-45 border-r border-b border-white/20 bg-apple-gray-light"></div>
        </div>
      </div>
    </div>
  );
};

export default Tooltip;