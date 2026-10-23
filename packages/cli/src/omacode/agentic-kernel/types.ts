/**
 * Linux Agentic Kernel Type Definitions
 * 
 * Implements OS-level primitives for autonomous cognitive agent processes:
 * - Process Control Block (PCB)
 * - Syscall Table with JEPA MMU validation
 * - IPC message bus
 * - Capability-based security model
 */

export type ProcessState =
  | 'READY'
  | 'RUNNING'
  | 'WAITING'
  | 'BLOCKED_JEPA_FAULT'
  | 'TERMINATED'

export enum Capability {
  CAP_NONE = 0,
  CAP_FS_READ = 1 << 0,
  CAP_FS_WRITE = 1 << 1,
  CAP_NET = 1 << 2,
  CAP_SPAWN = 1 << 3,
  CAP_AUDIT = 1 << 4,
  CAP_SYS_ADMIN = 1 << 5,
  CAP_STEP = 1 << 6
}

export enum SyscallCode {
  SYS_SPAWN = 1,
  SYS_STEP = 2,
  SYS_JEPA_EVAL = 3,
  SYS_AUDIT_VERIFY = 4,
  SYS_IPC_SEND = 5,
  SYS_IPC_RECV = 6,
  SYS_COW_FORK = 7,
  SYS_FS_WRITE = 8,
  SYS_FS_READ = 9,
  SYS_EXIT = 10
}

export interface IPCMessage {
  id: string
  fromPid: number
  toPid: number
  timestamp: number
  payload: string
}

export interface ProcessControlBlock {
  pid: number
  ppid: number
  name: string
  goal: string
  state: ProcessState
  priority: number // 1 (highest) to 20 (lowest)
  capabilities: number // Bitmask of Capability
  latentFeatures: number[] // JEPA 64-dim latent vector
  tokenBudget: number
  tokensUsed: number
  cpuTicks: number
  ipcInbox: IPCMessage[]
  lastFault?: string
}

export interface SyscallResult<T = unknown> {
  ok: boolean
  code: number
  data?: T
  error?: string
  energyScore?: number
  trappedByJepa?: boolean
  dmesgLog?: string
}

export interface KernelLogEntry {
  timestamp: number
  level: 'KERN_INFO' | 'KERN_WARN' | 'KERN_ERR' | 'KERN_EMERG'
  subsystem: 'INIT' | 'SCHED' | 'JEPA_MMU' | 'DEV_LLM0' | 'AUDITOR' | 'IPC'
  message: string
}
