/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Users, Shield, Zap, Search, Skull, Sun, Moon, Crown, Trophy, Terminal, UserPlus, Play } from 'lucide-react';
import { gameService } from './lib/gameService';
import { soundService } from './lib/soundService';
import { GameState, Player, Role } from './types';
import { AdComponent } from './components/AdComponent';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export default function App() {
  const [screen, setScreen] = useState<'home' | 'lobby' | 'game' | 'results'>('home');
  const [name, setName] = useState('');
  const [roomCode, setRoomCode] = useState('');
  const [gameState, setGameState] = useState<GameState | null>(null);
  const [myId, setMyId] = useState<string | null>(null);
  const [isConnecting, setIsConnecting] = useState(false);

  useEffect(() => {
    gameService.subscribe((state: GameState) => {
      setGameState(state);
      setMyId(gameService.getMyId() || null);
      if (state.phase === 'results') setScreen('results');
      else if (state.phase === 'lobby' || state.phase === 'role-reveal') {
        setScreen(state.phase === 'role-reveal' ? 'game' : 'lobby');
      } else {
        setScreen('game');
      }
    });

    gameService.onNotify((msg: string) => {
      console.log('Notification:', msg);
    });
  }, []);

  const handleCreateRoom = async () => {
    if (!name) return alert('Please enter your name');
    setIsConnecting(true);
    try {
      await gameService.init(name);
    } catch (e) {
      alert('Failed to create room');
    } finally {
      setIsConnecting(false);
    }
  };

  const handleJoinRoom = async () => {
    if (!name || !roomCode) return alert('Please enter name and room code');
    setIsConnecting(true);
    try {
      await gameService.init(name, roomCode);
    } catch (e) {
      alert('Failed to join room. Ensure the Host ID is correct.');
    } finally {
      setIsConnecting(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-between p-4 md:p-8 selection:bg-red-600 selection:text-white">
      <header className="w-full max-w-5xl flex justify-between items-center py-4 mb-4">
        <div className="flex items-center gap-4">
          <div className="h-10 w-10 bg-red-600 rounded-full flex items-center justify-center shadow-[0_0_15px_rgba(220,38,38,0.5)]">
            <div className="w-4 h-4 bg-white rotate-45"></div>
          </div>
          <div>
            <h1 className="text-xl font-black tracking-tighter uppercase text-white">Mafia <span className="text-red-600">Online</span></h1>
            <p className="text-[10px] uppercase tracking-widest text-slate-500 font-bold">
              Room Code: <span className="text-red-500">{gameState?.roomCode || '---'}</span>
            </p>
          </div>
        </div>
        {gameState && (screen === 'game' || screen === 'results') && (
          <div className="flex gap-6 items-center">
            <div className="text-right hidden md:block">
              <p className="text-[10px] uppercase text-slate-500 mb-0.5 font-bold">Phase</p>
              <p className="text-sm font-bold text-red-500 uppercase tracking-widest flex items-center gap-2">
                <span className={cn("h-2 w-2 rounded-full bg-red-500", gameState.phase === 'night' && "animate-pulse")}></span> 
                {gameState.phase}
              </p>
            </div>
            <div className="h-12 w-[1px] bg-white/10 hidden md:block"></div>
            <div className="bg-white/5 border border-white/10 rounded-xl px-4 py-2 text-center min-w-[80px]">
              <p className="text-[10px] uppercase text-slate-500 font-bold">Timer</p>
              <p className="text-xl font-mono font-black text-white">
                {Math.floor((gameState.timer || 0) / 60)}:{(gameState.timer || 0) % 60 < 10 ? '0' : ''}{(gameState.timer || 0) % 60}
              </p>
            </div>
          </div>
        )}
      </header>

      <main className="flex-1 w-full max-w-5xl flex flex-col items-center justify-center py-4">
        <AnimatePresence mode="wait">
          {screen === 'home' && (
            <motion.div key="home" className="w-full">
              <HomeScreen
                name={name}
                setName={setName}
                roomCode={roomCode}
                setRoomCode={setRoomCode}
                onCreate={handleCreateRoom}
                onJoin={handleJoinRoom}
                isConnecting={isConnecting}
              />
            </motion.div>
          )}
          {screen === 'lobby' && gameState && (
            <motion.div key="lobby" className="w-full">
              <LobbyScreen state={gameState} myId={myId} />
            </motion.div>
          )}
          {screen === 'game' && gameState && (
            <motion.div key="game" className="w-full">
              <GameScreen state={gameState} myId={myId} />
            </motion.div>
          )}
          {screen === 'results' && gameState && (
            <motion.div key="results" className="w-full">
              <ResultsScreen state={gameState} onBack={() => window.location.reload()} />
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      <footer className="w-full max-w-5xl flex flex-col items-center gap-6 mt-8">
        <AdComponent />
        <div className="w-full flex justify-between items-center text-[10px] text-slate-600 uppercase font-black tracking-widest border-t border-white/5 pt-6">
          <div>Created by Zelvior</div>
          <div className="flex gap-6">
            <span className="text-slate-500">Grid Capacity: {gameState ? `${gameState.players.length}/10` : '0/10'}</span>
            <span className="text-slate-500">V0.8.2-Alpha</span>
          </div>
        </div>
      </footer>
    </div>
  );
}

function HomeScreen({ name, setName, roomCode, setRoomCode, onCreate, onJoin, isConnecting }: any) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className="w-full max-w-md text-center space-y-8"
    >
      <div className="space-y-4">
        <h2 className="text-5xl font-black tracking-tighter uppercase sm:text-7xl">
          Trust <span className="text-red-600">Nobody</span>
        </h2>
        <p className="text-slate-400">Serverless real-time Mafia for friends.</p>
      </div>

      <div className="space-y-4 bg-white/5 p-8 rounded-3xl border border-white/10 shadow-2xl backdrop-blur-sm">
        <div className="space-y-2 text-left">
          <label className="text-[10px] uppercase font-black opacity-30 tracking-[0.3em] ml-1">Operative Alias</label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Agent_X"
            className="w-full bg-black/40 border border-white/10 rounded-2xl px-4 py-3 outline-none focus:border-red-600/50 transition-colors"
          />
        </div>

        <div className="grid grid-cols-1 gap-4 pt-4">
          <button
            onClick={onCreate}
            disabled={isConnecting}
            className="mafia-btn-primary flex items-center justify-center gap-2"
          >
            {isConnecting ? <Zap className="animate-spin" size={16} /> : <Zap size={16} />}
            Deploy New Mission
          </button>

          <div className="relative py-2">
            <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-white/10"></div></div>
            <div className="relative flex justify-center text-[10px] uppercase"><span className="bg-[#0a0a0e] px-4 text-slate-600 tracking-tighter font-black">Authentication Required</span></div>
          </div>

          <div className="space-y-2 text-left">
            <input
              type="text"
              value={roomCode}
              onChange={(e) => setRoomCode(e.target.value)}
              placeholder="Signal ID"
              className="w-full bg-black/40 border border-white/10 rounded-2xl px-4 py-3 outline-none focus:border-red-600/50 transition-colors mb-2"
            />
            <button
              onClick={onJoin}
              disabled={isConnecting}
              className="mafia-btn-secondary w-full flex items-center justify-center gap-2"
            >
              <UserPlus size={16} />
              Join Grid
            </button>
          </div>
        </div>
      </div>
    </motion.div>
  );
}

function LobbyScreen({ state, myId }: { state: GameState; myId: string | null }) {
  const me = state.players.find((p) => p.id === myId);
  const isHost = me?.isHost;
  const isReady = me?.isReady;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="w-full space-y-8"
    >
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4 border-b border-white/5 pb-8 mb-8">
        <div className="space-y-1">
          <h2 className="text-4xl font-black uppercase tracking-tighter text-white">Grid <span className="text-red-600">Briefing</span></h2>
          <p className="text-slate-500 font-mono text-xs uppercase tracking-widest">{state.players.length} Active Connections</p>
        </div>
        {isHost && (
          <div className="flex gap-2 w-full md:w-auto">
            <button
              onClick={() => (gameService as any).addBot()}
              disabled={state.players.length >= 10}
              className="mafia-btn-secondary flex items-center gap-2 flex-1 md:flex-none justify-center"
            >
              <UserPlus size={16} />
              Inject AI
            </button>
            <button
              onClick={() => gameService.sendAction({ type: 'START_GAME' })}
              disabled={state.players.length < 4}
              className="mafia-btn-primary flex items-center gap-2 flex-1 md:flex-none justify-center"
            >
              <Play size={16} fill="currentColor" />
              Initialize Mission
            </button>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
        {state.players.map((player) => (
          <div key={player.id} className="bg-white/5 border border-white/5 rounded-2xl p-6 flex flex-col items-center justify-center gap-4 transition-all hover:bg-white/[0.07]">
            <div className="relative">
              <div className={cn("w-16 h-16 rounded-full bg-slate-800 flex items-center justify-center shadow-lg border-2", player.isHost ? "border-red-600 shadow-[0_0_15px_rgba(220,38,38,0.3)]" : "border-slate-700")}>
                <Users size={28} className={player.isHost ? "text-red-500" : "text-slate-500"} />
              </div>
              {player.isHost && <div className="absolute -top-1 -right-1 bg-red-600 rounded-full p-1"><Crown size={12} className="text-white" /></div>}
            </div>
            <div className="text-center">
              <p className="font-black text-sm uppercase tracking-tight text-white mb-1">{player.name} {player.id === myId && "(You)"}</p>
              <div className={cn(
                "px-2 py-0.5 rounded text-[9px] font-black uppercase tracking-widest inline-block border",
                player.isReady ? "bg-red-600 border-red-600 text-white" : "bg-slate-800 border-slate-700 text-slate-500"
              )}>
                {player.isReady ? "Encrypted" : "Syncing"}
              </div>
            </div>
          </div>
        ))}
      </div>

      {!isHost && (
        <button
          onClick={() => gameService.sendAction({ type: 'PLAYER_READY', playerId: myId!, ready: !isReady })}
          className={cn("w-full mafia-btn", isReady ? "mafia-btn-secondary" : "mafia-btn-primary")}
        >
          {isReady ? "Cancel Readiness" : "Confirm Readiness"}
        </button>
      )}

      {state.players.length < 4 && (
        <div className="bg-red-500/10 border border-red-500/20 p-4 rounded-2xl text-center">
           <p className="text-red-400 text-xs font-black uppercase tracking-widest animate-pulse">
             Operational failure: Minimum 4 agents required
           </p>
        </div>
      )}
    </motion.div>
  );
}

function GameScreen({ state, myId }: { state: GameState; myId: string | null }) {
  const me = state.players.find(p => p.id === myId);
  if (!me) return null;

  const getPhaseInfo = () => {
    switch (state.phase) {
      case 'night': return { title: "Shadow Phase", sub: "Encrypted actions allowed", icon: <Moon size={24} />, color: "text-red-500", glow: "shadow-[0_0_15px_rgba(220,38,38,0.3)]" };
      case 'morning': return { title: "Dawn Briefing", sub: "Analyzing grid casualties", icon: <Sun size={24} />, color: "text-amber-500", glow: "shadow-[0_0_15px_rgba(245,158,11,0.3)]" };
      case 'discussion': return { title: "Grid Discussion", sub: "accuse, defend, bluff", icon: <Terminal size={24} />, color: "text-blue-500", glow: "shadow-[0_0_15px_rgba(59,130,246,0.3)]" };
      case 'voting': return { title: "Trial Protocol", sub: "Cast your final judgment", icon: <Zap size={24} />, color: "text-red-600", glow: "shadow-[0_0_15px_rgba(220,38,38,0.4)]" };
      default: return { title: "Public Index", sub: "Trial proceeding in terminal", icon: <Sun size={24} />, color: "text-white", glow: "" };
    }
  };

  const phaseInfo = getPhaseInfo();

  return (
    <div className="w-full space-y-12">
      <AnimatePresence>
        {state.phase === 'role-reveal' && <RoleRevealScreen me={me} />}
      </AnimatePresence>

      <div className="flex flex-col lg:flex-row justify-between gap-12">
        <div className="flex-1 space-y-10">
          <div className="flex items-center gap-4">
            <div className={cn(
              "w-12 h-12 rounded-full flex items-center justify-center transition-all duration-1000 bg-white/5 border border-white/10",
              phaseInfo.color,
              phaseInfo.glow
            )}>
              {phaseInfo.icon}
            </div>
            <div>
              <h2 className="text-3xl font-black uppercase tracking-tighter text-white">
                {phaseInfo.title}
              </h2>
              <p className="text-slate-500 uppercase text-[9px] tracking-[0.3em] font-black">
                {phaseInfo.sub}
              </p>
            </div>
          </div>

          {(state.dayResults || state.lastDeath) && (state.phase === 'morning' || state.phase === 'discussion') && (
            <motion.div 
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-red-600/10 border border-red-600/30 p-6 rounded-2xl shadow-inner backdrop-blur-md"
            >
              <div className="flex items-center gap-3 mb-2">
                <div className="h-6 w-6 rounded-full bg-red-600 flex items-center justify-center text-[10px]">⚠️</div>
                <p className="text-xs font-black uppercase tracking-widest text-red-500">System Bulletin</p>
              </div>
              <p className="text-base font-bold text-slate-100 italic leading-relaxed">
                {state.dayResults?.message || (state.lastDeath ? `${state.lastDeath} was eliminated last night.` : "No casualties detected last night.")}
              </p>
              {state.lastDeath && <p className="text-red-500 mt-3 text-[10px] font-black uppercase tracking-[0.2em]">Agent Offline: {state.lastDeath}</p>}
            </motion.div>
          )}

          <div className="space-y-4">
             <div className="flex justify-between items-center px-2">
                <h3 className="text-[10px] uppercase tracking-[0.4em] text-slate-500 font-extrabold">Active Grid</h3>
                <div className="flex items-center gap-3">
                  <span className="h-1.5 w-1.5 rounded-full bg-green-500 animate-pulse"></span>
                  <span className="text-[9px] font-black font-mono text-slate-400 uppercase tracking-widest">Live Signals: {state.players.filter(p => p.isAlive).length}</span>
                </div>
             </div>
             <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
               {state.players.map(player => (
                 <div key={player.id}>
                   <PlayerCard 
                     player={player} 
                     state={state} 
                     myId={myId!} 
                     onAction={(pId) => {
                       if (state.phase === 'night') {
                         const actionType = me.role === 'mafia' ? 'kill' : me.role === 'doctor' ? 'save' : 'check';
                         gameService.sendAction({ type: 'ACTION_NIGHT', targetId: pId, actionType: actionType as any });
                       } else if (state.phase === 'voting') {
                         gameService.sendAction({ type: 'ACTION_VOTE', targetId: pId });
                       }
                     }}
                   />
                 </div>
               ))}
             </div>
          </div>
        </div>

        <div className="lg:w-72 space-y-4">
          <div className="bg-white/5 border border-white/10 p-8 flex flex-col items-center text-center rounded-3xl relative overflow-hidden group">
            <div className="absolute inset-0 bg-red-600/5 opacity-0 group-hover:opacity-100 transition-opacity"></div>
            <div className="p-4 h-24 w-24 rounded-full border-2 border-red-600/50 bg-slate-900 flex items-center justify-center mb-6 shadow-xl">
              <RoleIcon role={me.role!} size={48} className="text-red-500" />
            </div>
            <span className="text-[9px] uppercase font-black text-slate-500 tracking-[0.4em] mb-1">Identity</span>
            <span className="text-2xl font-black uppercase tracking-tighter text-white mb-6">{me.role}</span>
            <div className={cn(
              "px-4 py-1 rounded-lg text-[9px] tracking-[0.2em] font-black uppercase border",
              me.isAlive ? "border-green-600/40 text-green-500 bg-green-600/5" : "border-red-600/40 text-red-500 bg-red-600/5"
            )}>
              {me.isAlive ? "Connected" : "Lost Signal"}
            </div>
          </div>

          <div className="bg-black/60 border border-white/5 p-6 space-y-6 rounded-3xl shadow-inner">
            <div className="flex justify-between items-center pb-4 border-b border-white/5">
              <h3 className="text-[9px] uppercase font-black text-slate-500 flex items-center gap-2 tracking-[0.2em]">
                <Terminal size={12} /> Feed Log
              </h3>
              <div className="h-1.5 w-1.5 rounded-full bg-slate-700"></div>
            </div>
            <div className="space-y-4 max-h-[150px] overflow-y-auto text-[10px] font-mono text-slate-500 leading-relaxed scrollbar-hide">
              {state.lastDeath && <p className="animate-fade-in"><span className="text-red-600 font-bold">[!] ERROR:</span> Connection with <span className="text-slate-300">{state.lastDeath}</span> severed by external force.</p>}
              {state.dayResults && <p className="animate-fade-in"><span className="text-red-500 font-bold">[i] LOG:</span> {state.dayResults.message}</p>}
              <p className="opacity-40 italic">-- Standby for updates --</p>
            </div>
          </div>

          <ChatBox state={state} myId={myId!} />
        </div>
      </div>
    </div>
  );
}

function RoleRevealScreen({ me }: { me: Player }) {
  useEffect(() => {
    soundService.playRoleReveal();
  }, []);

  const getRoleTheme = (role: Role) => {
    switch (role) {
      case 'mafia': return { color: 'text-red-600', glow: 'shadow-[0_0_50px_rgba(220,38,38,0.5)]', bg: 'bg-red-950/20' };
      case 'doctor': return { color: 'text-emerald-500', glow: 'shadow-[0_0_50px_rgba(16,185,129,0.5)]', bg: 'bg-emerald-950/20' };
      case 'detective': return { color: 'text-blue-500', glow: 'shadow-[0_0_50px_rgba(59,130,246,0.5)]', bg: 'bg-blue-950/20' };
      default: return { color: 'text-slate-400', glow: 'shadow-[0_0_50px_rgba(148,163,184,0.3)]', bg: 'bg-slate-900/40' };
    }
  };

  const theme = getRoleTheme(me.role!);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 bg-[#050505] flex flex-col items-center justify-center p-8 text-center"
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        className={cn("w-full max-w-2xl mx-auto rounded-[3.5rem] p-[2px] border-2 border-white/5", theme.glow)}
      >
        <div className={cn("rounded-[3.4rem] p-12 flex flex-col items-center text-center gap-8 relative overflow-hidden", theme.bg)}>
          <motion.div 
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.2 }}
            className="relative z-10"
          >
            <div className={cn("w-32 h-32 rounded-full flex items-center justify-center border-4 mb-6 mx-auto bg-black shadow-2xl relative", theme.color.replace('text-', 'border-'))}>
              <RoleIcon role={me.role!} size={64} className={theme.color} />
              {me.role === 'mafia' && (
                <motion.div 
                  animate={{ scale: [1, 1.2, 1], opacity: [0.2, 0.4, 0.2] }} 
                  transition={{ duration: 4, repeat: Infinity }}
                  className="absolute inset-0 bg-red-600 blur-2xl rounded-full -z-10"
                />
              )}
              {me.role === 'doctor' && (
                <motion.div 
                  animate={{ scale: [1, 1.1, 1] }} 
                  transition={{ duration: 2, repeat: Infinity }}
                  className="absolute inset-[-4px] border-2 border-emerald-500 rounded-full opacity-50"
                />
              )}
              {me.role === 'detective' && (
                <motion.div 
                  animate={{ top: ["0%", "100%", "0%"] }} 
                  transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
                  className="absolute left-0 right-0 h-0.5 bg-blue-500/50 shadow-[0_0_10px_rgba(59,130,246,0.5)] z-20"
                />
              )}
            </div>
            <h3 className="text-[10px] uppercase font-black tracking-[0.4em] text-slate-500 mb-2">Designation Resolved</h3>
            <h2 className={cn("text-7xl font-black uppercase tracking-tighter italic", theme.color)}>
              {me.role}
            </h2>
          </motion.div>
          
          <motion.p 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.5 }}
            className="text-slate-400 text-lg max-w-md leading-relaxed z-10 font-medium"
          >
            {getRoleDescription(me.role!)}
          </motion.p>

          <div className="w-48 h-1.5 bg-white/5 mx-auto mt-8 overflow-hidden rounded-full border border-white/5 z-10">
            <motion.div 
              initial={{ width: 0 }} 
              animate={{ width: "100%" }} 
              transition={{ duration: 5, ease: "linear" }}
              className={cn("h-full", theme.color.replace('text-', 'bg-'))} 
            />
          </div>

          <div className="absolute top-0 left-0 w-full h-full opacity-10 pointer-events-none">
             <div className={cn("absolute top-[-50%] left-[-50%] w-[200%] h-[200%] animate-pulse", theme.bg)}></div>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
}

