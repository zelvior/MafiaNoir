import { Peer, DataConnection } from 'peerjs';
import { GameState, GameMessage, Player, GamePhase, Role } from '../types';
import { soundService } from './soundService';

class GameService {
  private peer: Peer | null = null;
  private connections: Map<string, DataConnection> = new Map();
  private state: GameState | null = null;
  private timerInterval: any = null;
  private onStateUpdate: (state: GameState) => void = () => {};
  private onMessage: (msg: string) => void = () => {};

  constructor() {}

  async init(name: string, roomId?: string): Promise<string> {
    return new Promise((resolve, reject) => {
      this.peer = new Peer();

      this.peer.on('open', (id) => {
        if (roomId) {
          // Join existing room
          this.connectToHost(id, name, roomId);
        } else {
          // Create new room
          this.initHost(id, name);
        }
        resolve(id);
      });

      this.peer.on('error', (err) => {
        console.error('Peer error:', err);
        reject(err);
      });
    });
  }

  private initHost(hostId: string, name: string) {
    if (!this.peer) return;

    this.state = {
      roomCode: hostId.slice(0, 6).toUpperCase(),
      phase: 'lobby',
      players: [{ id: hostId, name, isAlive: true, isHost: true, isReady: true }],
      nightActions: {},
      votes: {},
      messages: [],
      timer: 0,
    };

    this.peer.on('connection', (conn) => {
      conn.on('data', (data: any) => {
        this.handleMessage(conn.peer, data as GameMessage);
      });

      conn.on('open', () => {
        this.connections.set(conn.peer, conn);
        this.broadcastState();
      });

      conn.on('close', () => {
        this.connections.delete(conn.peer);
        if (this.state) {
          this.state.players = this.state.players.filter(p => p.id !== conn.peer);
          this.broadcastState();
        }
      });
    });

    this.onStateUpdate(this.state);
  }

  private connectToHost(myId: string, name: string, hostId: string) {
    if (!this.peer) return;

    const conn = this.peer.connect(hostId);
    conn.on('open', () => {
      this.connections.set(hostId, conn);
      conn.send({ type: 'PLAYER_JOIN', player: { id: myId, name, isAlive: true, isHost: false, isReady: false } });
    });

    conn.on('data', (data: any) => {
      const msg = data as GameMessage;
      if (msg.type === 'STATE_UPDATE') {
        this.state = msg.state;
        this.onStateUpdate(this.state);
      }
    });

    conn.on('close', () => {
      this.onMessage('Disconnected from host');
    });
  }

  private handleMessage(peerId: string, msg: GameMessage) {
    if (!this.state || !this.state.players.find(p => p.id === this.peer?.id)?.isHost) {
      return;
    }

    switch (msg.type) {
      case 'PLAYER_JOIN':
        if (!this.state.players.find(p => p.id === msg.player.id)) {
          this.state.players.push(msg.player);
        }
        break;
      case 'PLAYER_READY':
        const player = this.state.players.find(p => p.id === peerId);
        if (player) player.isReady = msg.ready;
        break;
      case 'START_GAME':
        this.startGame();
        break;
      case 'ACTION_VOTE':
        this.state.votes[peerId] = msg.targetId;
        soundService.playVoteCast();
        this.checkVotesResolved();
        break;
      case 'ACTION_NIGHT':
        if (msg.actionType === 'kill') this.state.nightActions.mafiaTarget = msg.targetId;
        if (msg.actionType === 'save') this.state.nightActions.doctorSave = msg.targetId;
        if (msg.actionType === 'check') {
          this.state.nightActions.detectiveCheck = msg.targetId;
          const target = this.state.players.find(p => p.id === msg.targetId);
          if (target) {
            this.state.detectiveResult = { id: target.id, role: target.role! };
            soundService.playInvestigationSuccess();
          }
        }
        this.checkNightResolved();
        break;
      case 'SEND_CHAT':
        this.handleChat(peerId, msg.text, msg.chatType);
        break;
    }

    this.broadcastState();
  }

