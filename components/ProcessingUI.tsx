
import React from 'react';
import { StepStatus, AppState } from '../types';
import { STEPS, Icons } from '../constants';

interface ProcessingUIProps {
  steps: StepStatus[];
  currentLog: string;
  activeState: AppState;
}

const ProcessingUI: React.FC<ProcessingUIProps> = ({ steps, currentLog, activeState }) => {
  const isPro = currentLog.toLowerCase().includes('pro') || activeState === AppState.VISUALIZING || activeState === AppState.VOCALIZING;

  return (
    <div className="max-w-5xl mx-auto space-y-12 animate-in fade-in duration-500">
      <div className="bg-white border border-github-black p-8 md:p-12 shadow-[12px_12px_0px_0px_rgba(217,119,87,0.1)]">
        <div className="flex flex-col md:flex-row md:items-center justify-between mb-12 pb-6 border-b border-github-black/10 gap-4">
          <div className="space-y-1">
            <h2 className="text-2xl font-bold tracking-tighter uppercase flex items-center gap-3">
              <span className={`w-3 h-3 ${isPro ? 'bg-peach-accent' : 'bg-github-black'} animate-pulse`}></span>
              {isPro ? 'Deep Reasoning Agent active' : 'Autonomous Agent active'}
            </h2>
            <p className="text-[10px] font-bold text-peach-accent uppercase tracking-widest">
              Core: {isPro ? 'Gemini 3 Pro + Multimodal Visualizer' : 'Gemini 3 Flash Reasoning'}
            </p>
          </div>
          <div className="flex items-center gap-3">
            {isPro && (
              <div className="text-[10px] font-black uppercase tracking-widest bg-peach-accent text-white px-3 py-1 animate-bounce">
                Search Grounding: Live
              </div>
            )}
            <div className="text-[10px] font-bold uppercase tracking-widest bg-github-black text-peach-100 px-3 py-1">
              Runtime: WASM Isolated
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
          <div className="space-y-4">
            {steps.map((step, i) => (
              <div 
                key={step.id} 
                className={`flex items-center justify-between p-4 border transition-all duration-300 ${
                  step.id === activeState || (activeState === AppState.VISUALIZING && step.id === AppState.COMPLETED) ? 'bg-github-black text-peach-100 border-github-black translate-x-2' : 
                  step.status === 'success' ? 'bg-peach-100 border-github-black/10 text-github-black opacity-50' : 
                  'bg-white border-github-black/10 text-github-black/30'
                }`}
              >
                <div className="flex items-center gap-4">
                  <span className="text-[10px] font-black opacity-40">0{i + 1}</span>
                  <h3 className="text-xs font-bold uppercase tracking-widest">{step.label}</h3>
                </div>
                <div>
                  {(step.id === activeState) ? <Icons.Loader /> : step.status === 'success' && <Icons.Check />}
                </div>
              </div>
            ))}
            
            <div className="mt-8 p-6 bg-peach-50 border border-peach-accent/20">
               <div className="flex justify-between items-center mb-4">
                 <h4 className="text-[9px] font-black uppercase tracking-widest text-peach-accent">Internal State Representation</h4>
                 <span className="text-[8px] font-mono text-github-black/40">v2.5.4-Stable</span>
               </div>
               <div className="space-y-3">
                  <div className="h-1 bg-github-black/5 rounded-full overflow-hidden">
                    <div className="h-full bg-peach-accent animate-progress"></div>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-1.5 h-1.5 rounded-full bg-peach-accent animate-ping"></div>
                    <p className="text-[10px] font-mono text-github-black/60 italic">
                      {activeState === AppState.ANALYZING && "Extracting latent variables from PDF vector space..."}
                      {activeState === AppState.IMPLEMENTING && "Synthesizing Python logic from methodology prose..."}
                      {activeState === AppState.TESTING && "Initializing WASM container for verification..."}
                      {activeState === AppState.DEBUGGING && "Analyzing traceback for conceptual misalignment..."}
                      {activeState === AppState.VISUALIZING && "Synthesizing multimodal architectural blueprints (2K)..."}
                      {activeState === AppState.VOCALIZING && "Compiling neural vocal theory map..."}
                    </p>
                  </div>
               </div>
            </div>
          </div>

          <div className="bg-github-black p-6 border border-github-border overflow-hidden flex flex-col h-[450px] shadow-2xl">
            <div className="flex items-center justify-between mb-4 border-b border-github-border/30 pb-3">
              <div className="flex gap-1.5">
                <div className="w-2.5 h-2.5 rounded-full bg-red-500/50"></div>
                <div className="w-2.5 h-2.5 rounded-full bg-amber-500/50"></div>
                <div className="w-2.5 h-2.5 rounded-full bg-emerald-500/50"></div>
              </div>
              <span className="text-[9px] font-bold uppercase tracking-[0.3em] text-github-text/40">Agent.logs</span>
            </div>
            <div className="flex-1 font-mono text-[11px] leading-relaxed overflow-y-auto space-y-2 text-github-text scrollbar-hide">
              <p className="text-github-text/30">$ research-agent --tier={isPro ? 'pro' : 'standard'} --runtime=wasm</p>
              <p className="text-github-text/40">[SYSTEM] Connection established with Gemini-3-Reasoning-Engine</p>
              {steps.filter(s => s.status === 'success').map((s, idx) => (
                <p key={idx} className="text-emerald-500">{`[INFO] Stage ${idx + 1} (${s.label}) converged successfully.`}</p>
              ))}
              <div className="mt-4 pt-4 border-t border-github-border/20">
                <p className="text-peach-accent animate-pulse font-bold">{`> ${currentLog}`}</p>
                <div className="mt-2 text-github-text/40 text-[10px]">
                   {activeState === AppState.TESTING && "[WASM] Loading numpy library into sandboxed memory..."}
                   {activeState === AppState.DEBUGGING && "[DEBUG] Traceback analysis in progress. Identifying failed assertions..."}
                   {activeState === AppState.VISUALIZING && "[PRO] Initializing Imagen 4.0 technical blueprint renderer..."}
                </div>
              </div>
              <div className="opacity-20 animate-pulse mt-4">_</div>
            </div>
          </div>
        </div>
      </div>
      
      <style>{`
        @keyframes progress { 0% { width: 0%; } 100% { width: 100%; } }
        .animate-progress { animation: progress 20s infinite ease-in-out; }
        .scrollbar-hide::-webkit-scrollbar { display: none; }
      `}</style>
    </div>
  );
};

export default ProcessingUI;
