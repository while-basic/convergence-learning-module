import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { AlgorithmType, Landscape, Point, SimulationState, SavedExperiment } from './types';
import { INITIAL_CONFIG, LANDSCAPES, LEARNING_MODULES, RESEARCH_OPTIONS, COGNITIVE_SESSION } from './constants';
import { stepSimulation } from './services/optimizer';
import Visualizer from './components/Visualizer';
import { getGeminiFeedback } from './services/geminiService';
import { Play, Pause, RefreshCw, Settings, ChevronRight, Brain, Zap, Target, Beaker, Calculator, Sigma, Database, Cpu, Save, Download, Upload, Trash2, FolderOpen } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';

const App: React.FC = () => {
  // --- State ---
  const [activeTab, setActiveTab] = useState<'learn' | 'research'>('learn');
  const [selectedModuleId, setSelectedModuleId] = useState<string>(LEARNING_MODULES[0].id);
  
  const [config, setConfig] = useState(INITIAL_CONFIG);
  const [selectedLandscape, setSelectedLandscape] = useState<Landscape>(LANDSCAPES[1]); // Default to Rastrigin
  
  // Real-time Ref to allow modifying config without resetting the interval loop
  const configRef = useRef(config);
  
  // Sync Ref with State
  useEffect(() => {
    configRef.current = config;
  }, [config]);

  const [simState, setSimState] = useState<SimulationState>({
    running: false,
    iteration: 0,
    bestPoint: null,
    history: [],
    agents: [],
    trails: []
  });

  const [aiFeedback, setAiFeedback] = useState<string | null>(null);
  const [aiLoading, setAiLoading] = useState(false);
  const [savedExperiments, setSavedExperiments] = useState<SavedExperiment[]>([]);
  const [experimentName, setExperimentName] = useState("");

  const intervalRef = useRef<number | null>(null);

  // --- Actions ---

  const resetSimulation = useCallback(() => {
    // Initialize Agents randomly
    const newAgents: Point[] = [];
    const count = config.algo === AlgorithmType.GENETIC ? (config.populationSize || 20) : 1;
    
    for(let i=0; i<count; i++) {
        const x = Math.random() * (selectedLandscape.maxX - selectedLandscape.minX) + selectedLandscape.minX;
        const y = Math.random() * (selectedLandscape.maxY - selectedLandscape.minY) + selectedLandscape.minY;
        newAgents.push({ x, y, value: selectedLandscape.func(x, y) });
    }

    // Sort to find best
    newAgents.sort((a,b) => a.value - b.value);

    // Init trails: each agent starts with its initial position
    const initialTrails = newAgents.map(a => [a]);

    setSimState({
        running: false,
        iteration: 0,
        bestPoint: newAgents[0],
        history: [{ iteration: 0, cost: newAgents[0].value }],
        agents: newAgents,
        trails: initialTrails
    });
    setAiFeedback(null);
  }, [config.algo, config.populationSize, selectedLandscape]);

  useEffect(() => {
    resetSimulation();
  }, [resetSimulation]);

  // Intelligent Algorithm Filtering
  const allowedAlgorithms = useMemo(() => {
      if (selectedLandscape.name === "Cognitive Sandbox") {
          return [AlgorithmType.SIMULATED_ANNEALING, AlgorithmType.GENETIC];
      }
      return Object.values(AlgorithmType);
  }, [selectedLandscape.name]);

  // Auto-switch algorithm if current is not allowed
  useEffect(() => {
      if (!allowedAlgorithms.includes(config.algo)) {
          setConfig(prev => ({ ...prev, algo: allowedAlgorithms[0] }));
      }
  }, [selectedLandscape.name, allowedAlgorithms, config.algo]);


  const toggleSimulation = () => {
    setSimState(prev => ({ ...prev, running: !prev.running }));
  };

  // --- Loop ---
  useEffect(() => {
    if (simState.running) {
      intervalRef.current = window.setInterval(() => {
        setSimState(prev => {
            // Read from Ref to get latest config without restarting interval
            const currentConfig = configRef.current; 

            if (prev.iteration >= currentConfig.maxIterations) {
                return { ...prev, running: false };
            }

            const nextAgents = stepSimulation(
                currentConfig.algo, 
                prev.agents, 
                selectedLandscape, 
                prev.iteration, 
                { 
                    stepSize: currentConfig.learningRate, 
                    temperature: currentConfig.temperature || 100, 
                    mutationRate: currentConfig.mutationRate || 0.1 
                }
            );
            
            let nextTrails = [...prev.trails];
            if (currentConfig.algo === AlgorithmType.GENETIC) {
                 nextTrails = nextAgents.map(a => [a]);
            } else {
                 nextTrails = prev.trails.map((trail, i) => [...trail, nextAgents[i]]);
            }

            // Calculate stats
            const sortedAgents = [...nextAgents].sort((a, b) => a.value - b.value);
            const currentBest = sortedAgents[0];
            const globalBest = (!prev.bestPoint || currentBest.value < prev.bestPoint.value) ? currentBest : prev.bestPoint;

            return {
                ...prev,
                iteration: prev.iteration + 1,
                agents: nextAgents,
                bestPoint: globalBest,
                history: [...prev.history, { iteration: prev.iteration + 1, cost: currentBest.value }],
                trails: nextTrails
            };
        });
      }, 50); // 50ms per frame
    } else {
        if (intervalRef.current) clearInterval(intervalRef.current);
    }
    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  }, [simState.running, selectedLandscape]); // Removed config dependency to prevent reset

  // --- AI Grading Trigger ---
  useEffect(() => {
    if (!simState.running && simState.iteration > 0 && !aiFeedback && !aiLoading && simState.iteration >= config.maxIterations) {
       handleAIGrading();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [simState.running, simState.iteration]);

  const handleAIGrading = async () => {
      setAiLoading(true);
      const startCost = simState.history[0]?.cost || 0;
      const endCost = simState.bestPoint?.value || 0;
      
      const sessionContext = selectedLandscape.name === "Cognitive Sandbox" 
          ? JSON.stringify(COGNITIVE_SESSION) 
          : null;

      const feedback = await getGeminiFeedback(
          config.algo,
          selectedLandscape.name,
          startCost,
          endCost,
          simState.iteration,
          true,
          sessionContext
      );
      setAiFeedback(feedback);
      setAiLoading(false);
  };

  // --- Session Management ---

  const handleSaveExperiment = () => {
      const name = experimentName || `Experiment ${savedExperiments.length + 1}`;
      const newExp: SavedExperiment = {
          id: crypto.randomUUID(),
          name,
          timestamp: Date.now(),
          config: { ...config },
          landscapeName: selectedLandscape.name
      };
      setSavedExperiments(prev => [newExp, ...prev]);
      setExperimentName("");
  };

  const handleLoadExperiment = (exp: SavedExperiment) => {
      setConfig(exp.config);
      const land = LANDSCAPES.find(l => l.name === exp.landscapeName);
      if (land) setSelectedLandscape(land);
      resetSimulation();
  };

  const handleDeleteExperiment = (id: string) => {
      setSavedExperiments(prev => prev.filter(e => e.id !== id));
  };

  const handleExport = () => {
      const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(savedExperiments));
      const downloadAnchorNode = document.createElement('a');
      downloadAnchorNode.setAttribute("href",     dataStr);
      downloadAnchorNode.setAttribute("download", "optima_experiments.json");
      document.body.appendChild(downloadAnchorNode); // required for firefox
      downloadAnchorNode.click();
      downloadAnchorNode.remove();
  };

  const handleImport = (event: React.ChangeEvent<HTMLInputElement>) => {
      const fileReader = new FileReader();
      if(event.target.files && event.target.files[0]) {
          fileReader.readAsText(event.target.files[0], "UTF-8");
          fileReader.onload = (e) => {
              try {
                  const imported = JSON.parse(e.target?.result as string);
                  if(Array.isArray(imported)) {
                      setSavedExperiments(prev => [...imported, ...prev]);
                  }
              } catch(err) {
                  console.error("Failed to parse import", err);
                  alert("Invalid file format.");
              }
          };
      }
  };

  // --- Research Helpers ---
  
  const calculateCombinations = useMemo(() => {
    let n = 1;
    n *= allowedAlgorithms.length; // Dynamic based on landscape
    n *= 1; // 1 Landscape selected
    n *= RESEARCH_OPTIONS.learningRates.length;
    n *= RESEARCH_OPTIONS.maxIterations.length;
    
    if (config.algo === AlgorithmType.SIMULATED_ANNEALING) {
        n *= RESEARCH_OPTIONS.temperatures.length;
    } else if (config.algo === AlgorithmType.GENETIC) {
        n *= RESEARCH_OPTIONS.populationSizes.length;
        n *= RESEARCH_OPTIONS.mutationRates.length;
    }
    
    return n;
  }, [config.algo, allowedAlgorithms.length]);

  const getEquation = () => {
      switch(config.algo) {
          case AlgorithmType.GREEDY:
          case AlgorithmType.HILL_CLIMBING:
              return "x_{t+1} = x_t - \\eta \\cdot \\nabla f(x_t)";
          case AlgorithmType.SIMULATED_ANNEALING:
              return "P(accept) = e^{-(E_{new} - E_{old}) / T_t}";
          case AlgorithmType.GENETIC:
              return "\\text{Pop}_{t+1} = \\sigma(\\text{Cross}(\\text{Mut}(\\text{Pop}_t)))";
          default: return "";
      }
  };

  const getHeuristic = () => {
      if (selectedLandscape.name === "Cognitive Sandbox") {
          return "System Architecture Heuristic: Non-linear anomalies require stochastic search (SA) or evolutionary diversity (Genetic) to bridge 'fragmented notes' to 'unified architecture'.";
      }

      if (config.algo === AlgorithmType.HILL_CLIMBING) {
          if (config.learningRate > 0.5) return "High Learning Rate: Risk of overshooting minima.";
          return "Gradient descent heuristic: Follow the steepest slope.";
      }
      if (config.algo === AlgorithmType.SIMULATED_ANNEALING) {
           return "Metropolis heuristic: Allow uphill moves to escape local optima.";
      }
      if (config.algo === AlgorithmType.GENETIC) {
          return "Evolutionary heuristic: Diversity prevents premature convergence.";
      }
      return "Greedy heuristic: Immediate gratification.";
  };

  const renderModuleCard = (module: typeof LEARNING_MODULES[0]) => (
    <div 
        key={module.id}
        onClick={() => setSelectedModuleId(module.id)}
        className={`p-6 rounded-2xl cursor-pointer transition-all border ${selectedModuleId === module.id ? 'bg-white/10 border-blue-500 shadow-[0_0_20px_rgba(0,122,255,0.3)]' : 'bg-white/5 border-white/10 hover:bg-white/10'}`}
    >
        <div className="flex justify-between items-start mb-2">
            <h3 className="text-xl font-semibold text-white">{module.title}</h3>
            <span className={`text-xs px-2 py-1 rounded-full ${module.difficulty === 'Beginner' ? 'bg-green-900 text-green-300' : module.difficulty === 'Intermediate' ? 'bg-yellow-900 text-yellow-300' : 'bg-red-900 text-red-300'}`}>
                {module.difficulty}
            </span>
        </div>
        <p className="text-gray-400 text-sm mb-4">{module.description}</p>
        {selectedModuleId === module.id && (
            <div className="mt-4 p-4 bg-black/50 rounded-lg border border-white/5 text-blue-200 text-sm animate-fadeIn">
                <span className="font-bold block mb-1">Concept:</span>
                {module.concept}
            </div>
        )}
    </div>
  );

  return (
    <div className="min-h-screen bg-black text-white selection:bg-blue-500/30">
        {/* Navigation */}
        <nav className="fixed top-0 w-full z-50 bg-black/80 backdrop-blur-xl border-b border-white/10">
            <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <div className="w-8 h-8 bg-gradient-to-tr from-blue-600 to-purple-600 rounded-lg flex items-center justify-center">
                        <Zap className="w-5 h-5 text-white" />
                    </div>
                    <span className="font-bold text-xl tracking-tight">Optima <span className="text-gray-500 font-normal">| CLOS Research</span></span>
                </div>
                <div className="flex bg-white/5 rounded-full p-1 border border-white/10">
                    <button 
                        onClick={() => setActiveTab('learn')}
                        className={`px-6 py-1.5 rounded-full text-sm font-medium transition-all ${activeTab === 'learn' ? 'bg-white text-black shadow-lg' : 'text-gray-400 hover:text-white'}`}
                    >
                        Learn
                    </button>
                    <button 
                         onClick={() => setActiveTab('research')}
                         className={`px-6 py-1.5 rounded-full text-sm font-medium transition-all ${activeTab === 'research' ? 'bg-white text-black shadow-lg' : 'text-gray-400 hover:text-white'}`}
                    >
                        Research
                    </button>
                </div>
            </div>
        </nav>

        {/* Main Content */}
        <main className="pt-24 pb-12 max-w-7xl mx-auto px-6 grid grid-cols-1 lg:grid-cols-12 gap-8">
            
            {/* Left Panel: Research Controls */}
            <div className="lg:col-span-4 space-y-6">
                
                {activeTab === 'learn' ? (
                    <div className="space-y-4">
                        <h2 className="text-2xl font-bold mb-6">Learning Path</h2>
                        {LEARNING_MODULES.map(renderModuleCard)}
                    </div>
                ) : (
                    <div className="space-y-6 animate-fadeIn">
                        
                        {/* Cognitive Session Indicator */}
                         {selectedLandscape.name === "Cognitive Sandbox" && (
                             <div className="p-4 rounded-xl border border-purple-500/30 bg-purple-900/10 flex flex-col gap-2">
                                <div className="flex items-center gap-2 text-purple-400 font-semibold text-sm">
                                    <Brain size={16} /> Active Session: {COGNITIVE_SESSION.session_id.slice(0,8)}
                                </div>
                                <div className="text-xs text-gray-400">
                                    Mode: <span className="text-white">{COGNITIVE_SESSION.cognitive_mode}</span>
                                </div>
                                <div className="text-xs text-gray-400 mt-1">
                                    <i>Filtered algorithms to match 'emergent_patterns' & 'anomalies'.</i>
                                </div>
                             </div>
                         )}

                        {/* CLOS Insight Panel */}
                        <div className="p-6 bg-gradient-to-br from-blue-900/20 to-purple-900/20 border border-white/10 rounded-2xl relative overflow-hidden">
                             <div className="absolute top-0 right-0 p-4 opacity-10">
                                <Sigma size={64} />
                             </div>
                             <h2 className="text-lg font-bold mb-2 flex items-center gap-2 text-blue-300">
                                <Beaker className="w-4 h-4"/> Mathematical Model
                             </h2>
                             <div className="font-mono text-xl text-white mb-4 tracking-wider">
                                 {getEquation()}
                             </div>
                             <div className="bg-black/30 p-3 rounded-lg border border-white/5">
                                 <h4 className="text-xs uppercase tracking-wider text-purple-400 mb-1">Cognitive Heuristic</h4>
                                 <p className="text-sm text-gray-300 italic">
                                     "{getHeuristic()}"
                                 </p>
                             </div>
                        </div>

                        {/* Parameter Control Deck */}
                        <div className="p-6 bg-white/5 border border-white/10 rounded-2xl">
                             <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
                                <Settings className="w-5 h-5 text-gray-400"/> Experimental Setup
                             </h2>
                             
                             {/* Primary Controls */}
                             <div className="space-y-4">
                                <div>
                                    <label className="block text-xs uppercase tracking-wider text-gray-500 mb-2">Test Landscape</label>
                                    <select 
                                        className="w-full bg-black border border-white/20 rounded-lg px-4 py-2 text-sm text-white focus:outline-none focus:border-blue-500"
                                        value={selectedLandscape.name}
                                        onChange={(e) => {
                                            const l = LANDSCAPES.find(land => land.name === e.target.value);
                                            if(l) setSelectedLandscape(l);
                                        }}
                                    >
                                        {LANDSCAPES.map(l => (
                                            <option key={l.name} value={l.name}>
                                                {l.name} {l.name === "Cognitive Sandbox" ? "(Session Data)" : ""}
                                            </option>
                                        ))}
                                    </select>
                                </div>

                                <div>
                                    <label className="block text-xs uppercase tracking-wider text-gray-500 mb-2">Algorithm Strategy</label>
                                    <select 
                                        className="w-full bg-black border border-white/20 rounded-lg px-4 py-2 text-sm text-white focus:outline-none focus:border-blue-500"
                                        value={config.algo}
                                        onChange={(e) => setConfig({...config, algo: e.target.value as AlgorithmType})}
                                    >
                                        {allowedAlgorithms.map(t => (
                                            <option key={t} value={t}>{t.replace('_', ' ')}</option>
                                        ))}
                                    </select>
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-xs text-gray-500 mb-1">Learning Rate</label>
                                        <select
                                            className="w-full bg-black border border-white/20 rounded-lg px-3 py-2 text-sm"
                                            value={config.learningRate}
                                            onChange={(e) => setConfig({...config, learningRate: parseFloat(e.target.value)})}
                                        >
                                            {RESEARCH_OPTIONS.learningRates.map(v => <option key={v} value={v}>{v}</option>)}
                                        </select>
                                    </div>
                                    <div>
                                        <label className="block text-xs text-gray-500 mb-1">Max Iterations</label>
                                        <select
                                            className="w-full bg-black border border-white/20 rounded-lg px-3 py-2 text-sm"
                                            value={config.maxIterations}
                                            onChange={(e) => setConfig({...config, maxIterations: parseInt(e.target.value)})}
                                        >
                                            {RESEARCH_OPTIONS.maxIterations.map(v => <option key={v} value={v}>{v}</option>)}
                                        </select>
                                    </div>
                                </div>

                                {/* Conditional Parameters */}
                                {config.algo === AlgorithmType.SIMULATED_ANNEALING && (
                                    <div className="animate-fadeIn">
                                        <label className="block text-xs text-gray-500 mb-1">Initial Temperature</label>
                                        <select
                                            className="w-full bg-black border border-white/20 rounded-lg px-3 py-2 text-sm border-orange-500/30 text-orange-200"
                                            value={config.temperature}
                                            onChange={(e) => setConfig({...config, temperature: parseInt(e.target.value)})}
                                        >
                                            {RESEARCH_OPTIONS.temperatures.map(v => <option key={v} value={v}>{v}</option>)}
                                        </select>
                                    </div>
                                )}

                                {config.algo === AlgorithmType.GENETIC && (
                                    <div className="grid grid-cols-2 gap-4 animate-fadeIn">
                                        <div>
                                            <label className="block text-xs text-gray-500 mb-1">Population</label>
                                            <select
                                                className="w-full bg-black border border-white/20 rounded-lg px-3 py-2 text-sm border-green-500/30 text-green-200"
                                                value={config.populationSize}
                                                onChange={(e) => setConfig({...config, populationSize: parseInt(e.target.value)})}
                                            >
                                                {RESEARCH_OPTIONS.populationSizes.map(v => <option key={v} value={v}>{v}</option>)}
                                            </select>
                                        </div>
                                        <div>
                                            <label className="block text-xs text-gray-500 mb-1">Mutation Rate</label>
                                            <select
                                                className="w-full bg-black border border-white/20 rounded-lg px-3 py-2 text-sm border-green-500/30 text-green-200"
                                                value={config.mutationRate}
                                                onChange={(e) => setConfig({...config, mutationRate: parseFloat(e.target.value)})}
                                            >
                                                {RESEARCH_OPTIONS.mutationRates.map(v => <option key={v} value={v}>{v}</option>)}
                                            </select>
                                        </div>
                                    </div>
                                )}
                             </div>

                             {/* Combinatorial Stat */}
                             <div className="mt-6 pt-4 border-t border-white/10 flex items-center justify-between text-gray-400">
                                 <div className="flex items-center gap-2">
                                     <Calculator size={14} />
                                     <span className="text-xs">Config Space Size</span>
                                 </div>
                                 <span className="text-sm font-mono text-blue-400">{calculateCombinations.toLocaleString()} variants</span>
                             </div>
                        </div>

                         {/* Session Manager */}
                        <div className="p-6 bg-white/5 border border-white/10 rounded-2xl">
                             <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
                                <Database className="w-5 h-5 text-gray-400"/> Session Manager
                             </h2>
                             
                             <div className="flex flex-col gap-3">
                                 <div className="flex gap-2">
                                     <input 
                                        type="text" 
                                        placeholder="Experiment Name..." 
                                        className="flex-1 bg-black border border-white/20 rounded-lg px-3 py-2 text-sm focus:border-blue-500 outline-none"
                                        value={experimentName}
                                        onChange={(e) => setExperimentName(e.target.value)}
                                     />
                                     <button 
                                        onClick={handleSaveExperiment}
                                        className="bg-blue-600 hover:bg-blue-500 text-white p-2 rounded-lg transition-colors"
                                        title="Save Current Config"
                                     >
                                         <Save size={18} />
                                     </button>
                                 </div>

                                 <div className="flex gap-2 mt-2">
                                     <button onClick={handleExport} className="flex-1 flex items-center justify-center gap-2 bg-white/10 hover:bg-white/20 py-2 rounded-lg text-xs font-medium transition-colors">
                                         <Download size={14} /> Export All
                                     </button>
                                     <label className="flex-1 flex items-center justify-center gap-2 bg-white/10 hover:bg-white/20 py-2 rounded-lg text-xs font-medium transition-colors cursor-pointer">
                                         <Upload size={14} /> Import
                                         <input type="file" className="hidden" accept=".json" onChange={handleImport} />
                                     </label>
                                 </div>

                                 {savedExperiments.length > 0 && (
                                     <div className="mt-4 space-y-2 max-h-40 overflow-y-auto pr-1">
                                         <h4 className="text-xs text-gray-500 uppercase">Saved States</h4>
                                         {savedExperiments.map(exp => (
                                             <div key={exp.id} className="flex items-center justify-between bg-black/40 p-2 rounded border border-white/5 group">
                                                 <div onClick={() => handleLoadExperiment(exp)} className="cursor-pointer flex-1">
                                                     <div className="text-xs font-semibold text-gray-300 group-hover:text-blue-400">{exp.name}</div>
                                                     <div className="text-[10px] text-gray-600">{exp.landscapeName} • {new Date(exp.timestamp).toLocaleTimeString()}</div>
                                                 </div>
                                                 <button onClick={() => handleDeleteExperiment(exp.id)} className="text-gray-600 hover:text-red-500 p-1">
                                                     <Trash2 size={12} />
                                                 </button>
                                             </div>
                                         ))}
                                     </div>
                                 )}
                             </div>
                        </div>
                    </div>
                )}
            </div>

            {/* Right Panel: Visualization & Stats */}
            <div className="lg:col-span-8 space-y-6">
                {/* Visualizer Card */}
                <div className="bg-apple-gray border border-white/10 rounded-2xl p-1 overflow-hidden relative group">
                    <div className="absolute top-4 right-4 z-10 flex gap-2">
                        <button 
                            onClick={toggleSimulation}
                            className={`p-3 rounded-full backdrop-blur-md transition-all ${simState.running ? 'bg-red-500/20 text-red-500 border border-red-500/50' : 'bg-green-500/20 text-green-500 border border-green-500/50 hover:bg-green-500/30'}`}
                        >
                            {simState.running ? <Pause size={20} /> : <Play size={20} fill="currentColor" />}
                        </button>
                        <button 
                            onClick={resetSimulation}
                            className="p-3 bg-white/10 backdrop-blur-md rounded-full text-white border border-white/20 hover:bg-white/20 transition-all"
                        >
                            <RefreshCw size={20} />
                        </button>
                    </div>
                    
                    <div className="w-full h-[500px] flex items-center justify-center bg-black rounded-xl">
                        <Visualizer 
                            landscape={selectedLandscape} 
                            agents={simState.agents}
                            trails={simState.trails}
                            width={600}
                            height={500}
                        />
                    </div>
                </div>

                {/* Metrics & Graphs */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Graph */}
                    <div className="bg-white/5 border border-white/10 rounded-2xl p-6 h-64">
                        <h3 className="text-sm font-medium text-gray-400 mb-4">Convergence Dynamics</h3>
                        <ResponsiveContainer width="100%" height="100%">
                            <LineChart data={simState.history}>
                                <XAxis dataKey="iteration" hide />
                                <YAxis domain={['auto', 'auto']} hide />
                                <Tooltip 
                                    contentStyle={{ backgroundColor: '#1C1C1E', borderColor: '#333', color: '#fff' }}
                                    itemStyle={{ color: '#007AFF' }}
                                    formatter={(value: number) => [value.toFixed(4), 'Cost']}
                                />
                                <Line 
                                    type="monotone" 
                                    dataKey="cost" 
                                    stroke="#007AFF" 
                                    strokeWidth={2} 
                                    dot={false}
                                    isAnimationActive={false}
                                />
                            </LineChart>
                        </ResponsiveContainer>
                    </div>

                    {/* Stats & AI Feedback */}
                    <div className="bg-white/5 border border-white/10 rounded-2xl p-6 relative overflow-hidden">
                        <div className="flex justify-between items-start mb-4">
                            <h3 className="text-sm font-medium text-gray-400">Research Analysis</h3>
                            {aiLoading && <div className="text-xs text-blue-400 animate-pulse">Computing...</div>}
                        </div>
                        
                        <div className="grid grid-cols-2 gap-4 mb-4">
                            <div>
                                <div className="text-2xl font-bold text-white">{simState.bestPoint?.value.toFixed(4) || "0.0000"}</div>
                                <div className="text-xs text-gray-500">Global Min (Found)</div>
                            </div>
                            <div>
                                <div className="text-2xl font-bold text-white">{simState.iteration}</div>
                                <div className="text-xs text-gray-500">Epochs</div>
                            </div>
                        </div>

                        <div className={`mt-4 pt-4 border-t border-white/10 text-sm transition-opacity duration-500 ${aiFeedback ? 'opacity-100' : 'opacity-50'}`}>
                            {aiFeedback ? (
                                <p className="text-gray-200 leading-relaxed italic">"{aiFeedback}"</p>
                            ) : (
                                <p className="text-gray-600">Complete the experiment to receive CLOS grading and cognitive insight.</p>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </main>
    </div>
  );
};

export default App;