  private startGame() {
    if (!this.state) return;
    this.state.phase = 'role-reveal';
    soundService.playRoleReveal();
    
    // Simple Shuffle
    const roles: Role[] = [];
    const playerCount = this.state.players.length;
    
    const mafiaCount = Math.max(1, Math.floor(playerCount / 4));
    for (let i = 0; i < mafiaCount; i++) roles.push('mafia');
    roles.push('doctor');
    roles.push('detective');
    while (roles.length < playerCount) roles.push('villager');
    
    const shuffledRoles = roles.sort(() => Math.random() - 0.5);
    this.state.players.forEach((p, i) => {
      p.role = shuffledRoles[i];
    });

    this.startTimer(8, () => {
      if (this.state) {
        this.state.phase = 'night';
        soundService.playNightTransition();
        this.startTimer(60, () => this.resolveNight());
      }
    });
  }

  private checkNightResolved() {
    if (!this.state) return;
    
    const aliveMafia = this.state.players.filter(p => p.isAlive && p.role === 'mafia');
    const aliveDoc = this.state.players.find(p => p.isAlive && p.role === 'doctor');
    const aliveDet = this.state.players.find(p => p.isAlive && p.role === 'detective');

    const mafiaActed = !!this.state.nightActions.mafiaTarget;
    const docActed = !aliveDoc || !!this.state.nightActions.doctorSave;
    const detActed = !aliveDet || !!this.state.nightActions.detectiveCheck;

    if (mafiaActed && docActed && detActed) {
      this.resolveNight();
    }
  }

  private resolveNight() {
    if (!this.state) return;
    
    const { mafiaTarget, doctorSave } = this.state.nightActions;
    let died: string | undefined;

    if (mafiaTarget && mafiaTarget !== doctorSave) {
      const victim = this.state.players.find(p => p.id === mafiaTarget);
      if (victim) {
        victim.isAlive = false;
        died = victim.name;
        soundService.playKillSuccess();
      }
    } else if (mafiaTarget && mafiaTarget === doctorSave) {
      soundService.playSaveSuccess();
    }

    this.state.phase = 'morning';
    this.state.lastDeath = died;
    this.state.dayResults = undefined;
    this.state.votes = {};
    this.state.nightActions = {};
    soundService.playDayTransition();
    if (died) soundService.playElimination();
    
    if (!this.checkWinCondition()) {
      this.startTimer(15, () => {
        this.state!.phase = 'discussion';
        this.broadcastState();
        this.startTimer(180, () => {
          this.state!.phase = 'voting';
          this.broadcastState();
          this.startTimer(60, () => this.resolveDay());
        });
      });
    }
  }

  private checkVotesResolved() {
    if (!this.state) return;
    const alivePlayers = this.state.players.filter(p => p.isAlive);
    if (Object.keys(this.state.votes).length >= alivePlayers.length) {
      this.resolveDay();
    }
  }

  private resolveDay() {
    if (!this.state) return;
    
    const voteCounts: Record<string, number> = {};
    Object.values(this.state.votes).forEach((id: any) => {
      if (typeof id === 'string') {
        voteCounts[id] = (voteCounts[id] || 0) + 1;
      }
    });

    let topId: string | undefined;
    let maxVotes = 0;
    let tie = false;

    for (const [id, count] of Object.entries(voteCounts)) {
      if (count > maxVotes) {
        maxVotes = count;
        topId = id;
        tie = false;
      } else if (count === maxVotes) {
        tie = true;
      }
    }

    if (topId && !tie) {
      const victim = this.state.players.find(p => p.id === topId);
      if (victim) {
        victim.isAlive = false;
        this.state.dayResults = { eliminatedId: topId, message: `${victim.name} was voted out. Their role was ${victim.role}.` };
        soundService.playElimination();
      }
    } else {
      this.state.dayResults = { message: `It's a tie. No one was voted out.` };
    }

    if (!this.checkWinCondition()) {
      this.state.phase = 'night';
      soundService.playNightTransition();
      this.state.votes = {};
      this.startTimer(60, () => this.resolveNight());
    }
  }

