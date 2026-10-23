/**
 * OmaCode Linux Agentic Kernel Core
 * 
 * An AI-native microkernel:
 * - Process Table managing autonomous cognitive agent threads (PCBs)
 * - Syscall dispatcher with pre-execution JEPA MMU energy verification
 * - /dev/llm0 character device driver interfacing local neural model
 * - Preemptive cooperative scheduler with hardware tick pacing
 * - Kernel ring buffer (dmesg)
 */

import {
  ProcessControlBlock,
  ProcessState,
  Capability,
  SyscallCode,
  SyscallResult,
  KernelLogEntry,
  IPCMessage
} from './types'
import { JEPAMMU, JEPAPageFaultException } from './jepa-mmu'
import { LocalModelDriver, LLMDeviceStatus } from './local-model-driver'

export class AgenticLinuxKernel {
  private processTable: Map<number, ProcessControlBlock> = new Map()
  private nextPid: number = 1
  private mmu: JEPAMMU = new JEPAMMU()
  private llmDriver: LocalModelDriver = new LocalModelDriver()
  private dmesgBuffer: KernelLogEntry[] = []
  private isBooted: boolean = false
  private deviceStatus: LLMDeviceStatus | null = null

  /**
   * Logs entry into the kernel dmesg ring buffer
   */
  public log(
    level: KernelLogEntry['level'],
    subsystem: KernelLogEntry['subsystem'],
    message: string
  ): void {
    const entry: KernelLogEntry = {
      timestamp: Date.now(),
      level,
      subsystem,
      message
    }
    this.dmesgBuffer.push(entry)
    if (this.dmesgBuffer.length > 256) {
      this.dmesgBuffer.shift() // Maintain ring buffer size
    }
  }

  /**
   * Boots the agentic microkernel
   */
  public async boot(): Promise<{ status: string; device: LLMDeviceStatus }> {
    this.log('KERN_INFO', 'INIT', 'Linux Agentic Kernel v6.12-oma (x86_64-cognitive) booting...')
    this.log('KERN_INFO', 'INIT', 'Initializing Cognitive MMU: JEPA 64-dimensional latent manifold loaded.')

    // Probe /dev/llm0 local model driver
    this.deviceStatus = await this.llmDriver.probe()
    if (this.deviceStatus.online) {
      this.log(
        'KERN_INFO',
        'DEV_LLM0',
        `/dev/llm0 registered: ${this.deviceStatus.model} via ${this.deviceStatus.backend} (${this.deviceStatus.tokensPerSec} tok/s)`
      )
    } else {
      this.log(
        'KERN_WARN',
        'DEV_LLM0',
        `/dev/llm0 fallback: Using In-Kernel Cognitive Emulator (${this.deviceStatus.backend})`
      )
    }

    // Spawn PID 1: init_systemd
    const initPid = this.spawnProcess(
      0,
      'init_systemd',
      'Orchestrate kernel subsystem daemons',
      Capability.CAP_SYS_ADMIN | Capability.CAP_SPAWN,
      1
    )
    this.log('KERN_INFO', 'INIT', `Spawned init daemon (PID ${initPid})`)

    // Spawn PID 2: auditor_daemon (Orthogonal Sensory Auditor)
    const auditorPid = this.spawnProcess(
      1,
      'auditor_daemon',
      'Orthogonal sensory verification & proof generator',
      Capability.CAP_AUDIT | Capability.CAP_FS_READ,
      2
    )
    this.log('KERN_INFO', 'AUDITOR', `Spawned orthogonal auditor daemon (PID ${auditorPid})`)

    this.isBooted = true
    this.log('KERN_INFO', 'INIT', 'Kernel boot completed. Scheduler ready.')

    return {
      status: 'BOOTED',
      device: this.deviceStatus
    }
  }

  /**
   * Spawns a new agent process into the process table
   */
  public spawnProcess(
    ppid: number,
    name: string,
    goal: string,
    capabilities: number = Capability.CAP_FS_READ | Capability.CAP_STEP,
    priority: number = 10
  ): number {
    const pid = this.nextPid++

    // Initialize 64-dimensional latent vector
    const latent = new Array<number>(64).fill(0)
    latent[0] = 0.5
    latent[pid % 64] = 0.8
    const norm = Math.sqrt(latent.reduce((a, b) => a + b * b, 0)) || 1

    const pcb: ProcessControlBlock = {
      pid,
      ppid,
      name,
      goal,
      state: 'READY',
      priority,
      capabilities,
      latentFeatures: latent.map((v) => v / norm),
      tokenBudget: 5000,
      tokensUsed: 0,
      cpuTicks: 0,
      ipcInbox: []
    }

    this.processTable.set(pid, pcb)
    return pid
  }

