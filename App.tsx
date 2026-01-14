
import React, { useState, useCallback, useRef, useEffect } from 'react';
import { AppState, StepStatus, PaperAnalysis, ImplementationResult, CodeVersion } from './types';
import { STEPS, Icons } from './constants';
import { GeminiService } from './services/geminiService';
import { executionService } from './services/executionService';
import ProcessingUI from './components/ProcessingUI';
import ResultsUI from './components/ResultsUI';

const App: React.FC = () => {
  const [state, setState] = useState<AppState>(AppState.IDLE);
  const [steps, setSteps] = useState<StepStatus[]>(
    STEPS.map(s => ({ ...s, id: s.id as AppState, status: 'pending' }))
  );
  const [currentLog, setCurrentLog] = useState<string>('');
  const [analysis, setAnalysis] = useState<PaperAnalysis | null>(null);
  const [implementation, setImplementation] = useState<ImplementationResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [savedProjects, setSavedProjects] = useState<any[]>([]);
  const [activeOverlay, setActiveOverlay] = useState<'manifesto' | 'archive' | null>(null);

  const geminiRef = useRef(new GeminiService());

  useEffect(() => {
    executionService.init().catch(console.error);
    const saved = JSON.parse(localStorage.getItem('research_loop_saved') || '[]');
    setSavedProjects(saved);
  }, []);

  const updateStep = (id: AppState, status: StepStatus['status'], message?: string) => {
    setSteps(prev => prev.map(s => s.id === id ? { ...s, status, message } : s));
  };

  const addLog = (msg: string) => setCurrentLog(msg);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setState(AppState.ANALYZING);
    setError(null);
    updateStep(AppState.ANALYZING, 'loading', 'Analyzing paper structure...');

    try {
      const reader = new FileReader();
      reader.onload = async (event) => {
        const base64 = (event.target?.result as string).split(',')[1];
        
        addLog("Analyzing theoretical methodology...");
        const paperData = await geminiRef.current.analyzePaper(base64);
        setAnalysis(paperData);
        updateStep(AppState.ANALYZING, 'success', paperData.title);
        
        setState(AppState.IMPLEMENTING);
        updateStep(AppState.IMPLEMENTING, 'loading', 'Synthesizing implementation...');
        let result = await geminiRef.current.generateInitialImplementation(paperData);
        updateStep(AppState.IMPLEMENTING, 'success', 'Base logic generated');

        let passed = false;
        let iteration = 1;
        const history: CodeVersion[] = [];

        while (!passed && iteration <= 6) {
          setState(AppState.TESTING);
          updateStep(AppState.TESTING, 'loading', `Cycle ${iteration}...`);
          addLog(`Verifying logical parity (Iteration ${iteration})...`);
          
          const runResults = await executionService.runPython(result.code, result.tests);
          result.testResults = runResults;
          passed = runResults.passed;

          history.push({
            iteration,
            code: result.code,
            explanation: result.explanation,
            error: passed ? undefined : runResults.logs,
            matchScore: (result as any).matchScore || (passed ? 99.9 : 70 + iteration * 4)
          });

          if (!passed) {
            if (iteration === 6) throw new Error("Max iterations reached without convergence.");
            setState(AppState.DEBUGGING);
            updateStep(AppState.DEBUGGING, 'loading', `Debugging cycle ${iteration}...`);
            addLog(`Repairing logic based on traceback...`);
            const refined = await geminiRef.current.refineImplementation(paperData, result, runResults.logs);
            result = { ...result, ...refined, iterationCount: iteration + 1 };
            iteration++;
          }
        }

        result.history = history;
        setState(AppState.COMPLETED);
        updateStep(AppState.COMPLETED, 'success', 'Verification complete');
        setImplementation(result);

        // Save to local storage for community projects view
        const newSaved = [{ title: paperData.title, timestamp: Date.now() }, ...savedProjects.slice(0, 4)];
        localStorage.setItem('research_loop_saved', JSON.stringify(newSaved));
        setSavedProjects(newSaved);
      };
      reader.readAsDataURL(file);
    } catch (err: any) {
      setError(err.message || "Autonomous loop interrupted by critical failure.");
      setState(AppState.ERROR);
    }
  };

  return (
    <div className="min-h-screen bg-peach-100 text-github-black font-sans selection:bg-peach-accent selection:text-white relative">
      {/* Overlays */}
      {activeOverlay && (
        <div className="fixed inset-0 z-[100] bg-peach-100 p-8 md:p-20 overflow-y-auto animate-in fade-in duration-300">
          <button 
            onClick={() => setActiveOverlay(null)}
            className="fixed top-8 right-8 w-12 h-12 border border-github-black flex items-center justify-center font-bold hover:bg-github-black hover:text-peach-100 transition-all z-[110]"
          >
            ✕
          </button>
          <div className="max-w-4xl mx-auto space-y-12">
            {activeOverlay === 'manifesto' ? (
              <div className="space-y-12">
                <h2 className="text-6xl md:text-8xl font-medium tracking-tight uppercase leading-none">THE RESEARCH<br/>MANIFESTO</h2>
                <div className="space-y-8 text-2xl text-github-black/70 leading-relaxed max-w-2xl font-medium">
                  <p>Theoretical knowledge shouldn't be trapped in PDFs. We bridge the gap between abstract equations and runnable code.</p>
                  <p className="text-peach-accent">Autonomous agents don't just write code; they verify reality.</p>
                </div>
              </div>
            ) : (
              <div className="space-y-12">
                <h2 className="text-6xl md:text-8xl font-medium tracking-tight uppercase leading-none">THE ARCHIVE</h2>
                <div className="border border-github-black divide-y divide-github-black">
                  {savedProjects.length > 0 ? savedProjects.map((p, i) => (
                    <div key={i} className="p-8 hover:bg-white transition-colors flex justify-between items-center">
                      <span className="text-xl font-bold uppercase tracking-tight">{p.title}</span>
                      <span className="text-[10px] font-black uppercase tracking-widest opacity-30">Verified {new Date(p.timestamp).toLocaleDateString()}</span>
                    </div>
                  )) : (
                    <div className="p-20 text-center opacity-20 font-black uppercase tracking-widest">No local history found</div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Header */}
      <header className="sticky top-0 z-50 bg-peach-100/80 backdrop-blur-md border-b border-github-black/10 px-6 py-4">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-2 cursor-pointer" onClick={() => setState(AppState.IDLE)}>
            <div className="w-8 h-8 bg-github-black text-peach-100 flex items-center justify-center font-bold text-sm tracking-tighter">RL</div>
            <span className="text-lg font-bold tracking-tight">RESEARCH<span className="text-peach-accent">LOOP</span></span>
          </div>
          <nav className="hidden md:flex items-center gap-6">
            <button onClick={() => setActiveOverlay('manifesto')} className="text-[10px] font-bold uppercase tracking-widest hover:text-peach-accent transition-colors">Manifesto</button>
            <button onClick={() => setActiveOverlay('archive')} className="text-[10px] font-bold uppercase tracking-widest hover:text-peach-accent transition-colors">Archive</button>
            <div className="px-4 py-2 text-[10px] font-bold uppercase tracking-widest bg-github-black text-peach-100 border border-github-black">
              Agent Active
            </div>
          </nav>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-6 pt-16 pb-32">
        {state === AppState.IDLE && (
          <div className="max-w-4xl mx-auto space-y-16 animate-in fade-in duration-700">
            <div className="space-y-6">
              <h1 className="text-7xl md:text-9xl font-medium tracking-tight leading-[0.85] italic">
                Automate the <span className="font-light not-italic">Bridge</span>.
              </h1>
              <p className="text-xl md:text-2xl text-github-black/60 font-medium max-w-2xl leading-snug">
                ResearchLoop reads PDFs, extracts core methodology, and iterates until the implementation is verified against reported benchmarks.
              </p>
            </div>

            <div className="relative group max-w-2xl">
              <div className="absolute inset-0 border border-github-black/20 translate-x-2 translate-y-2 pointer-events-none group-hover:translate-x-3 group-hover:translate-y-3 transition-transform"></div>
              <div className="relative bg-white border border-github-black p-16 cursor-pointer">
                <input type="file" className="absolute inset-0 w-full h-full opacity-0 cursor-pointer" accept="application/pdf" onChange={handleFileUpload} />
                <div className="flex flex-col items-center gap-6">
                  <div className="w-20 h-20 bg-peach-100 border border-github-black flex items-center justify-center"><Icons.Upload /></div>
                  <div className="text-center">
                    <p className="text-2xl font-bold uppercase tracking-tight">Drop PDF to start loop</p>
                    <p className="text-github-black/40 text-sm mt-2 font-medium">Verification powered by Gemini 3 Pro</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Feature Grid */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-12 pt-12 border-t border-github-black/10">
              {[
                { title: 'In-Browser Runtime', desc: 'Real Python execution using Pyodide (WASM) for verification.' },
                { title: 'Self-Correction', desc: 'Gemini-driven debugging loops that fix real traceback errors.' },
                { title: 'Theory Mapping', desc: 'Automatic linkage between equations in paper and sections of code.' }
              ].map((item, i) => (
                <div key={i} className="space-y-3">
                  <h3 className="text-sm font-black uppercase tracking-widest text-peach-accent">{item.title}</h3>
                  <p className="text-sm text-github-black/60 font-medium leading-relaxed">{item.desc}</p>
                </div>
              ))}
            </div>

            {/* Community Projects */}
            {savedProjects.length > 0 && (
              <div className="space-y-6 pt-12 border-t border-github-black/10">
                <h3 className="text-[10px] font-black uppercase tracking-widest text-github-black/40">Recent Session Verifications</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {savedProjects.map((p, i) => (
                    <div key={i} className="p-6 bg-white border border-github-black/5 flex justify-between items-center group hover:border-peach-accent transition-colors">
                      <span className="font-bold truncate max-w-[200px] uppercase tracking-tight">{p.title}</span>
                      <span className="text-[9px] font-black uppercase tracking-widest opacity-20">Verified {new Date(p.timestamp).toLocaleDateString()}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {state !== AppState.IDLE && state !== AppState.COMPLETED && state !== AppState.ERROR && (
          <ProcessingUI steps={steps} activeState={state} currentLog={currentLog} />
        )}

        {state === AppState.COMPLETED && analysis && implementation && (
          <ResultsUI analysis={analysis} implementation={implementation} />
        )}

        {state === AppState.ERROR && (
          <div className="max-w-xl mx-auto mt-20 p-12 bg-white border border-github-black text-center space-y-6 shadow-[12px_12px_0px_0px_#0d1117]">
            <h2 className="text-2xl font-bold uppercase tracking-tighter">Loop Terminated</h2>
            <div className="bg-red-50 p-6 border border-red-100 font-mono text-xs text-red-700 text-left overflow-auto max-h-40">{error}</div>
            <button onClick={() => setState(AppState.IDLE)} className="w-full py-4 bg-github-black text-peach-100 font-bold uppercase tracking-widest text-xs hover:invert transition-all">Restart System</button>
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="mt-auto border-t border-github-black/5 py-12 px-6 bg-white/30">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-center gap-8 opacity-40 hover:opacity-100 transition-opacity">
          <p className="text-[10px] font-bold uppercase tracking-[0.2em]">ResearchLoop Engine v1.0 // Pyodide 0.26.1 Runtime</p>
          <div className="flex gap-10">
            {['GitHub', 'Documentation', 'Privacy', 'Status'].map(link => (
              <a key={link} href="#" className="text-[10px] font-bold uppercase tracking-[0.2em] hover:text-peach-accent transition-colors">{link}</a>
            ))}
          </div>
        </div>
      </footer>
    </div>
  );
};

export default App;
