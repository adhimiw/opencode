/**
 * OmaCode Hardware Pacing & Event-Queue Regulator
 * 
 * Embodies Oligarchy Pattern 4: Hardware Pacing
 * - "Respect physical event-queue and buffer realities."
 * - Protects against stream saturation, runaway tool loops, and process pipe stalls.
 */

import { HardwarePacerConfig } from './types'

export class HardwarePacer {
  private config: HardwarePacerConfig
  private tokenBucket: number
  private lastRefill: number

  constructor(config?: Partial<HardwarePacerConfig>) {
    this.config = {
      maxOpsPerSecond: config?.maxOpsPerSecond ?? 10,
      streamDrainTimeoutMs: config?.streamDrainTimeoutMs ?? 45,
      ioBackpressureThresholdBytes: config?.ioBackpressureThresholdBytes ?? 65536,
      enableHardwarePacing: config?.enableHardwarePacing ?? true
    }
    this.tokenBucket = this.config.maxOpsPerSecond
    this.lastRefill = Date.now()
  }

  /**
   * Refills token bucket according to elapsed time
   */
  private refill(): void {
    const now = Date.now()
    const elapsedSeconds = (now - this.lastRefill) / 1000
    this.tokenBucket = Math.min(
      this.config.maxOpsPerSecond,
      this.tokenBucket + elapsedSeconds * this.config.maxOpsPerSecond
    )
    this.lastRefill = now
  }

  /**
   * Paces an operation: waits if bucket is depleted, then drains stream buffers
   */
  public async paceOperation(): Promise<number> {
    if (!this.config.enableHardwarePacing) return 0

    this.refill()
    let waitMs = 0

    if (this.tokenBucket < 1) {
      // Must wait for token refill
      waitMs = Math.ceil(((1 - this.tokenBucket) / this.config.maxOpsPerSecond) * 1000)
      await new Promise((resolve) => setTimeout(resolve, waitMs))
      this.refill()
    }

    this.tokenBucket -= 1

    // Allow event loop and I/O streams to drain
    if (this.config.streamDrainTimeoutMs > 0) {
      await new Promise((resolve) => setTimeout(resolve, this.config.streamDrainTimeoutMs))
    }

    return waitMs + this.config.streamDrainTimeoutMs
  }

  /**
   * Checks if buffer output requires a backpressure yield
   */
  public checkBackpressure(outputBytes: number): boolean {
    return outputBytes > this.config.ioBackpressureThresholdBytes
  }
}
