import { Room } from '../../../modules/collaboration/domain/aggregates/room.aggregate';
import { RoomRuleVO } from '../../../modules/collaboration/domain/value-objects/room-rule.vo';
import { v4 as uuidv4 } from 'uuid';

describe('Room Aggregate', () => {
  const defaultRules = new RoomRuleVO(
    4, // maxPlayers
    true, // allowRelay
    100, // latencyTargetMs
    64000 // opusBitrate
  );

  const ownerId = 'owner-123';
  let roomId: string;
  let room: Room;

  beforeEach(() => {
    roomId = uuidv4();
    room = Room.create(roomId, {
      ownerId,
      rules: defaultRules,
      players: new Set([ownerId]),
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date()
    });
  });

  describe('create', () => {
    it('should create a room with given properties', () => {
      // Assert
      expect(room).toBeDefined();
      expect(room.ownerId).toBe(ownerId);
      expect(room.rules).toEqual(defaultRules);
      expect(room.isActive).toBe(true);
      expect(room.players.size).toBe(1);
      expect(room.players.has(ownerId)).toBe(true);
    });

    it('should publish RoomCreatedEvent when created', () => {
      // Arrange
      const domainEvents = (room as any).domainEvents;

      // Assert
      expect(domainEvents.length).toBe(1);
      expect(domainEvents[0].constructor.name).toBe('RoomCreatedEvent');
      expect(domainEvents[0].roomId).toBe(roomId);
      expect(domainEvents[0].ownerId).toBe(ownerId);
    });
  });

  describe('join', () => {
    it('should add player to the room when joining', () => {
      // Arrange
      const peerId = 'player-456';
      
      // Act
      room.join(peerId);
      
      // Assert
      expect(room.players.size).toBe(2);
      expect(room.players.has(peerId)).toBe(true);
    });

    it('should publish PlayerJoinedEvent when player joins', () => {
      // Arrange
      const peerId = 'player-456';
      
      // Act
      room.join(peerId);
      const domainEvents = (room as any).domainEvents;
      
      // Assert
      expect(domainEvents.length).toBe(2); // RoomCreatedEvent + PlayerJoinedEvent
      expect(domainEvents[1].constructor.name).toBe('PlayerJoinedEvent');
      expect(domainEvents[1].roomId).toBe(roomId);
      expect(domainEvents[1].peerId).toBe(peerId);
    });

    it('should throw error when joining a full room', () => {
      // Arrange
      const maxPlayers = room.rules.maxPlayers;
      
      // Fill the room to capacity (minus the owner who's already in)
      for (let i = 1; i < maxPlayers; i++) {
        room.join(`player-${i}`);
      }
      
      // Act & Assert
      expect(() => room.join('one-too-many')).toThrow('Room is full');
    });

    it('should throw error when player is already in room', () => {
      // Arrange
      const peerId = 'player-456';
      room.join(peerId);
      
      // Act & Assert
      expect(() => room.join(peerId)).toThrow('Player already in room');
    });

    it('should throw error when joining inactive room', () => {
      // Arrange
      room.close();
      const peerId = 'player-456';
      
      // Act & Assert
      expect(() => room.join(peerId)).toThrow('Room is not active');
    });
  });

  describe('leave', () => {
    it('should remove player from the room when leaving', () => {
      // Arrange
      const peerId = 'player-456';
      room.join(peerId);
      
      // Act
      room.leave(peerId);
      
      // Assert
      expect(room.players.size).toBe(1);
      expect(room.players.has(peerId)).toBe(false);
    });

    it('should publish PlayerLeftEvent when player leaves', () => {
      // Arrange
      const peerId = 'player-456';
      room.join(peerId);
      
      // Clear previous events
      (room as any).domainEvents = [];
      
      // Act
      room.leave(peerId);
      const domainEvents = (room as any).domainEvents;
      
      // Assert
      expect(domainEvents.length).toBe(1);
      expect(domainEvents[0].constructor.name).toBe('PlayerLeftEvent');
      expect(domainEvents[0].roomId).toBe(roomId);
      expect(domainEvents[0].peerId).toBe(peerId);
    });

    it('should throw error when player is not in room', () => {
      // Act & Assert
      expect(() => room.leave('not-in-room')).toThrow('Player not in room');
    });

    it('should close room when last player leaves', () => {
      // Arrange
      const peerId = 'player-456';
      room.join(peerId);
      
      // Act
      room.leave(ownerId);
      room.leave(peerId);
      
      // Assert
      expect(room.isActive).toBe(false);
    });
  });

  describe('updateRules', () => {
    it('should update room rules', () => {
      // Arrange
      const newRules = new RoomRuleVO(
        6, // maxPlayers
        false, // allowRelay
        50, // latencyTargetMs
        96000 // opusBitrate
      );
      
      // Act
      room.updateRules(newRules);
      
      // Assert
      expect(room.rules).toEqual(newRules);
    });

    it('should publish RoomRuleChangedEvent when rules updated', () => {
      // Arrange
      const newRules = new RoomRuleVO(
        6, // maxPlayers
        false, // allowRelay
        50, // latencyTargetMs
        96000 // opusBitrate
      );
      
      // Clear previous events
      (room as any).domainEvents = [];
      
      // Act
      room.updateRules(newRules);
      const domainEvents = (room as any).domainEvents;
      
      // Assert
      expect(domainEvents.length).toBe(1);
      expect(domainEvents[0].constructor.name).toBe('RoomRuleChangedEvent');
      expect(domainEvents[0].roomId).toBe(roomId);
      expect(domainEvents[0].rules).toEqual(newRules);
    });

    it('should throw error when updating rules for inactive room', () => {
      // Arrange
      room.close();
      const newRules = new RoomRuleVO(
        6, // maxPlayers
        false, // allowRelay
        50, // latencyTargetMs
        96000 // opusBitrate
      );
      
      // Act & Assert
      expect(() => room.updateRules(newRules)).toThrow('Room is not active');
    });
  });

  describe('close', () => {
    it('should set room to inactive when closed', () => {
      // Act
      room.close();
      
      // Assert
      expect(room.isActive).toBe(false);
    });

    it('should publish RoomClosedEvent when closed', () => {
      // Clear previous events
      (room as any).domainEvents = [];
      
      // Act
      room.close();
      const domainEvents = (room as any).domainEvents;
      
      // Assert
      expect(domainEvents.length).toBe(1);
      expect(domainEvents[0].constructor.name).toBe('RoomClosedEvent');
      expect(domainEvents[0].roomId).toBe(roomId);
    });

    it('should throw error when room is already closed', () => {
      // Arrange
      room.close();
      
      // Act & Assert
      expect(() => room.close()).toThrow('Room is already closed');
    });
  });

  describe('utility methods', () => {
    it('should check if user is room owner', () => {
      // Act & Assert
      expect(room.isOwner(ownerId)).toBe(true);
      expect(room.isOwner('not-owner')).toBe(false);
    });

    it('should check if player is in room', () => {
      // Arrange
      const peerId = 'player-456';
      room.join(peerId);
      
      // Act & Assert
      expect(room.hasPlayer(ownerId)).toBe(true);
      expect(room.hasPlayer(peerId)).toBe(true);
      expect(room.hasPlayer('not-in-room')).toBe(false);
    });

    it('should serialize room to JSON', () => {
      // Act
      const json = room.toJSON();
      
      // Assert
      expect(json.id).toBe(roomId);
      expect(json.ownerId).toBe(ownerId);
      expect(json.isActive).toBe(true);
      expect(Array.isArray(json.players)).toBe(true);
      expect(json.players).toContain(ownerId);
      expect(json.rules).toBeDefined();
    });
  });
}); 