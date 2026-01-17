
import React, { useState, useRef, useEffect } from 'react';
import { AppState, StepStatus, PaperAnalysis, ImplementationResult, CodeVersion } from './types';
import { STEPS, Icons } from './constants';
import { GeminiService } from './services/geminiService';
import { executionService } from './services/executionService';
import ProcessingUI from './components/ProcessingUI';
import ResultsUI from './components/ResultsUI';

const App: React.FC = () => {
  const [state, setState] = useState<AppState>(AppState.IDLE);
  const [isPro, setIsPro] = useState(false);
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

  const handleProToggle = async () => {
    if (!isPro) {
      const hasKey = await (window as any).aistudio.hasSelectedApiKey();
      if (!hasKey) {
        await (window as any).aistudio.openSelectKey();
      }
      setIsPro(true);
    } else {
      setIsPro(false);
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setState(AppState.ANALYZING);
    setError(null);
    updateStep(AppState.ANALYZING, 'loading', isPro ? 'Pro Grounding...' : 'Analyzing paper...');

    try {
      const reader = new FileReader();
      reader.onload = async (event) => {
        const base64 = (event.target?.result as string).split(',')[1];
        
        setCurrentLog(isPro ? "Web-grounding theory..." : "Extracting equations...");
        const paperData = await geminiRef.current.analyzePaper(base64, isPro);
        setAnalysis(paperData);
        updateStep(AppState.ANALYZING, 'success');
        
        setState(AppState.IMPLEMENTING);
        updateStep(AppState.IMPLEMENTING, 'loading', 'Synthesizing implementation...');
        let result = await geminiRef.current.generateInitialImplementation(paperData, isPro);
        updateStep(AppState.IMPLEMENTING, 'success');

        let passed = false;
        let iteration = 1;
        const history: CodeVersion[] = [];

        while (!passed && iteration <= 8) {
          setState(AppState.TESTING);
          updateStep(AppState.TESTING, 'loading', `Testing iter ${iteration}...`);
          setCurrentLog(`Verifying structural parity (Iteration ${iteration})...`);
          
          const runResults = await executionService.runPython(result.code, result.tests);
          result.testResults = runResults;
          passed = runResults.passed;

          history.push({
            iteration,
            code: result.code,
            explanation: result.explanation,
            error: passed ? undefined : runResults.logs,
            stabilityScore: passed ? 100 : 20 + (iteration * 10)
          });

          if (!passed) {
            if (iteration === 8) {
              setImplementation({ ...result, history });
              throw new Error("Max iterations reached. Could not converge on structural parity.");
            }
            setState(AppState.DEBUGGING);
            updateStep(AppState.DEBUGGING, 'loading', `Debugging...`);
            setCurrentLog(`Repairing logic...`);
            const refined = await geminiRef.current.refineImplementation(paperData, result, runResults.logs, isPro);
            result = { ...result, ...refined, iterationCount: iteration + 1 };
            iteration++;
          }
        }

        result.history = history;

        if (isPro) {
          setState(AppState.VISUALIZING);
          updateStep(AppState.COMPLETED, 'loading', 'Visualizing architecture...');
          setCurrentLog("Generating AI Architecture Diagram...");
          result.architectureImage = await geminiRef.current.generateArchitectureDiagram(paperData);
          
          setState(AppState.VOCALIZING);
          setCurrentLog("Synthesizing Vocal Engineer Explanation...");
          result.audioData = await geminiRef.current.generateVocalExplanation(result);
        }

        setState(AppState.COMPLETED);
        updateStep(AppState.COMPLETED, 'success');
        setImplementation(result);

        const newSaved = [{ title: paperData.title, timestamp: Date.now(), isPro }, ...savedProjects.slice(0, 4)];
        localStorage.setItem('research_loop_saved', JSON.stringify(newSaved));
        setSavedProjects(newSaved);
      };
      reader.readAsDataURL(file);
    } catch (err: any) {
      setError(err.message || "Autonomous loop failed.");
      setState(AppState.ERROR);
    }
  };

  return (
    <div className="min-h-screen bg-peach-100 text-github-black font-sans selection:bg-peach-accent selection:text-white relative">
      {/* Overlays */}
      {activeOverlay && (
        <div className="fixed inset-0 z-[100] bg-peach-100 p-8 md:p-20 overflow-y-auto animate-in fade-in duration-300">
          <button onClick={() => setActiveOverlay(null)} className="fixed top-8 right-8 w-12 h-12 border border-github-black flex items-center justify-center font-bold hover:bg-github-black hover:text-peach-100 transition-all z-[110]">✕</button>
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
                  {savedProjects.map((p, i) => (
                    <div key={i} className="p-8 hover:bg-white transition-colors flex justify-between items-center">
                      <div className="flex items-center gap-3">
                        <span className="text-xl font-bold uppercase tracking-tight">{p.title}</span>
                        {p.isPro && <span className="text-[8px] px-2 py-0.5 bg-peach-accent text-white font-black uppercase">PRO</span>}
                      </div>
                      <span className="text-[10px] font-black uppercase tracking-widest opacity-30">Verified {new Date(p.timestamp).toLocaleDateString()}</span>
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
          <div className="flex items-center gap-2 cursor-pointer" onClick={() => setState(AppState.IDLE)}>
            <div className="w-8 h-8 bg-github-black text-peach-100 flex items-center justify-center font-bold text-sm tracking-tighter">RL</div>
            <span className="text-lg font-bold tracking-tight">RESEARCH<span className="text-peach-accent">LOOP</span></span>
          </div>
          <nav className="hidden md:flex items-center gap-6">
            <button onClick={handleProToggle} className={`px-4 py-2 text-[10px] font-black uppercase tracking-widest border transition-all ${isPro ? 'bg-peach-accent border-peach-accent text-white' : 'border-github-black text-github-black hover:bg-github-black hover:text-white'}`}>
              {isPro ? 'Pro Active (Gemini 3 Pro)' : 'Upgrade to Pro'}
            </button>
            <button onClick={() => setActiveOverlay('manifesto')} className="text-[10px] font-bold uppercase tracking-widest hover:text-peach-accent transition-colors">Manifesto</button>
            <button onClick={() => setActiveOverlay('archive')} className="text-[10px] font-bold uppercase tracking-widest hover:text-peach-accent transition-colors">Archive</button>
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
                ResearchLoop reads PDFs, extracts core methodology, and iterates until implementation is verified structurally.
              </p>
            </div>

            <div className="relative group max-w-2xl">
              <div className="absolute inset-0 border border-github-black/20 translate-x-2 translate-y-2 pointer-events-none group-hover:translate-x-3 group-hover:translate-y-3 transition-transform"></div>
              <div className="relative bg-white border border-github-black p-16 cursor-pointer">
                <input type="file" className="absolute inset-0 w-full h-full opacity-0 cursor-pointer" accept="application/pdf" onChange={handleFileUpload} />
                <div className="flex flex-col items-center gap-6">
                  <div className="w-20 h-20 bg-peach-100 border border-github-black flex items-center justify-center"><Icons.Upload /></div>
                  <div className="text-center">
                    <p className="text-2xl font-bold uppercase tracking-tight">Drop PDF to start {isPro ? 'Pro' : 'Standard'} loop</p>
                    <p className="text-github-black/40 text-sm mt-2 font-medium">Verification powered by {isPro ? 'Gemini 3 Pro + Search' : 'Gemini 3 Flash'}</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {state !== AppState.IDLE && state !== AppState.COMPLETED && state !== AppState.ERROR && (
          <ProcessingUI steps={steps} activeState={state} currentLog={currentLog} />
        )}

        {state === AppState.COMPLETED && analysis && implementation && (
          <ResultsUI analysis={analysis} implementation={implementation} />
        )}

        {state === AppState.ERROR && (
          <div className="max-w-2xl mx-auto mt-20 space-y-8">
            <div className="bg-white border border-github-black p-12 text-center space-y-6 shadow-[12px_12px_0px_0px_#0d1117]">
              <h2 className="text-2xl font-bold uppercase tracking-tighter">Loop Terminated</h2>
              <div className="bg-red-50 p-6 border border-red-100 font-mono text-xs text-red-700 text-left overflow-auto max-h-48">{error}</div>
              <div className="flex gap-4">
                 <button onClick={() => setState(AppState.IDLE)} className="flex-1 py-4 bg-github-black text-peach-100 font-bold uppercase tracking-widest text-xs">New Paper</button>
                 {implementation && (
                   <button onClick={() => setState(AppState.COMPLETED)} className="flex-1 py-4 border border-github-black text-github-black font-bold uppercase tracking-widest text-xs">View Structural Analysis</button>
                 )}
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
};

export default App;
