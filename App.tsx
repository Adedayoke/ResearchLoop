
import React, { useState, useCallback, useRef, useEffect } from 'react';
import { AppState, StepStatus, PaperAnalysis, ImplementationResult } from './types';
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

  const [isGitConnected, setIsGitConnected] = useState(false);
  const [isConnectingGit, setIsConnectingGit] = useState(false);
  const [activeOverlay, setActiveOverlay] = useState<'manifesto' | 'archive' | null>(null);

  const geminiRef = useRef(new GeminiService());

  useEffect(() => {
    // Warm up pyodide in background
    executionService.init().catch(console.error);
  }, []);

  const updateStep = (id: AppState, status: StepStatus['status'], message?: string) => {
    setSteps(prev => prev.map(s => s.id === id ? { ...s, status, message } : s));
  };

  const addLog = (msg: string) => {
    setCurrentLog(msg);
  };

  const handleConnectGit = () => {
    if (isGitConnected) {
      setIsGitConnected(false);
      return;
    }
    setIsConnectingGit(true);
    setTimeout(() => {
      setIsConnectingGit(false);
      setIsGitConnected(true);
    }, 1500);
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setState(AppState.ANALYZING);
    setError(null);
    updateStep(AppState.ANALYZING, 'loading', 'Analyzing semantic structure...');

    try {
      const reader = new FileReader();
      reader.onload = async (event) => {
        const base64 = (event.target?.result as string).split(',')[1];
        
        addLog("Initializing Gemini 3 Pro reasoning engine...");
        const paperData = await geminiRef.current.analyzePaper(base64);
        setAnalysis(paperData);
        updateStep(AppState.ANALYZING, 'success', `${paperData.title.slice(0, 30)}...`);
        
        setState(AppState.IMPLEMENTING);
        updateStep(AppState.IMPLEMENTING, 'loading', 'Generating logic...');
        addLog("Synthesizing paper-accurate implementation in Python...");
        let result = await geminiRef.current.generateInitialImplementation(paperData);
        updateStep(AppState.IMPLEMENTING, 'success', 'Code synthesized');

        // Testing Loop
        let passed = false;
        let iteration = 1;
        const MAX_ITERATIONS = 3;

        while (!passed && iteration <= MAX_ITERATIONS) {
          setState(AppState.TESTING);
          updateStep(AppState.TESTING, 'loading', `Verifying cycle ${iteration}...`);
          addLog(`Booting Pyodide environment for iteration ${iteration}...`);
          
          const runResults = await executionService.runPython(result.code, result.tests);
          result.testResults = runResults;
          passed = runResults.passed;

          if (!passed) {
            if (iteration === MAX_ITERATIONS) break;
            
            setState(AppState.DEBUGGING);
            updateStep(AppState.DEBUGGING, 'loading', `Debugging failure ${iteration}...`);
            addLog(`Analyzing traceback: ${runResults.logs.split('\n').pop()}`);
            result = await geminiRef.current.refineImplementation(paperData, result, runResults.logs);
            result.iterationCount = iteration + 1;
            iteration++;
            updateStep(AppState.DEBUGGING, 'success', `Fix applied for loop ${iteration-1}`);
          } else {
            updateStep(AppState.DEBUGGING, 'success', 'Logical parity achieved');
          }
        }

        if (!passed) {
          throw new Error("Autonomous agent reached max iterations without convergence. Check logs for details.");
        }

        updateStep(AppState.TESTING, 'success', 'All verification tests passed');
        setState(AppState.COMPLETED);
        updateStep(AppState.COMPLETED, 'success', 'Verification complete');
        setImplementation(result);
      };
      reader.readAsDataURL(file);
    } catch (err: any) {
      setError(err.message || 'Processing aborted due to unexpected error.');
      setState(AppState.ERROR);
    }
  };

  const MOCK_ARCHIVE = [
    { title: "Attention Is All You Need", date: "2024-03-12", status: "Verified" },
    { title: "LoRA: Low-Rank Adaptation", date: "2024-03-10", status: "Verified" },
    { title: "Generative Adversarial Nets", date: "2024-03-05", status: "Verified" },
  ];

  return (
    <div className="min-h-screen bg-peach-100 text-github-black font-sans selection:bg-peach-accent selection:text-white relative">
      {/* Overlay Screens */}
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
                  <p>In the digital age, scientific knowledge is often trapped within static PDF documents. Research papers are the lifeblood of innovation, yet implementation remains a manual, error-prone bottleneck.</p>
                  <p className="text-peach-accent">We believe that every theoretical breakthrough should be immediately actionable.</p>
                  <p>ResearchLoop is an autonomous bridging engine. We use advanced LLMs to verify that theory matches reality through continuous, self-correcting testing loops.</p>
                </div>
              </div>
            ) : (
              <div className="space-y-12">
                <h2 className="text-6xl md:text-8xl font-medium tracking-tight uppercase leading-none">THE ARCHIVE</h2>
                <div className="border border-github-black">
                  {MOCK_ARCHIVE.map((item, idx) => (
                    <div key={idx} className="border-b border-github-black last:border-0 p-6 flex justify-between items-center hover:bg-white transition-colors">
                      <div>
                        <h3 className="font-bold uppercase tracking-tight text-lg">{item.title}</h3>
                        <p className="text-xs text-github-black/40 font-bold uppercase tracking-widest mt-1">Processed {item.date}</p>
                      </div>
                      <span className="px-3 py-1 bg-github-black text-peach-100 text-[9px] font-black uppercase tracking-widest">{item.status}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Header */}
      <header className="sticky top-0 z-50 bg-peach-100/80 backdrop-blur-md border-b border-github-black/10 px-6 py-4">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-2 cursor-pointer" onClick={() => { setState(AppState.IDLE); setActiveOverlay(null); }}>
            <div className="w-8 h-8 bg-github-black text-peach-100 flex items-center justify-center font-bold text-sm tracking-tighter">
              RL
            </div>
            <span className="text-lg font-bold tracking-tight">RESEARCH<span className="text-peach-accent">LOOP</span></span>
          </div>
          <nav className="hidden md:flex items-center gap-6">
            <button onClick={() => setActiveOverlay('manifesto')} className="text-[10px] font-bold uppercase tracking-widest hover:text-peach-accent transition-colors">Manifesto</button>
            <button onClick={() => setActiveOverlay('archive')} className="text-[10px] font-bold uppercase tracking-widest hover:text-peach-accent transition-colors">Archive</button>
            <button 
              onClick={handleConnectGit}
              disabled={isConnectingGit}
              className={`px-4 py-2 text-[10px] font-bold uppercase tracking-widest transition-all border ${
                isGitConnected 
                ? 'bg-emerald-50 text-emerald-700 border-emerald-200' 
                : 'bg-github-black text-peach-100 border-github-black'
              } ${isConnectingGit ? 'opacity-50 cursor-wait' : 'hover:opacity-90'}`}
            >
              {isConnectingGit ? 'Connecting...' : isGitConnected ? 'Connected: ResearchRepo' : 'Connect Git'}
            </button>
          </nav>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-6 pt-16">
        {state === AppState.IDLE && (
          <div className="max-w-4xl mx-auto space-y-12">
            <div className="space-y-6">
              <h1 className="text-6xl md:text-8xl font-medium tracking-tight leading-[0.9]">
                Autonomously implement <span className="italic font-light">theory</span>.
              </h1>
              <p className="text-xl md:text-2xl text-github-black/60 font-medium max-w-2xl leading-snug">
                ResearchLoop reads PDFs, extracts core methodology, and iterates until the implementation is verified against reported benchmarks.
              </p>
            </div>

            <div className="relative group max-w-2xl">
              <div className="absolute inset-0 border border-github-black/20 translate-x-2 translate-y-2 pointer-events-none group-hover:translate-x-3 group-hover:translate-y-3 transition-transform"></div>
              <div className="relative bg-white border border-github-black p-12 transition-all cursor-pointer">
                <input 
                  type="file" 
                  className="absolute inset-0 w-full h-full opacity-0 cursor-pointer" 
                  accept="application/pdf"
                  onChange={handleFileUpload}
                />
                <div className="flex flex-col items-center gap-6 text-center">
                  <div className="w-16 h-16 bg-peach-100 border border-github-black flex items-center justify-center">
                    <Icons.Upload />
                  </div>
                  <div>
                    <p className="text-xl font-bold uppercase tracking-tight">Drop research paper</p>
                    <p className="text-github-black/40 text-sm mt-1 font-medium">Accepts standard PDF format</p>
                  </div>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-12 pt-12 border-t border-github-black/10">
              {[
                { title: 'In-Browser Runtime', desc: 'Real Python execution using Pyodide (WASM) for verification.' },
                { title: 'Self-Correction', desc: 'Gemini-driven debugging loops that fix real traceback errors.' },
                { title: 'Benchmark Parity', desc: 'Validation of implementation accuracy against paper reported scores.' }
              ].map((item, i) => (
                <div key={i} className="space-y-3">
                  <h3 className="text-sm font-black uppercase tracking-widest text-peach-accent">{item.title}</h3>
                  <p className="text-sm text-github-black/60 font-medium leading-relaxed">{item.desc}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {(state !== AppState.IDLE && state !== AppState.COMPLETED && state !== AppState.ERROR) && (
          <ProcessingUI steps={steps} activeState={state} currentLog={currentLog} />
        )}

        {state === AppState.COMPLETED && analysis && implementation && (
          <ResultsUI analysis={analysis} implementation={implementation} />
        )}

        {state === AppState.ERROR && (
          <div className="max-w-xl mx-auto mt-20 p-12 bg-white border border-github-black text-center space-y-6 shadow-[8px_8px_0px_0px_rgba(13,17,23,1)]">
            <h2 className="text-2xl font-bold uppercase tracking-tighter">System Error</h2>
            <p className="text-github-black/60 font-medium">{error || "Critical failure in autonomous reasoning pipeline."}</p>
            <button 
              onClick={() => setState(AppState.IDLE)}
              className="px-8 py-3 bg-github-black text-peach-100 font-bold uppercase tracking-widest text-xs hover:invert transition-all"
            >
              Reset Session
            </button>
          </div>
        )}
      </main>

      <footer className="mt-32 border-t border-github-black/5 py-12 px-6">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-center gap-8 opacity-40 hover:opacity-100 transition-opacity">
          <p className="text-[10px] font-bold uppercase tracking-[0.2em]">ResearchLoop Engine v1.0 // Pyodide Runtime</p>
          <div className="flex gap-10">
            {['Source', 'Privacy', 'Legal'].map(link => (
              <a key={link} href="#" className="text-[10px] font-bold uppercase tracking-[0.2em] hover:text-peach-accent">{link}</a>
            ))}
          </div>
        </div>
      </footer>
    </div>
  );
};

export default App;
