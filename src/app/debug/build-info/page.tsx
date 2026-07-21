'use client';

import buildInfo from '@/lib/build-info.json';
import { ShieldAlert, Cpu } from 'lucide-react';

export default function DebugBuildInfoPage() {
  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-955 text-slate-900 dark:text-slate-100 flex items-center justify-center p-6">
      <div className="max-w-md w-full bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-2xl p-6 shadow-xl space-y-6">
        <div className="flex items-center gap-3 border-b border-slate-100 dark:border-slate-800 pb-4">
          <div className="h-10 w-10 bg-emerald-50 dark:bg-emerald-950/20 text-emerald-600 dark:text-emerald-400 rounded-xl flex items-center justify-center">
            <Cpu className="h-5 w-5" />
          </div>
          <div>
            <h1 className="font-extrabold text-lg">System Build Info</h1>
            <p className="text-xs text-slate-400">Deployment and diagnostics dashboard</p>
          </div>
        </div>

        <div className="space-y-4 text-sm font-semibold">
          <div className="flex justify-between items-center bg-slate-50 dark:bg-slate-950/20 border border-slate-100 dark:border-slate-800 p-3 rounded-xl">
            <span className="text-slate-400 text-xs">Git Commit Hash</span>
            <code className="text-xs text-emerald-600 dark:text-emerald-400 font-mono bg-emerald-50 dark:bg-emerald-950/20 px-2 py-0.5 rounded border border-emerald-100 dark:border-emerald-900/30">
              {buildInfo.commit}
            </code>
          </div>

          <div className="flex justify-between items-center bg-slate-50 dark:bg-slate-950/20 border border-slate-100 dark:border-slate-800 p-3 rounded-xl">
            <span className="text-slate-400 text-xs">Build Time</span>
            <span className="text-slate-700 dark:text-slate-300 text-xs">
              {new Date(buildInfo.buildTime).toLocaleString()}
            </span>
          </div>

          <div className="flex justify-between items-center bg-slate-50 dark:bg-slate-950/20 border border-slate-100 dark:border-slate-800 p-3 rounded-xl">
            <span className="text-slate-400 text-xs">Environment</span>
            <span className="capitalize text-xs text-indigo-600 bg-indigo-50 dark:bg-indigo-950/20 px-2 py-0.5 rounded border border-indigo-100 dark:border-indigo-900/30">
              {buildInfo.env}
            </span>
          </div>

          <div className="flex justify-between items-center bg-slate-50 dark:bg-slate-950/20 border border-slate-100 dark:border-slate-800 p-3 rounded-xl">
            <span className="text-slate-400 text-xs">Schema Version</span>
            <span className="text-xs text-slate-600 dark:text-slate-400 font-mono">
              {buildInfo.schemaVersion}
            </span>
          </div>
        </div>

        <div className="text-center pt-2 border-t border-slate-100 dark:border-slate-800 flex items-center justify-center gap-1.5 text-xs text-slate-400 font-bold">
          <ShieldAlert className="h-4 w-4 text-amber-500" />
          <span>Internal diagnostics view only.</span>
        </div>
      </div>
    </div>
  );
}
