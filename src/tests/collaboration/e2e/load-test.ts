/**
 * Load Test for Collaboration Module
 * 
 * This script simulates 4 peers connecting to a room and exchanging WebRTC signals.
 * It measures performance and stability under load.
 * 
 * Usage: 
 * - First start the server
 * - Then run: ts-node src/tests/collaboration/e2e/load-test.ts
 */

import { io, Socket } from 'socket.io-client';
import { v4 as uuidv4 } from 'uuid';

const SERVER_URL = 'http://localhost:3000';
const SOCKET_PATH = '/collaboration';
const TEST_DURATION_MS = 60000; // 1 minute test
const PEERS_COUNT = 4;
const ICE_CANDIDATES_PER_PEER = 10; // Number of ICE candidates to simulate per peer

// 為 socket.io 事件定義類型
interface RoomState {
  roomId: string;
  players: string[];
  ownerId: string;
  rules: any;
}

interface PlayerEvent {
  peerId: string;
  roomId: string;
}

interface SignalData {
  from: string;
  to?: string;
  offer?: any;
  answer?: any;
  candidate?: any;
}

interface Peer {
  id: string;
  socket: Socket;
  connections: {
    [peerId: string]: {
      offerSent: boolean;
      answerReceived: boolean;
      iceCandidatesSent: number;
      iceCandidatesReceived: number;
    }
  };
}

interface Stats {
  connectionsEstablished: number;
  offersExchanged: number;
  answersExchanged: number;
  iceCandidatesExchanged: number;
  messagesProcessed: number;
  errors: number;
  startTime: number;
  endTime: number | null;
}

class LoadTest {
  private roomId: string;
  private peers: Peer[] = [];
  private stats: Stats;
  private testRunning = false;

  constructor() {
    this.roomId = uuidv4();
    this.stats = {
      connectionsEstablished: 0,
      offersExchanged: 0,
      answersExchanged: 0,
      iceCandidatesExchanged: 0,
      messagesProcessed: 0,
      errors: 0,
      startTime: 0,
      endTime: null
    };
  }

  async run() {
    console.log(`Starting load test for room ${this.roomId}`);
    this.stats.startTime = Date.now();
    this.testRunning = true;

    // Create peers
    await this.createPeers();

    // Start sending signals
    this.initiatePeerConnections();

    // Print stats every 5 seconds
    const statsInterval = setInterval(() => {
      this.printStats();
    }, 5000);

    // End test after duration
    setTimeout(() => {
      this.testRunning = false;
      this.stats.endTime = Date.now();
      
      clearInterval(statsInterval);
      
      this.printFinalStats();
      this.cleanup();
    }, TEST_DURATION_MS);
  }

  private async createPeers() {
    console.log(`Creating ${PEERS_COUNT} peers...`);
    
    for (let i = 0; i < PEERS_COUNT; i++) {
      const peerId = `peer-${i}`;
      
      const socket = io(SERVER_URL, {
        path: SOCKET_PATH,
        query: {
          roomId: this.roomId,
          peerId
        },
        transports: ['websocket']
      });

      const peer: Peer = {
        id: peerId,
        socket,
        connections: {}
      };

      // Initialize connections map for this peer
      for (let j = 0; j < PEERS_COUNT; j++) {
        if (i !== j) {
          const remotePeerId = `peer-${j}`;
          peer.connections[remotePeerId] = {
            offerSent: false,
            answerReceived: false,
            iceCandidatesSent: 0,
            iceCandidatesReceived: 0
          };
        }
      }

      this.setupSocketListeners(peer);
      this.peers.push(peer);
      
      // Wait for connection to be established
      await new Promise<void>((resolve) => {
        socket.on('connect', () => {
          this.stats.connectionsEstablished++;
          console.log(`${peerId} connected`);
          
          // Join the room
          socket.emit('join', { roomId: this.roomId, peerId });
          resolve();
        });
        
        socket.on('connect_error', (err: Error) => {
          console.error(`Connection error for ${peerId}:`, err);
          this.stats.errors++;
          resolve(); // Continue anyway
        });
      });
      
      // Add a small delay between peer creations
      await new Promise(resolve => setTimeout(resolve, 500));
    }
  }

  private setupSocketListeners(peer: Peer) {
    const { socket, id } = peer;
    
    socket.on('error', (error: Error) => {
      console.error(`Error for ${id}:`, error);
      this.stats.errors++;
    });
    
    socket.on('room-state', (data: RoomState) => {
      console.log(`${id} received room state with ${(data.players || []).length} players`);
      this.stats.messagesProcessed++;
    });
    
    socket.on('player-joined', (data: PlayerEvent) => {
      console.log(`${id} detected player joined: ${data.peerId}`);
      this.stats.messagesProcessed++;
    });
    
    socket.on('offer', (data: SignalData) => {
      this.stats.offersExchanged++;
      this.stats.messagesProcessed++;
      
      const remotePeerId = data.from;
      
      // Send answer back
      socket.emit('answer', {
        roomId: this.roomId,
        from: id,
        to: remotePeerId,
        answer: { type: 'answer', sdp: `answer-sdp-${id}-to-${remotePeerId}` }
      });
      
      console.log(`${id} received offer from ${remotePeerId} and sent answer`);
    });
    
    socket.on('answer', (data: SignalData) => {
      const remotePeerId = data.from;
      const connection = peer.connections[remotePeerId];
      
      if (connection) {
        connection.answerReceived = true;
        this.stats.answersExchanged++;
        this.stats.messagesProcessed++;
        
        console.log(`${id} received answer from ${remotePeerId}`);
        
        // After receiving answer, start sending ICE candidates
        this.sendIceCandidates(peer, remotePeerId);
      }
    });
    
    socket.on('ice-candidate', (data: SignalData) => {
      const remotePeerId = data.from;
      const connection = peer.connections[remotePeerId];
      
      if (connection) {
        connection.iceCandidatesReceived++;
        this.stats.iceCandidatesExchanged++;
        this.stats.messagesProcessed++;
      }
    });
  }

