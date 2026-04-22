/**
 * Game Types for Mafia Noir
 */

export type Role = 'mafia' | 'doctor' | 'detective' | 'villager';

export interface Player {
  id: string; // Peer ID
  name: string;
  role?: Role;
  isAlive: boolean;
  isHost: boolean;
  isReady: boolean;
  isBot?: boolean;
}

export type GamePhase = 'lobby' | 'role-reveal' | 'night' | 'morning' | 'discussion' | 'voting' | 'results';

export interface ChatMessage {
  id: string;
  senderId: string;
  senderName: string;
  text: string;
  timestamp: number;
  type: 'public' | 'mafia';
}

export interface GameState {
  roomCode: string;
  phase: GamePhase;
  players: Player[];
  nightActions: {
    mafiaTarget?: string;
    doctorSave?: string;
    detectiveCheck?: string;
  };
  detectiveResult?: { id: string; role: Role };
  lastDeath?: string;
  winner?: 'mafia' | 'villagers';
  dayResults?: {
    eliminatedId?: string;
    message: string;
  };
  votes: Record<string, string>; // Voter ID -> Target ID
  messages: ChatMessage[];
  timer: number;
}

export type GameMessage = 
  | { type: 'STATE_UPDATE'; state: GameState }
  | { type: 'PLAYER_JOIN'; player: Player }
  | { type: 'PLAYER_READY'; playerId: string; ready: boolean }
  | { type: 'ACTION_VOTE'; targetId: string }
  | { type: 'ACTION_NIGHT'; targetId: string; actionType: 'kill' | 'save' | 'check' }
  | { type: 'START_GAME' }
  | { type: 'SEND_CHAT'; text: string; chatType: 'public' | 'mafia' };