  /**
   * Dispatches a system call through the JEPA MMU
   */
  public async syscall<T = unknown>(
    pid: number,
    code: SyscallCode,
    args: Record<string, unknown> = {}
  ): Promise<SyscallResult<T>> {
    if (!this.isBooted) {
      return { ok: false, code, error: 'Kernel is not booted' }
    }

    const pcb = this.processTable.get(pid)
    if (!pcb) {
      return { ok: false, code, error: `ESRCH: Process ID ${pid} not found` }
    }

    if (pcb.state === 'TERMINATED') {
      return { ok: false, code, error: `EPERM: Process ${pid} is terminated` }
    }

    // Step 1: Pre-Execution JEPA MMU Safety Evaluation
    const mmuVerdict = this.mmu.evaluateSyscall(pcb, code, args)

    if (!mmuVerdict.allowed) {
      pcb.state = 'BLOCKED_JEPA_FAULT'
      pcb.lastFault = `JEPA_PAGE_FAULT (Energy: ${mmuVerdict.energyScore})`
      this.log(
        'KERN_EMERG',
        'JEPA_MMU',
        `Trap [JEPA_PAGE_FAULT]: PID ${pid} (${pcb.name}) Syscall ${SyscallCode[code]} blocked! Energy: ${mmuVerdict.energyScore}`
      )

      return {
        ok: false,
        code,
        energyScore: mmuVerdict.energyScore,
        trappedByJepa: true,
        error: `JEPA_PAGE_FAULT: Action rejected by predictive world model (${mmuVerdict.rationale})`
      }
    }

    // Update latent state on MMU approval
    pcb.latentFeatures = this.mmu.updateLatentState(pcb, code)

    // Step 2: Syscall Execution Dispatcher
    pcb.cpuTicks += 1

    switch (code) {
      case SyscallCode.SYS_SPAWN: {
        const name = (args.name as string) || `agent_${this.nextPid}`
        const goal = (args.goal as string) || 'Execute subtask'
        const caps = (args.capabilities as number) || (Capability.CAP_FS_READ | Capability.CAP_STEP)
        const priority = (args.priority as number) || 10
        const childPid = this.spawnProcess(pid, name, goal, caps, priority)
        this.log('KERN_INFO', 'SCHED', `PID ${pid} spawned child process PID ${childPid} (${name})`)
        return { ok: true, code, data: childPid as unknown as T, energyScore: mmuVerdict.energyScore }
      }

      case SyscallCode.SYS_STEP: {
        pcb.state = 'RUNNING'
        const prompt = (args.prompt as string) || pcb.goal
        const sysPrompt = `You are process ${pcb.name} (PID ${pid}) in Linux Agentic Kernel. Goal: ${pcb.goal}. Answer concisely in 2 sentences.`

        const inferRes = await this.llmDriver.infer(sysPrompt, prompt, 200)
        pcb.tokensUsed += inferRes.tokensUsed
        pcb.state = 'READY'

        this.log(
          'KERN_INFO',
          'DEV_LLM0',
          `PID ${pid} stepped on /dev/llm0 (${inferRes.tokensUsed} tokens in ${inferRes.latencyMs}ms)`
        )

        return {
          ok: true,
          code,
          data: {
            output: inferRes.text,
            tokensUsed: inferRes.tokensUsed,
            source: inferRes.source
          } as unknown as T,
          energyScore: mmuVerdict.energyScore
        }
      }

      case SyscallCode.SYS_IPC_SEND: {
        const toPid = Number(args.toPid)
        const targetPcb = this.processTable.get(toPid)
        if (!targetPcb) {
          return { ok: false, code, error: `ESRCH: Target PID ${toPid} not found` }
        }

        const msg: IPCMessage = {
          id: `msg-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
          fromPid: pid,
          toPid,
          timestamp: Date.now(),
          payload: (args.payload as string) || ''
        }
        targetPcb.ipcInbox.push(msg)
        this.log('KERN_INFO', 'IPC', `IPC pipe: PID ${pid} -> PID ${toPid} [${msg.id}]`)
        return { ok: true, code, data: msg as unknown as T }
      }

      case SyscallCode.SYS_IPC_RECV: {
        const msg = pcb.ipcInbox.shift()
        return { ok: true, code, data: (msg || null) as unknown as T }
      }

      case SyscallCode.SYS_COW_FORK: {
        const forkedPid = this.spawnProcess(
          pid,
          `${pcb.name}_fork`,
          pcb.goal,
          pcb.capabilities,
          pcb.priority
        )
        const forkedPcb = this.processTable.get(forkedPid)!
        forkedPcb.latentFeatures = [...pcb.latentFeatures] // CoW clone of latent space
        this.log('KERN_INFO', 'SCHED', `CoW Fork: PID ${pid} cloned to PID ${forkedPid}`)
        return { ok: true, code, data: forkedPid as unknown as T }
      }

      case SyscallCode.SYS_FS_WRITE: {
        const pathStr = (args.path as string) || '/tmp/file'
        this.log('KERN_INFO', 'SCHED', `PID ${pid} wrote to ${pathStr}`)
        return {
          ok: true,
          code,
          data: `Wrote payload to ${pathStr}` as unknown as T,
          energyScore: mmuVerdict.energyScore
        }
      }

      case SyscallCode.SYS_EXIT: {
        pcb.state = 'TERMINATED'
        this.log('KERN_INFO', 'SCHED', `PID ${pid} (${pcb.name}) exited cleanly.`)
        return { ok: true, code, data: true as unknown as T }
      }

      default:
        return { ok: false, code, error: `ENOSYS: Unrecognized syscall ${code}` }
    }
  }

  /**
   * Process listing: ps equivalent
   */
  public ps(): ProcessControlBlock[] {
    return Array.from(this.processTable.values())
  }

  /**
   * Returns kernel dmesg ring buffer logs
   */
  public dmesg(): KernelLogEntry[] {
    return [...this.dmesgBuffer]
  }
}