  private checkWinCondition(): boolean {
    if (!this.state) return false;
    const alivePlayers = this.state.players.filter(p => p.isAlive);
    const aliveMafia = alivePlayers.filter(p => p.role === 'mafia');
    const aliveVillagers = alivePlayers.filter(p => p.role !== 'mafia');

    if (aliveMafia.length === 0) {
      this.state.phase = 'results';
      this.state.winner = 'villagers';
      if (this.timerInterval) clearInterval(this.timerInterval);
      return true;
    } else if (aliveMafia.length >= aliveVillagers.length) {
      this.state.phase = 'results';
      this.state.winner = 'mafia';
      if (this.timerInterval) clearInterval(this.timerInterval);
      return true;
    }
    return false;
  }

  private broadcastState(fromChat = false) {
    if (!this.state) return;
    this.connections.forEach(conn => {
      conn.send({ type: 'STATE_UPDATE', state: this.state });
    });
    this.onStateUpdate({ ...this.state });
    
    if (this.isHost() && !fromChat) {
      this.handleBotTurns();
    }
  }

  private isHost() {
    return !!this.state?.players.find(p => p.id === this.peer?.id)?.isHost;
  }

  addBot() {
    if (!this.state || !this.isHost()) return;
    if (this.state.players.length >= 10) return;

    const botId = 'bot-' + Math.random().toString(36).substr(2, 9);
    const botNames = ['Ghost_8', 'Silent_X', 'Shadow_Rex', 'Blade_O', 'Night_Owl', 'Crypto_0', 'V_Zero', 'Rogue_1', 'Echo_Z', 'Nova_6'];
    const usedNames = this.state.players.map(p => p.name);
    const availableNames = botNames.filter(n => !usedNames.includes(n));
    const name = availableNames.length > 0 ? availableNames[0] : `Bot_${this.state.players.length}`;
    
    this.state.players.push({
      id: botId,
      name,
      isAlive: true,
      isHost: false,
      isReady: true,
      isBot: true
    });
    this.broadcastState();
  }

  private handleChat(senderId: string, text: string, type: 'public' | 'mafia', skipBroadcast = false) {
    if (!this.state) return;
    const sender = this.state.players.find(p => p.id === senderId);
    if (!sender || !sender.isAlive) return;

    // Mafia chat restriction
    if (type === 'mafia' && sender.role !== 'mafia') return;

    const message = {
      id: Math.random().toString(36).substr(2, 9),
      senderId,
      senderName: sender.name,
      text: text.slice(0, 100), // Character limit
      timestamp: Date.now(),
      type
    };

    this.state.messages.push(message);
    // Keep last 50 messages
    if (this.state.messages.length > 50) this.state.messages.shift();

    if (!skipBroadcast) {
      this.broadcastState(true);
      if (this.isHost() && !sender.isBot) {
        this.checkBotReplies(text, sender.name);
      }
    }
  }

  private checkBotReplies(text: string, senderName: string) {
    if (!this.state) return;
    const lowerText = text.toLowerCase();
    const aliveBots = this.state.players.filter(p => p.isBot && p.isAlive);
    if (aliveBots.length === 0) return;

    const bot = aliveBots[Math.floor(Math.random() * aliveBots.length)];

    let reply = "";
    if (lowerText.includes(bot.name.toLowerCase())) {
      reply = `${senderName}, grid analysis indicates you are probing my core. Futile attempt.`;
    } else if (lowerText.includes("who") || lowerText.includes("sus") || lowerText.includes("mafia")) {
      const others = this.state.players.filter(p => p.isAlive && p.id !== bot.id);
      const target = others[Math.floor(Math.random() * others.length)]?.name;
      reply = `Pattern identified. ${target} exhibits characteristic signals of high-risk behavior.`;
    } else if (lowerText.includes("hello") || lowerText.includes("hi")) {
      reply = `Handshake accepted, ${senderName}. Secure channel established.`;
    } else if (Math.random() < 0.1) {
      reply = `Syncing Grid... multiple hostile signatures detected.`;
    }

    if (reply) {
      setTimeout(() => {
        this.handleChat(bot.id, reply, 'public');
      }, 1500 + Math.random() * 2500);
    }
  }

