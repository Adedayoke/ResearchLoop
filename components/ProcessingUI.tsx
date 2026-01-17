
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
    <div className="max-w-5xl mx-auto space-y-12">
      <div className="bg-white border border-github-black p-8 md:p-12 shadow-[12px_12px_0px_0px_rgba(217,119,87,0.1)]">
        <div className="flex flex-col md:flex-row md:items-center justify-between mb-12 pb-6 border-b border-github-black/10 gap-4">
          <div className="space-y-1">
            <h2 className="text-2xl font-bold tracking-tighter uppercase flex items-center gap-3">
              <span className={`w-3 h-3 ${isPro ? 'bg-peach-accent' : 'bg-github-black'} animate-pulse`}></span>
              {isPro ? 'Pro Autonomous Agent Stream' : 'Autonomous Agent Stream'}
            </h2>
            <p className="text-[10px] font-bold text-peach-accent uppercase tracking-widest">
              Powered by {isPro ? 'Gemini 3 Pro (Deep Reasoning)' : 'Gemini 3 Flash Reasoning'}
            </p>
          </div>
          <div className="flex items-center gap-3">
            {isPro && (
              <div className="text-[10px] font-black uppercase tracking-widest bg-peach-accent text-white px-3 py-1 animate-bounce">
                Search Grounding Enabled
              </div>
            )}
            <div className="text-[10px] font-bold uppercase tracking-widest bg-github-black text-peach-100 px-3 py-1">
              Thought Signature: Active
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
            
            <div className="mt-8 p-6 bg-peach-50 border border-peach-accent/20 rounded-lg">
               <h4 className="text-[9px] font-black uppercase tracking-widest text-peach-accent mb-4">Current Reasoning Chain</h4>
               <div className="space-y-2">
                  <div className="h-1 bg-github-black/5 rounded-full overflow-hidden">
                    <div className="h-full bg-peach-accent animate-progress"></div>
                  </div>
                  <p className="text-[10px] font-mono text-github-black/60 italic">
                    {activeState === AppState.VISUALIZING ? "Synthesizing Architecture Imagery..." : 
                     activeState === AppState.VOCALIZING ? "Encoding Vocal Explanation Layer..." :
                     "Analyzing multimodal document structure for Actionable Logic..."}
                  </p>
               </div>
            </div>
          </div>

          <div className="bg-github-black p-6 border border-github-border overflow-hidden flex flex-col h-[450px]">
            <div className="flex items-center justify-between mb-4 border-b border-github-border pb-3">
              <span className="text-[9px] font-bold uppercase tracking-[0.3em] text-github-text/40">Terminal Output</span>
            </div>
            <div className="flex-1 font-mono text-[11px] leading-relaxed overflow-y-auto space-y-2 text-github-text scrollbar-hide">
              <p className="text-github-text/30">$ research-agent --tier={isPro ? 'pro' : 'standard'} --reasoning=max</p>
              {steps.filter(s => s.status === 'success').map((s, idx) => (
                <p key={idx} className="text-emerald-500">{`[SUCCESS] ${s.label} converged.`}</p>
              ))}
              <div className="mt-4 pt-4 border-t border-github-border/30">
                <p className="text-peach-accent animate-pulse">{`> ${currentLog}`}</p>
              </div>
              <div className="opacity-20 animate-pulse">_</div>
            </div>
          </div>
        </div>
      </div>
      
      <style>{`
        @keyframes progress { 0% { width: 0%; } 100% { width: 100%; } }
        .animate-progress { animation: progress 15s infinite ease-in-out; }
        .scrollbar-hide::-webkit-scrollbar { display: none; }
      `}</style>
    </div>
  );
};

export default ProcessingUI;