function ResultsScreen({ state, onBack }: { state: GameState; onBack: () => void }) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      className="text-center space-y-16 py-12"
    >
      <div className="relative inline-block">
        <Trophy className="mx-auto text-red-600 shadow-2xl" size={100} />
        <motion.div 
          animate={{ scale: [1, 1.3, 1], opacity: [0.1, 0.4, 0.1] }} 
          transition={{ duration: 3, repeat: Infinity }}
          className="absolute inset-0 bg-red-600 blur-[80px] opacity-20 -z-10 rounded-full" 
        />
      </div>

      <div className="space-y-4">
        <h2 className="text-8xl font-black uppercase tracking-tighter sm:text-9xl text-white">Grid Cleaned</h2>
        <p className={cn(
          "text-3xl font-black uppercase tracking-[0.4em]",
          state.winner === 'mafia' ? "text-red-600" : "text-slate-100"
        )}>
          {state.winner === 'mafia' ? "Mafia Mastered" : "Citizens Preserved"}
        </p>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-5 gap-4 w-full">
        {state.players.map(p => (
           <div key={p.id} className="flex flex-col items-center bg-white/5 p-6 rounded-[2rem] border border-white/5 group transition-all hover:bg-white/10">
             <span className="text-[9px] uppercase font-black text-slate-500 mb-3 tracking-widest">{p.name}</span>
             <div className={cn("h-12 w-12 rounded-full flex items-center justify-center border-2 mb-3", p.role === 'mafia' ? "border-red-600 bg-red-600/10" : "border-slate-700 bg-slate-800")}>
               <RoleIcon role={p.role!} size={18} className={p.role === 'mafia' ? "text-red-500" : "text-white/40"} />
             </div>
             <span className="font-black text-[9px] uppercase tracking-[0.2em] text-white/80">{p.role}</span>
           </div>
        ))}
      </div>

      <button onClick={onBack} className="mafia-btn-primary px-16 py-4">
        Reset Simulation
      </button>
    </motion.div>
  );
}