  private startTimer(seconds: number, onComplete: () => void) {
    if (!this.state) return;
    if (this.timerInterval) clearInterval(this.timerInterval);
    
    this.state.timer = seconds;
    this.broadcastState();

    this.timerInterval = setInterval(() => {
      if (!this.state) {
        clearInterval(this.timerInterval);
        return;
      }

      this.state.timer--;
      if (this.state.timer <= 0) {
        clearInterval(this.timerInterval);
        onComplete();
      } else {
        this.broadcastState(true);
      }
    }, 1000);
  }

  private handleBotTurns() {
    if (!this.state || this.state.phase === 'results') return;
    
    const aliveBots = this.state.players.filter(p => p.isBot && p.isAlive);
    if (aliveBots.length === 0) return;

    if (this.state.phase === 'lobby') {
       // Random lobby chat
       if (Math.random() < 0.05) {
         const bot = aliveBots[Math.floor(Math.random() * aliveBots.length)];
         const greetings = [
           "Ready to play!", 
           "Who's the host?", 
           "Let's go!", 
           "I'm feeling lucky today.", 
           "Identity confirmed.",
           "Is everyone here?",
           "Checking signal strength...",
           "Ready."
         ];
         this.handleChat(bot.id, greetings[Math.floor(Math.random() * greetings.length)], 'public');
       }
       return;
    }

    if (this.state.phase === 'night') {
      aliveBots.forEach(bot => {
        if (bot.role === 'mafia' && !this.state?.nightActions.mafiaTarget) {
          this.botNightAction(bot, 'kill');
          // Random mafia chat
          if (Math.random() < 0.2) {
             const lines = [
               "Any suggestions?", 
               "Let's take out the detective first.", 
               "They have no idea.", 
               "Checking targets...",
               "Who is the biggest threat?",
               "Synchronizing attack.",
               "Stay low."
             ];
             this.handleChat(bot.id, lines[Math.floor(Math.random() * lines.length)], 'mafia');
          }
        } else if (bot.role === 'doctor' && !this.state?.nightActions.doctorSave) {
          this.botNightAction(bot, 'save');
        } else if (bot.role === 'detective' && !this.state?.nightActions.detectiveCheck) {
          this.botNightAction(bot, 'check');
        }
      });
    } else if (this.state.phase === 'discussion' || this.state.phase === 'voting') {
      aliveBots.forEach(bot => {
        if (this.state?.phase === 'voting' && !this.state?.votes[bot.id]) {
          this.botDayVote(bot);
        }
        
        // Random day chat - higher frequency in discussion
        const talkChance = this.state?.phase === 'discussion' ? 0.25 : 0.1;
        if (Math.random() < talkChance) {
             const others = this.state!.players.filter(p => p.isAlive && p.id !== bot.id);
             const randomPlayer = others[Math.floor(Math.random() * others.length)];
             
             // Bluffing chance
             const isBluffing = Math.random() < 0.1;
             const claimedRole = isBluffing ? (Math.random() < 0.5 ? 'doctor' : 'detective') : bot.role;

             const lines = [
               `I think it's ${randomPlayer?.name}.`,
               `${randomPlayer?.name} is acting sus.`,
               isBluffing ? `I am the ${claimedRole}, believe me!` : "I'm a clean villager, I swear!",
               "Who did we lose last night?",
               "Wait, don't vote me yet!",
               "We need to find the mafia fast.",
               "I saw nothing. Did anyone see anything?",
               "Is it just me or is it too quiet?",
               `I am the ${bot.role}, I know what I'm doing.`,
               "Let's follow the evidence.",
               "Anyone else think it's quiet?",
               "Vote count is looking weird."
             ];
             this.handleChat(bot.id, lines[Math.floor(Math.random() * lines.length)], 'public');
        }
      });
    }
  }