  private initiatePeerConnections() {
    // Each peer initiates connection with peers that have higher indices
    // This avoids duplicate connections
    for (let i = 0; i < this.peers.length; i++) {
      const peer = this.peers[i];
      
      for (let j = i + 1; j < this.peers.length; j++) {
        const remotePeer = this.peers[j];
        
        // Send offer
        this.sendOffer(peer, remotePeer.id);
      }
    }
  }

  private sendOffer(peer: Peer, remotePeerId: string) {
    const connection = peer.connections[remotePeerId];
    
    if (connection && !connection.offerSent && this.testRunning) {
      peer.socket.emit('offer', {
        roomId: this.roomId,
        from: peer.id,
        to: remotePeerId,
        offer: { type: 'offer', sdp: `offer-sdp-${peer.id}-to-${remotePeerId}` }
      });
      
      connection.offerSent = true;
      console.log(`${peer.id} sent offer to ${remotePeerId}`);
    }
  }

  private sendIceCandidates(peer: Peer, remotePeerId: string) {
    const connection = peer.connections[remotePeerId];
    
    // Send ICE candidates
    const sendNextCandidate = () => {
      if (
        connection && 
        connection.iceCandidatesSent < ICE_CANDIDATES_PER_PEER && 
        this.testRunning
      ) {
        peer.socket.emit('ice-candidate', {
          roomId: this.roomId,
          from: peer.id,
          to: remotePeerId,
          candidate: { 
            candidate: `candidate:${peer.id}:${remotePeerId}:${connection.iceCandidatesSent}`,
            sdpMid: '0',
            sdpMLineIndex: 0
          }
        });
        
        connection.iceCandidatesSent++;
        
        // Simulate ICE candidate trickling with random delays
        const delay = 100 + Math.random() * 400;
        setTimeout(sendNextCandidate, delay);
      }
    };
    
    // Start sending candidates
    sendNextCandidate();
  }

  private printStats() {
    if (!this.testRunning) return;
    
    const elapsedSec = (Date.now() - this.stats.startTime) / 1000;
    const messagesPerSecond = this.stats.messagesProcessed / elapsedSec;
    
    console.log('\n--------- CURRENT STATS ---------');
    console.log(`Runtime: ${elapsedSec.toFixed(1)} seconds`);
    console.log(`Messages processed: ${this.stats.messagesProcessed} (${messagesPerSecond.toFixed(1)}/sec)`);
    console.log(`Connections: ${this.stats.connectionsEstablished}/${PEERS_COUNT}`);
    console.log(`Offers exchanged: ${this.stats.offersExchanged}`);
    console.log(`Answers exchanged: ${this.stats.answersExchanged}`);
    console.log(`ICE candidates exchanged: ${this.stats.iceCandidatesExchanged}`);
    console.log(`Errors: ${this.stats.errors}`);
    console.log('----------------------------------\n');
  }

  private printFinalStats() {
    if (!this.stats.endTime) return;
    
    const elapsedSec = (this.stats.endTime - this.stats.startTime) / 1000;
    const messagesPerSecond = this.stats.messagesProcessed / elapsedSec;
    
    console.log('\n=========== FINAL STATS ===========');
    console.log(`Test duration: ${elapsedSec.toFixed(1)} seconds`);
    console.log(`Total messages: ${this.stats.messagesProcessed} (${messagesPerSecond.toFixed(1)}/sec)`);
    console.log(`Connections: ${this.stats.connectionsEstablished}/${PEERS_COUNT}`);
    console.log(`Offers exchanged: ${this.stats.offersExchanged}`);
    console.log(`Answers exchanged: ${this.stats.answersExchanged}`);
    console.log(`ICE candidates exchanged: ${this.stats.iceCandidatesExchanged}`);
    console.log(`Errors: ${this.stats.errors}`);
    
    // Connection matrix
    console.log('\nConnection Matrix:');
    for (const peer of this.peers) {
      for (const remotePeerId in peer.connections) {
        const conn = peer.connections[remotePeerId];
        console.log(`${peer.id} -> ${remotePeerId}: offer: ${conn.offerSent}, answer: ${conn.answerReceived}, ICE sent: ${conn.iceCandidatesSent}, ICE received: ${conn.iceCandidatesReceived}`);
      }
    }
    
    console.log('====================================\n');
  }

  private cleanup() {
    console.log('Cleaning up...');
    
    for (const peer of this.peers) {
      peer.socket.disconnect();
    }
    
    console.log('Load test completed');
  }
}

// Run the test
const loadTest = new LoadTest();
loadTest.run().catch(error => {
  console.error('Load test failed:', error);
}); 