/**
 * ToolsSidebar component
 * Provides buttons to create and manipulate shapes
 * Displayed in the sidebar (replaces top toolbar)
 * W4.D1: Migrated to shadcn/ui Button + Tooltip components
 */

import type { ShapeType } from '../../types/canvas';
import { Button } from '@/components/ui/button';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { Separator } from '@/components/ui/separator';

interface ToolsSidebarProps {
  onAddShape: (type: ShapeType) => void;
  onDelete?: () => void;
  hasSelection?: boolean;
  onTestDirectAdd?: () => void; // W2.D12 DEBUG: Bypass placement mode
}

export function ToolsSidebar({ onAddShape, onDelete, hasSelection, onTestDirectAdd }: ToolsSidebarProps) {
  return (
    <TooltipProvider>
      <div className="flex flex-col h-full">
        {/* No title - per user request */}

        {/* W2.D12 DEBUG: Test button to bypass placement mode */}
        {onTestDirectAdd && (
          <div className="p-4 border-b border-border">
            <Button
              onClick={onTestDirectAdd}
              variant="outline"
              className="w-full bg-yellow-500 text-black hover:bg-yellow-600 border-yellow-600"
              size="sm"
            >
              🐛 TEST: Add Rect at 100,100
            </Button>
          </div>
        )}

        {/* Creation tools */}
        <div className="flex-1 p-4 space-y-3">
          {/* Rectangle */}
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                onClick={() => onAddShape('rectangle')}
                className="w-full justify-start gap-3 h-auto py-3"
                variant="default"
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
              </Button>
            </TooltipTrigger>
            <TooltipContent side="left">
              <p>Add Rectangle (R)</p>
            </TooltipContent>
          </Tooltip>

          {/* Circle */}
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                onClick={() => onAddShape('circle')}
                className="w-full justify-start gap-3 h-auto py-3 bg-red-500 hover:bg-red-600"
                variant="default"
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
              </Button>
            </TooltipTrigger>
            <TooltipContent side="left">
              <p>Add Circle (C)</p>
            </TooltipContent>
          </Tooltip>

          {/* Text */}
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                onClick={() => onAddShape('text')}
                className="w-full justify-start gap-3 h-auto py-3 bg-gray-700 hover:bg-gray-800"
                variant="default"
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
              </Button>
            </TooltipTrigger>
            <TooltipContent side="left">
              <p>Add Text (T)</p>
            </TooltipContent>
          </Tooltip>

          {/* Separator - only shown when there's a selection */}
          {hasSelection && (
            <>
              <div className="py-2">
                <Separator />
              </div>

              {/* Delete button - only shown when something is selected */}
              {onDelete && (
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      onClick={onDelete}
                      className="w-full justify-start gap-3 h-auto py-3 bg-red-500 hover:bg-red-600"
                      variant="destructive"
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
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent side="left">
                    <p>Delete Selected (Del)</p>
                  </TooltipContent>
                </Tooltip>
              )}
            </>
          )}
        </div>
      </div>
    </TooltipProvider>
  );
}