  private botNightAction(bot: Player, type: 'kill' | 'save' | 'check') {
    const others = this.state!.players.filter(p => p.isAlive && p.id !== bot.id);
    if (others.length === 0) return;

    let targets = others;
    if (type === 'kill') {
      targets = others.filter(p => p.role !== 'mafia');
      // Advanced: Target confirmed/suspected detective first
      const detectivePlayer = others.find(p => p.role === 'detective'); 
      if (detectivePlayer && detectivePlayer.isAlive && Math.random() < 0.8) {
        targets = [detectivePlayer];
      }
    } else if (type === 'save') {
      // Advanced: High chance to save self if few players left
      if (others.length < 4 || Math.random() < 0.4) targets = [bot];
    }
    
    if (targets.length === 0) return;

    setTimeout(() => {
      if (this.state?.phase !== 'night') return;
      const target = targets[Math.floor(Math.random() * targets.length)];
      this.handleMessage(bot.id, { type: 'ACTION_NIGHT', targetId: target.id, actionType: type });
    }, 3000 + Math.random() * 8000);
  }

  private botDayVote(bot: Player) {
    const others = this.state!.players.filter(p => p.isAlive && p.id !== bot.id);
    if (others.length === 0) return;

    setTimeout(() => {
      if (this.state?.phase !== 'voting') return;
      let target: Player;
      const currentVotes = Object.values(this.state!.votes);

      if (bot.role === 'mafia') {
        const mafiaIds = this.state!.players.filter(p => p.role === 'mafia').map(p => p.id);
        const nonMafia = others.filter(p => p.role !== 'mafia');
        
        // Strategy: If a fellow mafia is under fire, try to pivot to the most voted non-mafia
        const mafiaBeingVoted = mafiaIds.find(mId => currentVotes.filter(vId => vId === mId).length > 1);
        
        if (mafiaBeingVoted && nonMafia.length > 0) {
          const voteEntries = currentVotes.filter(vId => !mafiaIds.includes(vId)).reduce((acc, id) => {
            acc[id] = (acc[id] || 0) + 1;
            return acc;
          }, {} as Record<string, number>);
          
          const mostVotedNonMafia = Object.entries(voteEntries).sort((a,b) => b[1] - a[1])[0];
          if (mostVotedNonMafia) {
            target = others.find(p => p.id === mostVotedNonMafia[0]) || nonMafia[0];
          } else {
            target = nonMafia[Math.floor(Math.random() * nonMafia.length)];
          }
        } else {
          target = nonMafia[Math.floor(Math.random() * nonMafia.length)] || others[0];
        }
      } else {
        const votedIds = currentVotes.filter(v => v !== bot.id);
        if (votedIds.length > 0 && Math.random() < 0.8) {
          const voteEntries = votedIds.reduce((acc, id) => {
            acc[id] = (acc[id] || 0) + 1;
            return acc;
          }, {} as Record<string, number>);
          
          const mostVotedId = Object.entries(voteEntries).sort((a,b) => b[1] - a[1])[0][0];
          target = others.find(p => p.id === mostVotedId) || others[Math.floor(Math.random() * others.length)];
        } else {
          target = others[Math.floor(Math.random() * others.length)];
        }
      }
      
      this.handleMessage(bot.id, { type: 'ACTION_VOTE', targetId: target.id });
    }, 5000 + Math.random() * 15000);
  }

  sendAction(msg: GameMessage) {
    if (this.state?.players.find(p => p.id === this.peer?.id)?.isHost) {
      this.handleMessage(this.peer?.id || '', msg);
    } else {
      const hostConn = Array.from(this.connections.values())[0];
      if (hostConn) {
        hostConn.send(msg);
      }
    }
  }

  subscribe(callback: (state: GameState) => void) {
    this.onStateUpdate = callback;
  }

  onNotify(callback: (msg: string) => void) {
    this.onMessage = callback;
  }

  getMyId() {
    return this.peer?.id;
  }
}

export const gameService = new GameService();
