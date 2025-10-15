/**
 * ToolsSidebar component
 * Provides buttons to create and manipulate shapes
 * Displayed in the sidebar (replaces top toolbar)
 */

import type { ShapeType } from '../../types/canvas';

interface ToolsSidebarProps {
  onAddShape: (type: ShapeType) => void;
  onDelete?: () => void;
  hasSelection?: boolean;
}

export function ToolsSidebar({ onAddShape, onDelete, hasSelection }: ToolsSidebarProps) {
  return (
    <div className="flex flex-col h-full">
      {/* No title - per user request */}
      
      {/* Creation tools */}
      <div className="flex-1 p-4 space-y-3">
        {/* Rectangle */}
        <button
          onClick={() => onAddShape('rectangle')}
          className="w-full px-4 py-3 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors flex items-center gap-3 text-left"
          title="Add Rectangle"
        >
          <svg
            width="24"
            height="24"
            viewBox="0 0 24 24"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            className="flex-shrink-0"
          >
            <rect
              x="3"
              y="3"
              width="18"
              height="18"
              stroke="currentColor"
              strokeWidth="2"
              fill="none"
            />
          </svg>
          <span className="text-base font-medium">Rectangle</span>
        </button>

        {/* Circle */}
        <button
          onClick={() => onAddShape('circle')}
          className="w-full px-4 py-3 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors flex items-center gap-3 text-left"
          title="Add Circle"
        >
          <svg
            width="24"
            height="24"
            viewBox="0 0 24 24"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            className="flex-shrink-0"
          >
            <circle
              cx="12"
              cy="12"
              r="9"
              stroke="currentColor"
              strokeWidth="2"
              fill="none"
            />
          </svg>
          <span className="text-base font-medium">Circle</span>
        </button>

        {/* Text */}
        <button
          onClick={() => onAddShape('text')}
          className="w-full px-4 py-3 bg-gray-700 text-white rounded-lg hover:bg-gray-800 transition-colors flex items-center gap-3 text-left"
          title="Add Text"
        >
          <svg
            width="24"
            height="24"
            viewBox="0 0 24 24"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            className="flex-shrink-0"
          >
            <path
              d="M5 5h14M12 5v14M9 19h6"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
            />
          </svg>
          <span className="text-base font-medium">Text</span>
        </button>

        {/* Separator - only shown when there's a selection */}
        {hasSelection && (
          <>
            <div className="py-2">
              <div className="border-t border-gray-200" />
            </div>

            {/* Delete button - only shown when something is selected */}
            {onDelete && (
              <button
                onClick={onDelete}
                className="w-full px-4 py-3 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors flex items-center gap-3 text-left"
                title="Delete Selected"
              >
                <svg
                  width="24"
                  height="24"
                  viewBox="0 0 24 24"
                  fill="none"
                  xmlns="http://www.w3.org/2000/svg"
                  className="flex-shrink-0"
                >
                  <path
                    d="M4 6h16M10 6V4h4v2M8 6v12a2 2 0 002 2h4a2 2 0 002-2V6"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
                <span className="text-base font-medium">Delete</span>
              </button>
            )}
          </>
        )}
      </div>
    </div>
  );
}

