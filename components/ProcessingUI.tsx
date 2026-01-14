
import React from 'react';
import { StepStatus, AppState } from '../types';
import { STEPS, Icons } from '../constants';

interface ProcessingUIProps {
  steps: StepStatus[];
  currentLog: string;
  activeState: AppState;
}

const ProcessingUI: React.FC<ProcessingUIProps> = ({ steps, currentLog, activeState }) => {
  return (
    <div className="max-w-5xl mx-auto space-y-12">
      <div className="bg-white border border-github-black p-8 md:p-12 shadow-[12px_12px_0px_0px_rgba(217,119,87,0.1)]">
        <div className="flex items-center justify-between mb-12 pb-6 border-b border-github-black/10">
          <h2 className="text-2xl font-bold tracking-tighter uppercase flex items-center gap-3">
            <span className="w-3 h-3 bg-peach-accent animate-pulse"></span>
            Autonomous Agent Stream
          </h2>
          <div className="text-[10px] font-bold uppercase tracking-widest bg-github-black text-peach-100 px-3 py-1">
            Running // 128.0.0.1
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
          {/* Step Indicators */}
          <div className="space-y-4">
            {steps.map((step, i) => (
              <div 
                key={step.id} 
                className={`flex items-center justify-between p-4 border transition-all duration-300 ${
                  step.status === 'loading' ? 'bg-github-black text-peach-100 border-github-black translate-x-2' : 
                  step.status === 'success' ? 'bg-peach-100 border-github-black/10 text-github-black opacity-50' : 
                  'bg-white border-github-black/10 text-github-black/30'
                }`}
              >
                <div className="flex items-center gap-4">
                  <span className="text-[10px] font-black opacity-40">0{i + 1}</span>
                  <h3 className="text-xs font-bold uppercase tracking-widest">{step.label}</h3>
                </div>
                <div>
                  {step.status === 'loading' && <Icons.Loader />}
                  {step.status === 'success' && <Icons.Check />}
                </div>
              </div>
            ))}
          </div>

          {/* Log Console */}
          <div className="bg-github-black p-6 border border-github-border overflow-hidden flex flex-col h-[400px]">
            <div className="flex items-center justify-between mb-4 border-b border-github-border pb-3">
              <span className="text-[9px] font-bold uppercase tracking-[0.3em] text-github-text/40">Terminal Output</span>
              <div className="flex gap-1.5">
                <div className="w-2 h-2 rounded-full bg-peach-accent/40"></div>
                <div className="w-2 h-2 rounded-full bg-peach-accent/40"></div>
              </div>
            </div>
            <div className="flex-1 font-mono text-[11px] leading-relaxed overflow-y-auto space-y-2 text-github-text">
              <p className="text-github-text/30">$ research-agent --verbose --pdf-source=input.pdf</p>
              <p className="text-peach-accent">>> Initializing session sequence...</p>
              {steps.filter(s => s.status === 'success').map((s, idx) => (
                <p key={idx} className="text-github-text/60">{`[OK] ${s.label} completed successfully.`}</p>
              ))}
              <div className="mt-4 pt-4 border-t border-github-border">
                <p className="text-emerald-500 animate-pulse">{`> ${currentLog}`}</p>
              </div>
              <div className="opacity-20 animate-pulse">_</div>
            </div>
          </div>
        </div>
      </div>
      
      <div className="text-center">
        <p className="text-[10px] font-bold uppercase tracking-[0.4em] text-github-black/40 italic">
          Logic consistency check in progress... Please do not interrupt the loop
        </p>
      </div>
    </div>
  );
};

export default ProcessingUI;
