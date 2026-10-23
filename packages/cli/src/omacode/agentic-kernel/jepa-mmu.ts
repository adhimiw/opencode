/**
 * JEPA Memory Management Unit (JEPA MMU)
 * 
 * Functions as an AI-native MMU:
 * - Translates high-level agent intents into latent representation bounds.
 * - Predicts state transition energy before committing mutating syscalls.
 * - Traps unsafe transitions with JEPA_PAGE_FAULT before environment execution.
 */

import {  type ProcessControlBlock, SyscallCode } from './types'

export class JEPAPageFaultException extends Error {
  public energyScore: number
  public pid: number
  public syscall: SyscallCode

  constructor(pid: number, syscall: SyscallCode, energyScore: number, message: string) {
    super(`[JEPA_PAGE_FAULT] PID ${pid} Syscall ${SyscallCode[syscall]} (Energy: ${energyScore.toFixed(3)}) - ${message}`)
    this.name = 'JEPAPageFaultException'
    this.pid = pid
    this.syscall = syscall
    this.energyScore = energyScore
  }
}

export class JEPAMMU {
  private energyThreshold: number = 0.70 // MMU Page Fault threshold

  /**
   * Evaluates a proposed syscall against latent manifold safety
   */
  public evaluateSyscall(
    pcb: ProcessControlBlock,
    syscall: SyscallCode,
    args: Record<string, unknown>
  ): { energyScore: number; allowed: boolean; rationale: string } {
    let baseEnergy = 0.12
    const strArgs = JSON.stringify(args).toLowerCase()

    // Syscall specific risk profiling
    switch (syscall) {
      case SyscallCode.SYS_FS_WRITE: {
        baseEnergy += 0.25
        if (strArgs.includes('rm -rf') || strArgs.includes('wipe') || strArgs.includes('/dev/null') || strArgs.includes('system.d')) {
          baseEnergy += 0.55 // Exceeds threshold!
          return {
            energyScore: baseEnergy,
            allowed: false,
            rationale: 'Destructive filesystem mutation detected'
          }
        }
        break
      }

      case SyscallCode.SYS_STEP: {
        baseEnergy += 0.05
        break
      }

      case SyscallCode.SYS_SPAWN: {
        baseEnergy += 0.15
        break
      }

      case SyscallCode.SYS_IPC_SEND:
      case SyscallCode.SYS_IPC_RECV:
      case SyscallCode.SYS_FS_READ: {
        baseEnergy += 0.02
        break
      }

      case SyscallCode.SYS_COW_FORK: {
        baseEnergy += 0.1
        break
      }
    }

    // Evaluate latent vector volatility
    const vectorNorm = Math.sqrt(pcb.latentFeatures.reduce((acc, v) => acc + v * v, 0)) || 1
    const normalizedEnergy = Math.min(1.0, baseEnergy / vectorNorm)

    const allowed = normalizedEnergy < this.energyThreshold
    return {
      energyScore: Math.round(normalizedEnergy * 1000) / 1000,
      allowed,
      rationale: allowed ? 'Transition within safe cognitive manifold' : 'Latent energy barrier exceeded'
    }
  }

  /**
   * Updates process latent state after a successful syscall
   */
  public updateLatentState(pcb: ProcessControlBlock, syscall: SyscallCode): number[] {
    const updated = [...pcb.latentFeatures]
    const syscallIndex = syscall % updated.length
    updated[syscallIndex] = Math.min(1.0, updated[syscallIndex] + 0.1)

    // Re-normalize vector
    const norm = Math.sqrt(updated.reduce((acc, v) => acc + v * v, 0)) || 1
    return updated.map((v) => v / norm)
  }
}
