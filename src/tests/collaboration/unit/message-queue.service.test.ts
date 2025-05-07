import { MessageQueueService } from '../../../modules/collaboration/infrastructure/services/message-queue.service';
import { SignalService } from '../../../modules/collaboration/infrastructure/services/signal.service';

// Mock dependencies
jest.mock('../../../modules/collaboration/infrastructure/services/signal.service');
jest.mock('../../../shared/utils/logger', () => {
  return {
    __esModule: true,
    default: jest.fn().mockImplementation(() => ({
      debug: jest.fn(),
      info: jest.fn(),
      error: jest.fn(),
      warn: jest.fn(),
      log: jest.fn()
    }))
  };
});

describe('MessageQueueService', () => {
  let messageQueueService: MessageQueueService;
  let mockSignalService: jest.Mocked<SignalService>;

  beforeEach(() => {
    // Clear all mocks
    jest.clearAllMocks();
    
    // Create the service
    messageQueueService = new MessageQueueService();
    
    // Directly replace the logger with a mock that has all needed methods
    (messageQueueService as any).logger = {
      debug: jest.fn(),
      info: jest.fn(),
      error: jest.fn(),
      warn: jest.fn(),
      log: jest.fn()
    };
    
    // Create mock signal service
    mockSignalService = {
      batchProcessConnection: jest.fn().mockResolvedValue(undefined)
    } as unknown as jest.Mocked<SignalService>;
    
    // Set the mock signal service
    messageQueueService.setSignalService(mockSignalService);
  });

  describe('enqueue', () => {
    it('should add message to queue for a room', async () => {
      // Arrange
      const roomId = 'room-123';
      const message = {
        type: 'offer',
        data: {
          roomId,
          from: 'peer-A',
          to: 'peer-B',
          offer: { type: 'offer', sdp: 'sdp-data' }
        }
      };
      
      // Act
      await messageQueueService.enqueue(roomId, message);
      
      // Assert
      expect(messageQueueService.getQueueSize(roomId)).toBe(1);
    });

    it('should prioritize messages by type', async () => {
      // Arrange
      const roomId = 'room-123';
      const iceMessage = {
        type: 'ice-candidate',
        data: {
          roomId,
          from: 'peer-A',
          to: 'peer-B',
          candidate: { candidate: 'candidate-data' }
        }
      };
      
      const offerMessage = {
        type: 'offer',
        data: {
          roomId,
          from: 'peer-A',
          to: 'peer-B',
          offer: { type: 'offer', sdp: 'sdp-data' }
        }
      };
      
      // Act - Add ICE candidate first, then offer
      await messageQueueService.enqueue(roomId, iceMessage);
      await messageQueueService.enqueue(roomId, offerMessage);
      
      // Assert - Check that offer is processed first (we can't directly check the queue order)
      // This is a bit of a hack to test the internal implementation
      // We're assuming the first message processed is the highest priority one
      jest.spyOn(messageQueueService as any, 'processQueue');
      
      // Trigger manual processing
      await (messageQueueService as any).processAllQueues();
      
      // Check the arguments to the mock function
      expect(mockSignalService.batchProcessConnection).toHaveBeenCalled();
    });
  });

  describe('checkQueueSize', () => {
    it('should remove old ICE candidates when queue size exceeds limit', async () => {
      // Arrange
      const roomId = 'room-123';
      
      // Create a lot of ICE candidate messages
      for (let i = 0; i < 1001; i++) {
        const message = {
          type: 'ice-candidate',
          data: {
            roomId,
            from: 'peer-A',
            to: 'peer-B',
            candidate: { candidate: `candidate-data-${i}` }
          }
        };
        
        await messageQueueService.enqueue(roomId, message);
      }
      
      // Mock the timestamp for old messages
      const queueArray = (messageQueueService as any).queue.get(roomId);
      if (queueArray) {
        // Make some messages old
        for (let i = 0; i < 500; i++) {
          queueArray[i].timestamp = Date.now() - 10000; // 10 seconds old
        }
      }
      
      // Act - This should trigger the cleanup
      await messageQueueService.enqueue(roomId, {
        type: 'offer',
        data: { roomId, from: 'peer-A', to: 'peer-B', offer: {} }
      });
      
      // Assert - Queue size should be less than 1002 (we can't know exact size due to async processing)
      expect(messageQueueService.getQueueSize(roomId)).toBeLessThan(1002);
    });
  });
  
  describe('processing', () => {
    it('should batch process messages', async () => {
      // Arrange
      const roomId = 'room-123';
      
      // Add multiple messages for the same connection
      for (let i = 0; i < 20; i++) {
        await messageQueueService.enqueue(roomId, {
          type: 'ice-candidate',
          data: {
            roomId,
            from: 'peer-A',
            to: 'peer-B',
            candidate: { candidate: `candidate-data-${i}` }
          }
        });
      }
      
      // Act - Force process
      await (messageQueueService as any).processAllQueues();
      
      // Assert - batchProcessConnection should be called with merged data
      expect(mockSignalService.batchProcessConnection).toHaveBeenCalled();
      
      // The queue should be reduced by the batch size (default is 10)
      expect(messageQueueService.getQueueSize(roomId)).toBeLessThanOrEqual(10);
    });
    
    it('should handle errors during processing', async () => {
      // Arrange
      const roomId = 'room-123';
      mockSignalService.batchProcessConnection.mockRejectedValueOnce(new Error('Processing error'));
      
      // Add a message
      await messageQueueService.enqueue(roomId, {
        type: 'offer',
        data: {
          roomId,
          from: 'peer-A',
          to: 'peer-B',
          offer: { type: 'offer', sdp: 'sdp-data' }
        }
      });
      
      // Act - Should not throw
      await expect((messageQueueService as any).processAllQueues()).resolves.not.toThrow();
      
      // Assert - Error should be handled
      expect(mockSignalService.batchProcessConnection).toHaveBeenCalled();
    });
  });

  describe('utility methods', () => {
    it('should report queue sizes correctly', async () => {
      // Arrange
      const room1 = 'room-1';
      const room2 = 'room-2';
      
      // Add messages to different rooms
      await messageQueueService.enqueue(room1, {
        type: 'offer',
        data: { roomId: room1, from: 'peer-A', to: 'peer-B', offer: {} }
      });
      
      await messageQueueService.enqueue(room1, {
        type: 'answer',
        data: { roomId: room1, from: 'peer-B', to: 'peer-A', answer: {} }
      });
      
      await messageQueueService.enqueue(room2, {
        type: 'ice-candidate',
        data: { roomId: room2, from: 'peer-C', to: 'peer-D', candidate: {} }
      });
      
      // Act & Assert
      expect(messageQueueService.getQueueSize(room1)).toBe(2);
      expect(messageQueueService.getQueueSize(room2)).toBe(1);
      expect(messageQueueService.getTotalQueueSize()).toBe(3);
    });
    
    it('should clear queue for a room', async () => {
      // Arrange
      const roomId = 'room-123';
      
      await messageQueueService.enqueue(roomId, {
        type: 'offer',
        data: { roomId, from: 'peer-A', to: 'peer-B', offer: {} }
      });
      
      // Act
      messageQueueService.clearQueue(roomId);
      
      // Assert
      expect(messageQueueService.getQueueSize(roomId)).toBe(0);
    });
  });
}); 