export type ConnectionStateType = 'new' | 'connecting' | 'connected' | 'disconnected' | 'failed';

export class ConnectionStateVO {
  constructor(
    public readonly peerId: string,
    public readonly state: ConnectionStateType,
    public readonly timestamp: Date = new Date()
  ) {}

  public static createNew(peerId: string): ConnectionStateVO {
    return new ConnectionStateVO(peerId, 'new');
  }

  public update(state: ConnectionStateType): ConnectionStateVO {
    return new ConnectionStateVO(this.peerId, state);
  }

  public isConnected(): boolean {
    return this.state === 'connected';
  }

  public isDisconnected(): boolean {
    return this.state === 'disconnected' || this.state === 'failed';
  }

  public needsReconnection(): boolean {
    return this.state === 'disconnected';
  }

  public toJSON(): Record<string, any> {
    return {
      peerId: this.peerId,
      state: this.state,
      timestamp: this.timestamp
    };
  }
} 