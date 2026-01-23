'use client';

import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Copy, Zap, AlertCircle, Loader2, CheckCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { useDryRun } from '@/hooks/useDryRun';
import { Input } from '@/components/ui/input';

interface DryRunTestPanelProps {
  eventId: string;
  eventName: string;
  currentReleaseTime: string;
  isDev?: boolean;
}

export const DryRunTestPanel: React.FC<DryRunTestPanelProps> = ({
  eventId,
  eventName,
  currentReleaseTime,
  isDev = true,
}) => {
  const [offsetMinutes, setOffsetMinutes] = useState('2');
  const [testEventId, setTestEventId] = useState<string | null>(null);
  const [showDryRunForm, setShowDryRunForm] = useState(false);
  const [autoBookId, setAutoBookId] = useState('');
  const [dryRunResult, setDryRunResult] = useState<any>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  
  const { cloneEventForTesting, runDryRun, isCloning, isRunning } = useDryRun();

  const handleTriggerProcessing = async () => {
    setIsProcessing(true);
    try {
      const response = await fetch('/api/test-auto-books', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });
      
      if (!response.ok) {
        throw new Error('Failed to trigger processing');
      }

      const data = await response.json();
      console.log('Auto-books processed:', data);
    } catch (error: any) {
      console.error('Error triggering processing:', error);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleCloneEvent = async () => {
    const offset = parseInt(offsetMinutes) || 2;
    const result = await cloneEventForTesting(eventId, offset);
    if (result) {
      setTestEventId(result.testEventId);
    }
  };

  const handleRunDryRun = async () => {
    if (!autoBookId) {
      alert('Please enter an auto-book ID');
      return;
    }
    const result = await runDryRun(autoBookId);
    if (result) {
      setDryRunResult(result);
    }
  };

  if (!isDev) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="my-6"
    >
      <Card className="border-amber-500/50 bg-amber-50/50 dark:bg-amber-950/20 p-6">
        <div className="flex items-start gap-3 mb-4">
          <AlertCircle className="w-5 h-5 text-amber-600 dark:text-amber-400 flex-shrink-0 mt-0.5" />
          <div className="flex-1">
            <h3 className="font-semibold text-amber-900 dark:text-amber-100 mb-1">
              🧪 Developer Testing Mode
            </h3>
            <p className="text-sm text-amber-800 dark:text-amber-200">
              Clone events with simulated release times for safe auto-book testing
            </p>
          </div>
        </div>

        <div className="space-y-4">
          {/* Clone Event Section */}
          <div className="bg-white dark:bg-slate-950 rounded-lg p-4 border border-amber-200 dark:border-amber-900">
            <h4 className="font-medium text-foreground mb-3 flex items-center gap-2">
              <Copy className="w-4 h-4" />
              Step 1: Clone Event for Testing
            </h4>

            <div className="space-y-3">
              <div>
                <label className="text-sm font-medium text-muted-foreground mb-2 block">
                  Release Time Offset (minutes from now)
                </label>
                <div className="flex gap-2">
                  <Input
                    type="number"
                    min="1"
                    max="60"
                    value={offsetMinutes}
                    onChange={(e) => setOffsetMinutes(e.target.value)}
                    placeholder="2"
                    className="w-24"
                  />
                  <Button
                    onClick={handleCloneEvent}
                    disabled={isCloning}
                    className="flex-1"
                    size="sm"
                  >
                    {isCloning ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin mr-2" />
                        Cloning...
                      </>
                    ) : (
                      <>
                        <Copy className="w-4 h-4 mr-2" />
                        Clone Event
                      </>
                    )}
                  </Button>
                </div>
              </div>

              {testEventId && (
                <motion.div
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="p-3 rounded bg-green-50 dark:bg-green-950/30 border border-green-200 dark:border-green-800"
                >
                  <div className="flex items-center gap-2 text-green-700 dark:text-green-300">
                    <CheckCircle className="w-4 h-4" />
                    <span className="text-sm font-medium">Test event created!</span>
                  </div>
                  <p className="text-xs text-green-600 dark:text-green-400 mt-1">
                    Event ID: <code className="bg-green-100 dark:bg-green-950 px-1 rounded">{testEventId}</code>
                  </p>
                </motion.div>
              )}
            </div>
          </div>

          {/* Dry-Run Section */}
          <div className="bg-white dark:bg-slate-950 rounded-lg p-4 border border-amber-200 dark:border-amber-900">
            <h4 className="font-medium text-foreground mb-3 flex items-center gap-2">
              <Zap className="w-4 h-4" />
              Step 2: Simulate Auto-Book Processing
            </h4>

            <div className="space-y-3">
              <div>
                <label className="text-sm font-medium text-muted-foreground mb-2 block">
                  Auto-Book ID (to simulate)
                </label>
                <div className="flex gap-2">
                  <Input
                    type="text"
                    value={autoBookId}
                    onChange={(e) => setAutoBookId(e.target.value)}
                    placeholder="Enter auto-book UUID"
                    className="flex-1"
                  />
                  <Button
                    onClick={handleRunDryRun}
                    disabled={isRunning || !autoBookId}
                    size="sm"
                  >
                    {isRunning ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin mr-2" />
                        Running...
                      </>
                    ) : (
                      <>
                        <Zap className="w-4 h-4 mr-2" />
                        Dry-Run
                      </>
                    )}
                  </Button>
                </div>
              </div>

              {dryRunResult && (
                <motion.div
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className={`p-3 rounded border ${
                    dryRunResult.status === 'success'
                      ? 'bg-blue-50 dark:bg-blue-950/30 border-blue-200 dark:border-blue-800'
                      : 'bg-orange-50 dark:bg-orange-950/30 border-orange-200 dark:border-orange-800'
                  }`}
                >
                  <div className="flex items-start gap-2">
                    <Badge
                      className={
                        dryRunResult.status === 'success'
                          ? 'bg-blue-600'
                          : 'bg-orange-600'
                      }
                    >
                      {dryRunResult.status}
                    </Badge>
                    <div className="flex-1 min-w-0">
                      <p className={`text-sm font-medium ${
                        dryRunResult.status === 'success'
                          ? 'text-blue-700 dark:text-blue-300'
                          : 'text-orange-700 dark:text-orange-300'
                      }`}>
                        {dryRunResult.message}
                      </p>
                      {dryRunResult.failureReason && (
                        <p className="text-xs text-muted-foreground mt-1">
                          Reason: {dryRunResult.failureReason}
                        </p>
                      )}
                    </div>
                  </div>
                </motion.div>
              )}
            </div>
          </div>

          {/* Step 3: Trigger Processing */}
          <div className="bg-white dark:bg-slate-950 rounded-lg p-4 border border-amber-200 dark:border-amber-900">
            <h4 className="font-medium text-foreground mb-3 flex items-center gap-2">
              <Zap className="w-4 h-4" />
              Step 3: Trigger Auto-Book Processing
            </h4>
            <p className="text-sm text-muted-foreground mb-3">
              After your test event's release time passes (or immediately if already past), click this to process all active auto-books:
            </p>
            <Button
              onClick={handleTriggerProcessing}
              disabled={isProcessing}
              className="w-full bg-transparent"
              size="sm"
              variant="outline"
            >
              {isProcessing ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin mr-2" />
                  Processing...
                </>
              ) : (
                <>
                  <Zap className="w-4 h-4 mr-2" />
                  Trigger Auto-Book Processing
                </>
              )}
            </Button>
          </div>

          <div className="text-xs text-muted-foreground bg-muted/50 p-3 rounded space-y-2">
            <div><strong>How it works:</strong></div>
            <ol className="list-decimal list-inside space-y-1">
              <li>Clone an event (sets release time to NOW + 2 minutes)</li>
              <li>Create auto-book for the cloned event</li>
              <li>Wait 2+ minutes, then click "Trigger Auto-Book Processing"</li>
              <li>Check "My Bookings" to see the result</li>
            </ol>
          </div>
        </div>
      </Card>
    </motion.div>
  );
};
