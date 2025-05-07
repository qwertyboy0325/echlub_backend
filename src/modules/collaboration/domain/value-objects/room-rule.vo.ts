export class RoomRuleVO {
  constructor(
    public readonly maxPlayers: number,
    public readonly allowRelay: boolean,
    public readonly latencyTargetMs: number,
    public readonly opusBitrate: number
  ) {
    this.validate();
  }

  private validate(): void {
    if (this.maxPlayers < 1) {
      throw new Error('Max players must be greater than 0');
    }
    if (this.latencyTargetMs < 0) {
      throw new Error('Latency target must be non-negative');
    }
    if (this.opusBitrate < 0) {
      throw new Error('Opus bitrate must be non-negative');
    }
  }

  toJSON(): Record<string, any> {
    return {
      maxPlayers: this.maxPlayers,
      allowRelay: this.allowRelay,
      latencyTargetMs: this.latencyTargetMs,
      opusBitrate: this.opusBitrate
    };
  }
} 