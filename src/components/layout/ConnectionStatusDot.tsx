/**
 * ConnectionStatusDot - Network Connection Status Indicator
 *
 * Minimal dot indicator showing real-time connection state
 * with tooltip for detailed information.
 *
 * States:
 * - connected: Green dot (stable connection)
 * - connecting: Yellow pulsing dot (initial connection)
 * - disconnected: Red dot (offline)
 * - reconnecting: Orange pulsing dot (attempting reconnect)
 * - failed: Dark red dot (manual refresh required)
 */

import { usePaperboxStore } from '@/stores';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';

export function ConnectionStatusDot() {
  const status = usePaperboxStore((state) => state.connectionStatus);
  const queueCount = usePaperboxStore((state) => state.offlineOperationsCount);

  const colors = {
    connected: 'bg-green-500',
    connecting: 'bg-yellow-500 animate-pulse',
    disconnected: 'bg-red-500',
    reconnecting: 'bg-orange-500 animate-pulse',
    failed: 'bg-red-600',
  };

  const labels = {
    connected: 'Connected',
    connecting: 'Connecting...',
    disconnected: queueCount > 0 ? `Offline (${queueCount} operations queued)` : 'Offline',
    reconnecting: queueCount > 0 ? `Reconnecting... (${queueCount} operations queued)` : 'Reconnecting...',
    failed: 'Connection failed - Refresh required',
  };

  return (
    <TooltipProvider>
      <Tooltip delayDuration={200}>
        <TooltipTrigger asChild>
          <div className="flex items-center gap-1.5 cursor-help">
            <div className={`w-2 h-2 rounded-full ${colors[status]}`} aria-label={labels[status]} />
          </div>
        </TooltipTrigger>
        <TooltipContent side="bottom">
          <p className="text-sm">{labels[status]}</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

