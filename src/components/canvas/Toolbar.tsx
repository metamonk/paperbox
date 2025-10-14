/**
 * Toolbar component
 * Provides buttons to create shapes on the canvas
 */

import { ShapeType } from '../../types/canvas';

interface ToolbarProps {
  onAddShape: (type: ShapeType) => void;
}

export function Toolbar({ onAddShape }: ToolbarProps) {
  return (
    <div className="absolute top-4 left-4 bg-white rounded-lg shadow-lg p-2 flex gap-2 z-10">
      <button
        onClick={() => onAddShape('rectangle')}
        className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 transition-colors flex items-center gap-2"
        title="Add Rectangle"
      >
        <svg
          width="20"
          height="20"
          viewBox="0 0 20 20"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <rect
            x="2"
            y="2"
            width="16"
            height="16"
            stroke="currentColor"
            strokeWidth="2"
            fill="none"
          />
        </svg>
        <span>Rectangle</span>
      </button>

      <button
        onClick={() => onAddShape('circle')}
        className="px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600 transition-colors flex items-center gap-2"
        title="Add Circle"
      >
        <svg
          width="20"
          height="20"
          viewBox="0 0 20 20"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <circle
            cx="10"
            cy="10"
            r="8"
            stroke="currentColor"
            strokeWidth="2"
            fill="none"
          />
        </svg>
        <span>Circle</span>
      </button>

      <button
        onClick={() => onAddShape('text')}
        className="px-4 py-2 bg-gray-700 text-white rounded hover:bg-gray-800 transition-colors flex items-center gap-2"
        title="Add Text"
      >
        <svg
          width="20"
          height="20"
          viewBox="0 0 20 20"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <path
            d="M4 4h12M10 4v12M7 16h6"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
          />
        </svg>
        <span>Text</span>
      </button>
    </div>
  );
}

