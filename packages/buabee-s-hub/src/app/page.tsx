'use client';

import { useEffect, useState, useRef } from 'react';

type AssessmentPhase = 'intro' | 'focus' | 'memory' | 'reaction' | 'results';

interface FocusData {
  totalTimeOnTarget: number;
  totalTime: number;
  avgDistance: number;
  samples: number;
}

interface MemoryData {
  maxSequence: number;
  totalAttempts: number;
  correctAttempts: number;
  avgResponseTime: number;
}

interface ReactionData {
  totalClicks: number;
  totalTargets: number;
  avgReactionTime: number;
  missedTargets: number;
}

export default function CognitiveAssessment() {
  const [phase, setPhase] = useState<AssessmentPhase>('intro');
  const [timeLeft, setTimeLeft] = useState(60);
  
  // Focus phase state
  const [dotPosition, setDotPosition] = useState({ x: 50, y: 50 });
  const [cursorPosition, setCursorPosition] = useState({ x: 0, y: 0 });
  const [focusData, setFocusData] = useState<FocusData>({
    totalTimeOnTarget: 0,
    totalTime: 0,
    avgDistance: 0,
    samples: 0
  });
  
  // Memory phase state
  const [sequence, setSequence] = useState<string[]>([]);
  const [userSequence, setUserSequence] = useState<string[]>([]);
  const [showingSequence, setShowingSequence] = useState(false);
  const [currentFlash, setCurrentFlash] = useState(-1);
  const [memoryData, setMemoryData] = useState<MemoryData>({
    maxSequence: 0,
    totalAttempts: 0,
    correctAttempts: 0,
    avgResponseTime: 0
  });
  const [sequenceLength, setSequenceLength] = useState(4);
  
  // Reaction phase state
  const [target, setTarget] = useState<{ x: number; y: number; id: number } | null>(null);
  const [reactionData, setReactionData] = useState<ReactionData>({
    totalClicks: 0,
    totalTargets: 0,
    avgReactionTime: 0,
    missedTargets: 0
  });
  const targetSpawnTime = useRef<number>(0);
  const reactionTimes = useRef<number[]>([]);
  
  const colors = ['#00d9ff', '#a855f7', '#fb923c', '#ffffff'];
  const colorNames = ['cyan', 'purple', 'orange', 'white'];

  // Focus Phase: Dot movement
  useEffect(() => {
    if (phase !== 'focus') return;
    
    const moveInterval = setInterval(() => {
      const speed = Math.min(2 + (60 - timeLeft) / 10, 5);
      setDotPosition(prev => ({
        x: Math.max(10, Math.min(90, prev.x + (Math.random() - 0.5) * speed)),
        y: Math.max(10, Math.min(90, prev.y + (Math.random() - 0.5) * speed))
      }));
    }, 100);
    
    return () => clearInterval(moveInterval);
  }, [phase, timeLeft]);

  // Focus Phase: Track cursor
  useEffect(() => {
    if (phase !== 'focus') return;
    
    const handleMouseMove = (e: MouseEvent) => {
      const rect = document.getElementById('focus-area')?.getBoundingClientRect();
      if (!rect) return;
      
      const x = ((e.clientX - rect.left) / rect.width) * 100;
      const y = ((e.clientY - rect.top) / rect.height) * 100;
      setCursorPosition({ x, y });
      
      const distance = Math.sqrt(
        Math.pow(x - dotPosition.x, 2) + Math.pow(y - dotPosition.y, 2)
      );
      
      const isOnTarget = distance <= 5;
      
      setFocusData(prev => ({
        totalTimeOnTarget: prev.totalTimeOnTarget + (isOnTarget ? 0.1 : 0),
        totalTime: prev.totalTime + 0.1,
        avgDistance: (prev.avgDistance * prev.samples + distance) / (prev.samples + 1),
        samples: prev.samples + 1
      }));
    };
    
    const interval = setInterval(handleMouseMove, 100);
    document.addEventListener('mousemove', handleMouseMove);
    
    return () => {
      clearInterval(interval);
      document.removeEventListener('mousemove', handleMouseMove);
    };
  }, [phase, dotPosition]);

  // Memory Phase: Generate and show sequence
  const startMemoryRound = () => {
    const newSequence = Array.from({ length: sequenceLength }, () => 
      colorNames[Math.floor(Math.random() * colorNames.length)]
    );
    setSequence(newSequence);
    setUserSequence([]);
    setShowingSequence(true);
    setCurrentFlash(0);
  };

  useEffect(() => {
    if (phase === 'memory' && !showingSequence && sequence.length === 0) {
      startMemoryRound();
    }
  }, [phase]);

  useEffect(() => {
    if (!showingSequence || currentFlash === -1) return;
    
    if (currentFlash >= sequence.length) {
      setShowingSequence(false);
      setCurrentFlash(-1);
      return;
    }
    
    const timer = setTimeout(() => {
      setCurrentFlash(prev => prev + 1);
    }, 1000);
    
    return () => clearTimeout(timer);
  }, [showingSequence, currentFlash, sequence]);

  const handleMemoryClick = (color: string) => {
    if (showingSequence) return;
    
    const newUserSequence = [...userSequence, color];
    setUserSequence(newUserSequence);
    
    if (newUserSequence.length === sequence.length) {
      const correct = newUserSequence.every((c, i) => c === sequence[i]);
      
      setMemoryData(prev => ({
        maxSequence: correct ? Math.max(prev.maxSequence, sequenceLength) : prev.maxSequence,
        totalAttempts: prev.totalAttempts + 1,
        correctAttempts: prev.correctAttempts + (correct ? 1 : 0),
        avgResponseTime: prev.avgResponseTime
      }));
      
      if (correct && sequenceLength < 9) {
        setSequenceLength(prev => prev + 1);
      }
      
      setTimeout(() => {
        setSequence([]);
        setUserSequence([]);
      }, 500);
    }
  };

  // Reaction Phase: Spawn targets
  useEffect(() => {
    if (phase !== 'reaction') return;
    
    const spawnTarget = () => {
      setTarget({
        x: 10 + Math.random() * 80,
        y: 10 + Math.random() * 80,
        id: Date.now()
      });
      targetSpawnTime.current = Date.now();
      
      setTimeout(() => {
        setTarget(prev => {
          if (prev && prev.id === targetSpawnTime.current) {
            setReactionData(data => ({
              ...data,
              missedTargets: data.missedTargets + 1,
              totalTargets: data.totalTargets + 1
            }));
            return null;
          }
          return prev;
        });
      }, 2000);
    };
    
    spawnTarget();
    const interval = setInterval(spawnTarget, 2500);
    
    return () => clearInterval(interval);
  }, [phase]);

  const handleReactionClick = () => {
    if (!target) return;
    
    const reactionTime = Date.now() - targetSpawnTime.current;
    reactionTimes.current.push(reactionTime);
    
    setReactionData(prev => ({
      totalClicks: prev.totalClicks + 1,
      totalTargets: prev.totalTargets + 1,
      avgReactionTime: reactionTimes.current.reduce((a, b) => a + b, 0) / reactionTimes.current.length,
      missedTargets: prev.missedTargets
    }));
    
    setTarget(null);
  };

  // Timer countdown
  useEffect(() => {
    if (phase === 'intro' || phase === 'results') return;
    
    const timer = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) {
          if (phase === 'focus') {
            setPhase('memory');
            return 60;
          } else if (phase === 'memory') {
            setPhase('reaction');
            return 60;
          } else if (phase === 'reaction') {
            setPhase('results');
            return 0;
          }
        }
        return prev - 1;
      });
    }, 1000);
    
    return () => clearInterval(timer);
  }, [phase]);

  const startAssessment = () => {
    setPhase('focus');
    setTimeLeft(60);
  };

  const calculateScore = (value: number, min: number, max: number) => {
    return Math.round(((value - min) / (max - min)) * 100);
  };

  return (
    <div className="relative h-[100dvh] w-full overflow-hidden bg-[#0a0a0a] text-white">
      {/* Intro Screen */}
      {phase === 'intro' && (
        <div className="h-full flex flex-col items-center justify-center px-6">
          <div className="max-w-2xl text-center space-y-6">
            <h1 className="text-5xl md:text-6xl font-bold tracking-tight" style={{ fontFamily: 'Orbitron, sans-serif' }}>
              MIND GYM
            </h1>
            <p className="text-xl text-white/80">Cognitive Diagnostic Assessment</p>
            
            <div className="mt-12 space-y-4 text-left bg-white/5 backdrop-blur-xl rounded-3xl p-8 border border-white/10">
              <h2 className="text-2xl font-semibold text-[#00d9ff]">3-Minute Protocol</h2>
              <div className="space-y-3 text-white/70">
                <p><strong className="text-white">Phase 1:</strong> Focus Endurance - Track a moving target</p>
                <p><strong className="text-white">Phase 2:</strong> Working Memory - Remember color sequences</p>
                <p><strong className="text-white">Phase 3:</strong> Reaction Speed - Click targets quickly</p>
              </div>
            </div>
            
            <button
              onClick={startAssessment}
              className="mt-8 px-12 py-4 bg-[#00d9ff] text-black font-bold text-lg rounded-full hover:shadow-[0_0_30px_#00d9ff] transition-all duration-300"
            >
              Begin Assessment
            </button>
          </div>
        </div>
      )}

      {/* Focus Phase */}
      {phase === 'focus' && (
        <div id="focus-area" className="h-full relative">
          <div className="absolute top-8 left-1/2 -translate-x-1/2 text-center">
            <h2 className="text-3xl font-bold text-[#00d9ff]">Phase 1: Focus Endurance</h2>
            <p className="text-white/60 mt-2">Keep your cursor on the cyan dot</p>
            <p className="text-4xl font-bold mt-4">{timeLeft}s</p>
          </div>
          
          <div
            className="absolute w-8 h-8 bg-[#00d9ff] rounded-full shadow-[0_0_30px_#00d9ff] transition-all duration-100"
            style={{
              left: `${dotPosition.x}%`,
              top: `${dotPosition.y}%`,
              transform: 'translate(-50%, -50%)'
            }}
          />
        </div>
      )}

      {/* Memory Phase */}
      {phase === 'memory' && (
        <div className="h-full flex flex-col items-center justify-center px-6">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-[#00d9ff]">Phase 2: Working Memory</h2>
            <p className="text-white/60 mt-2">
              {showingSequence ? 'Watch the sequence...' : 'Repeat the sequence'}
            </p>
            <p className="text-4xl font-bold mt-4">{timeLeft}s</p>
          </div>
          
          <div className="grid grid-cols-2 gap-6 max-w-md">
            {colorNames.map((colorName, idx) => (
              <button
                key={colorName}
                onClick={() => handleMemoryClick(colorName)}
                disabled={showingSequence}
                className="w-32 h-32 rounded-2xl transition-all duration-200 disabled:opacity-50"
                style={{
                  backgroundColor: colors[idx],
                  opacity: showingSequence && currentFlash === sequence.indexOf(colorName) && sequence[currentFlash] === colorName ? 1 : 0.3,
                  transform: userSequence.includes(colorName) ? 'scale(0.9)' : 'scale(1)'
                }}
              />
            ))}
          </div>
          
          <div className="mt-8 text-center">
            <p className="text-white/60">Sequence Length: {sequenceLength}</p>
            <p className="text-white/60">Max Achieved: {memoryData.maxSequence}</p>
          </div>
        </div>
      )}

      {/* Reaction Phase */}
      {phase === 'reaction' && (
        <div className="h-full relative">
          <div className="absolute top-8 left-1/2 -translate-x-1/2 text-center">
            <h2 className="text-3xl font-bold text-[#00d9ff]">Phase 3: Reaction Speed</h2>
            <p className="text-white/60 mt-2">Click the targets as fast as possible</p>
            <p className="text-4xl font-bold mt-4">{timeLeft}s</p>
          </div>
          
          {target && (
            <button
              onClick={handleReactionClick}
              className="absolute w-16 h-16 bg-[#00d9ff] rounded-full shadow-[0_0_40px_#00d9ff] transition-all duration-200 hover:scale-110"
              style={{
                left: `${target.x}%`,
                top: `${target.y}%`,
                transform: 'translate(-50%, -50%)'
              }}
            />
          )}
        </div>
      )}

      {/* Results Screen */}
      {phase === 'results' && (
        <div className="h-full flex flex-col items-center justify-center px-6 overflow-y-auto py-12">
          <div className="max-w-3xl w-full space-y-8">
            <h1 className="text-5xl font-bold text-center text-[#00d9ff]" style={{ fontFamily: 'Orbitron, sans-serif' }}>
              Assessment Complete
            </h1>
            
            <div className="grid md:grid-cols-3 gap-6">
              {/* Focus Score */}
              <div className="bg-white/5 backdrop-blur-xl rounded-3xl p-6 border border-white/10">
                <h3 className="text-xl font-bold text-[#00d9ff] mb-4">Focus Endurance</h3>
                <div className="text-5xl font-bold mb-4">
                  {calculateScore(focusData.totalTimeOnTarget / focusData.totalTime, 0.3, 0.9)}
                </div>
                <div className="space-y-2 text-sm text-white/60">
                  <p>Time on target: {focusData.totalTimeOnTarget.toFixed(1)}s</p>
                  <p>Avg distance: {focusData.avgDistance.toFixed(1)}px</p>
                </div>
              </div>
              
              {/* Memory Score */}
              <div className="bg-white/5 backdrop-blur-xl rounded-3xl p-6 border border-white/10">
                <h3 className="text-xl font-bold text-[#00d9ff] mb-4">Working Memory</h3>
                <div className="text-5xl font-bold mb-4">
                  {calculateScore(memoryData.maxSequence, 4, 9)}
                </div>
                <div className="space-y-2 text-sm text-white/60">
                  <p>Max sequence: {memoryData.maxSequence}</p>
                  <p>Accuracy: {memoryData.totalAttempts > 0 ? Math.round((memoryData.correctAttempts / memoryData.totalAttempts) * 100) : 0}%</p>
                </div>
              </div>
              
              {/* Reaction Score */}
              <div className="bg-white/5 backdrop-blur-xl rounded-3xl p-6 border border-white/10">
                <h3 className="text-xl font-bold text-[#00d9ff] mb-4">Reaction Speed</h3>
                <div className="text-5xl font-bold mb-4">
                  {calculateScore(2000 - reactionData.avgReactionTime, 500, 1500)}
                </div>
                <div className="space-y-2 text-sm text-white/60">
                  <p>Avg reaction: {reactionData.avgReactionTime.toFixed(0)}ms</p>
                  <p>Hit rate: {reactionData.totalTargets > 0 ? Math.round((reactionData.totalClicks / reactionData.totalTargets) * 100) : 0}%</p>
                </div>
              </div>
            </div>
            
            <div className="text-center mt-12">
              <button
                onClick={() => window.location.reload()}
                className="px-12 py-4 bg-[#00d9ff] text-black font-bold text-lg rounded-full hover:shadow-[0_0_30px_#00d9ff] transition-all duration-300"
              >
                Retake Assessment
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

