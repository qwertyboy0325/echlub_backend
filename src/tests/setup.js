// Jest setup file

// Set default timeout for tests
jest.setTimeout(30000);

// Mock console methods to reduce noise during tests
// Comment out if you want to see console output during tests
if (process.env.SUPPRESS_CONSOLE === 'true') {
  global.console = {
    ...console,
    log: jest.fn(),
    info: jest.fn(),
    debug: jest.fn()
  };
}

// Set default process.env variables for testing
process.env.NODE_ENV = 'test';

// Setup shared mocks
jest.mock('../shared/utils/logger', () => {
  class MockLogger {
    constructor(context) {
      // Create inner winston logger mock
      this.logger = {
        info: jest.fn(),
        error: jest.fn(),
        warn: jest.fn(),
        debug: jest.fn()
      };
    }
    
    info(message, meta) {
      this.logger.info(message, meta);
    }
    
    error(message, error) {
      this.logger.error(message, {
        error: error?.message,
        stack: error?.stack
      });
    }
    
    warn(message, meta) {
      this.logger.warn(message, meta);
    }
    
    debug(message, meta) {
      this.logger.debug(message, meta);
    }
  }
  
  return {
    __esModule: true,
    default: MockLogger
  };
}); 