function PlayerCard({ player, state, myId, onAction }: { player: Player; state: GameState; myId: string; onAction: (id: string) => void }) {
  const me = state.players.find(p => p.id === myId);
  const isMe = player.id === myId;
  const isDead = !player.isAlive;
  const gamePhase = state.phase;
  const myRole = me?.role;

  const canAction = me?.isAlive && !isDead && !isMe;
  const isVoted = gamePhase === 'voting' && state.votes[myId] === player.id;
  
  const voteCount = Object.values(state.votes).filter(v => v === player.id).length;
  const totalVotes = Object.values(state.votes).length;
  let hasMajority = false;
  if (totalVotes > 0) {
    const voteEntries = Object.values(state.votes).reduce((acc, id) => {
      acc[id] = (acc[id] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
    const sorted = Object.entries(voteEntries).sort((a,b) => b[1] - a[1]);
    hasMajority = voteCount > 0 && voteCount === sorted[0][1];
  }

  // Checking if I, as a specific role, targeted this player
  const myNightAction = (myRole === 'mafia' && state.nightActions.mafiaTarget === player.id) || 
                       (myRole === 'doctor' && state.nightActions.doctorSave === player.id) || 
                       (myRole === 'detective' && state.nightActions.detectiveCheck === player.id);

  const isTargeted = isVoted || (gamePhase === 'night' && myNightAction);
  const showRole = isMe || isDead || (myRole === 'mafia' && player.role === 'mafia');

  return (
    <motion.div 
      initial={false}
      animate={{ 
        scale: isDead ? 0.95 : (hasMajority && gamePhase === 'voting' ? [1, 1.02, 1] : 1), 
        opacity: isDead ? 0.3 : 1 
      }}
      transition={hasMajority && gamePhase === 'voting' ? { repeat: Infinity, duration: 1.5 } : {}}
      className={cn(
        "relative bg-white/5 border rounded-2xl p-4 flex flex-col items-center justify-center gap-2 transition-all group overflow-hidden",
        isDead ? "opacity-30 border-white/5" : "border-white/5 hover:border-white/20",
        isTargeted ? (gamePhase === 'night' ? "border-red-500/40" : "border-red-600 ring-1 ring-red-600 bg-red-900/10") : "",
        hasMajority && gamePhase === 'voting' && "border-red-600 shadow-[0_0_15px_rgba(220,38,38,0.3)]"
      )}
    >
      {gamePhase === 'voting' && voteCount > 0 && (
         <div className="absolute top-2 left-2 flex items-center gap-1 bg-red-600 text-white px-1.5 py-0.5 rounded-full text-[7px] font-black animate-in fade-in zoom-in duration-300">
           <Zap size={8} /> {voteCount}
         </div>
      )}

      {isTargeted && gamePhase === 'night' && (
        <div className="absolute top-2 right-2 animate-pulse">
           <span className="text-red-500 text-xs">🎯</span>
        </div>
      )}
      
      {isDead && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-10">
          <div className="h-[2px] w-12 bg-red-600 rotate-45 shadow-[0_0_10px_rgba(220,38,38,0.5)]"></div>
        </div>
      )}

      <div className={cn(
        "w-14 h-14 rounded-full bg-slate-800 flex items-center justify-center border-2 transition-colors",
        isMe && player.role === 'mafia' ? "border-red-600 shadow-[0_0_20px_rgba(220,38,38,0.3)]" : "border-slate-700",
        isTargeted && "border-red-500"
      )}>
        {isDead ? (
           <span className="text-xl grayscale opacity-20 italic">OFF</span>
        ) : (
           <RoleIcon role={showRole ? player.role! : 'villager' as Role} size={24} className={player.role === 'mafia' && showRole ? "text-red-500" : "text-slate-500"} />
        )}
      </div>

      <div className="text-center">
        <p className={cn("font-bold text-[11px] uppercase tracking-tight truncate max-w-full", isMe ? "text-white" : "text-slate-400")}>
          {player.name}
        </p>
        <div className={cn(
          "px-1.5 py-0.5 rounded text-[8px] font-black uppercase mt-1 tracking-widest border",
          isDead ? "bg-red-900/40 border-red-900/40 text-red-500" : 
          (showRole ? (player.role === 'mafia' ? "bg-red-600 border-red-600 text-white" : "bg-slate-700 border-slate-600 text-slate-100") : 
          (player.isBot ? "bg-slate-800 border-slate-700 text-slate-400" : "bg-slate-800 border-slate-700 text-slate-500"))
        )}>
          {isDead ? "Eliminated" : (showRole ? player.role : (player.isBot ? "AI Agent" : "Unknown"))}
        </div>
      </div>

      {canAction && (
        <button
          onClick={(e) => {
            e.stopPropagation();
            onAction(player.id);
            soundService.playActionSuccess();
          }}
          className={cn(
            "mt-3 w-full py-1 text-[8px] font-black uppercase tracking-widest rounded transition-all",
            isTargeted ? "bg-red-600 text-white glow-red" : "bg-white/5 text-slate-500 border border-white/5 hover:bg-white/10"
          )}
        >
          {gamePhase === 'night' ? (myRole === 'mafia' ? "Mark" : "Protect") : (gamePhase === 'voting' ? "Expose" : "")}
        </button>
      )}
    </motion.div>
  );
}

function ChatBox({ state, myId }: { state: GameState; myId: string }) {
  const [text, setText] = useState('');
  const [chatType, setChatType] = useState<'public' | 'mafia'>('public');
  const me = state.players.find(p => p.id === myId);
  const isMafia = me?.role === 'mafia';
  const chatRef = React.useRef<HTMLDivElement>(null);

  const isNight = state.phase === 'night';
  const showMafiaTab = isMafia && isNight;

  useEffect(() => {
    if (!showMafiaTab && chatType === 'mafia') {
      setChatType('public');
    }
  }, [showMafiaTab]);

  useEffect(() => {
    if (chatRef.current) {
      chatRef.current.scrollTop = chatRef.current.scrollHeight;
    }
  }, [state.messages]);

  const handleSend = (e: React.FormEvent) => {
    e.preventDefault();
    if (!text.trim()) return;
    gameService.sendAction({ type: 'SEND_CHAT', text: text.trim(), chatType });
    setText('');
  };

  const filteredMessages = state.messages.filter(m => {
    if (m.type === 'public') return true;
    if (m.type === 'mafia' && isMafia) return true;
    return false;
  });

  return (
    <div className="bg-black/40 border border-white/5 rounded-3xl overflow-hidden flex flex-col h-[400px]">
      <div className="flex items-center justify-between px-4 py-3 border-b border-white/5 bg-white/5">
        <h3 className="text-[10px] uppercase font-black text-slate-500 tracking-widest">Secure Comms</h3>
        {showMafiaTab && (
          <div className="flex bg-black/40 p-0.5 rounded-lg border border-white/5">
            <button 
              onClick={() => setChatType('public')}
              className={cn("px-3 py-1 rounded-md text-[8px] font-black uppercase transition-all", chatType === 'public' ? "bg-white/10 text-white" : "text-slate-600")}
            >
              Public
            </button>
            <button 
              onClick={() => setChatType('mafia')}
              className={cn("px-3 py-1 rounded-md text-[8px] font-black uppercase transition-all", chatType === 'mafia' ? "bg-red-600 text-white" : "text-slate-600")}
            >
              Mafia
            </button>
          </div>
        )}
      </div>

      <div ref={chatRef} className="flex-1 overflow-y-auto p-4 space-y-3 scrollbar-hide">
        {filteredMessages.map(msg => (
          <div key={msg.id} className={cn("flex flex-col gap-1", msg.senderId === myId ? "items-end" : "items-start")}>
            <div className="flex items-center gap-2 px-1">
               <span className="text-[8px] font-black uppercase text-slate-500">{msg.senderName}</span>
               {msg.type === 'mafia' && <span className="text-[7px] text-red-600 font-bold uppercase border border-red-900/30 px-1 rounded-sm">FAMILY</span>}
            </div>
            <div className={cn(
              "px-3 py-2 rounded-2xl text-[11px] max-w-[85%] break-words",
              msg.senderId === myId 
                ? (msg.type === 'mafia' ? "bg-red-600 text-white rounded-tr-none" : "bg-white/10 text-white rounded-tr-none")
                : "bg-white/5 text-slate-300 rounded-tl-none border border-white/5"
            )}>
              {msg.text}
            </div>
          </div>
        ))}
        {filteredMessages.length === 0 && (
          <div className="h-full flex items-center justify-center">
            <p className="text-[9px] uppercase tracking-widest text-slate-600 font-bold opacity-30 text-center px-8 italic">No signals intercepted yet.</p>
          </div>
        )}
      </div>

      <form onSubmit={handleSend} className="p-3 bg-white/5 border-t border-white/5">
        <input
          type="text"
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder={chatType === 'mafia' ? "Whisper to family..." : "Transmit to grid..."}
          className={cn(
            "w-full bg-black/40 border rounded-xl px-4 py-2 text-xs outline-none transition-all placeholder:text-slate-700",
            chatType === 'mafia' ? "border-red-900/30 focus:border-red-600/50" : "border-white/5 focus:border-white/20"
          )}
        />
      </form>
    </div>
  );
}

function RoleIcon({ role, ...props }: { role: Role } & any) {
  switch (role) {
    case 'mafia': return <Skull {...props} />;
    case 'doctor': return <Shield {...props} />;
    case 'detective': return <Search {...props} />;
    default: return <Users {...props} />;
  }
}

function getRoleDescription(role: Role) {
  switch (role) {
    case 'mafia': return "Silence the city. The Family must grow until we are the majority. Choose your targets wisely in the dark.";
    case 'doctor': return "Preserve life. Each night, selecting one operative to protect from termination.";
    case 'detective': return "Infiltrate. Each night, scanning one operative to identify if they belong to The Family.";
    case 'villager': return "Survival through suspicion. Your vote is your only weapon against the intruders.";
    default: return "Survival is mandatory.";
  }
}
