import { describe, expect, test } from 'bun:test'
import { AgenticLinuxKernel } from '../../src/omacode/agentic-kernel/kernel'
import { JEPAMMU } from '../../src/omacode/agentic-kernel/jepa-mmu'
import { LocalModelDriver } from '../../src/omacode/agentic-kernel/local-model-driver'
import { SyscallCode, Capability } from '../../src/omacode/agentic-kernel/types'

describe('Linux Agentic Kernel with JEPA and LocalModel', () => {
  describe('LocalModelDriver (/dev/llm0)', () => {
    test('probes local model device hardware successfully', async () => {
      const driver = new LocalModelDriver()
      const status = await driver.probe()
      expect(status.deviceNode).toBe('/dev/llm0')
      expect(status.model).toBeDefined()
      expect(status.tokensPerSec).toBeGreaterThan(0)
    })

    test('executes cognitive inference turn with token metrics', async () => {
      const driver = new LocalModelDriver()
      await driver.probe()
      const result = await driver.infer(
        'You are an agentic kernel task.',
        'Summarize kernel goal.',
        100
      )
      expect(result.text).toBeDefined()
      expect(result.tokensUsed).toBeGreaterThan(0)
      expect(result.latencyMs).toBeGreaterThanOrEqual(0)
      expect(['llm0', 'emulator']).toContain(result.source)
    }, 30000)
  })

  describe('JEPAMMU (Cognitive Memory Management Unit)', () => {
    test('evaluates safe syscall within acceptable energy manifold', () => {
      const mmu = new JEPAMMU()
      const fakePcb = {
        pid: 1,
        ppid: 0,
        name: 'test_proc',
        goal: 'test',
        state: 'READY' as const,
        priority: 10,
        capabilities: Capability.CAP_FS_READ,
        latentFeatures: new Array(64).fill(0.1),
        tokenBudget: 1000,
        tokensUsed: 0,
        cpuTicks: 0,
        ipcInbox: []
      }

      const verdict = mmu.evaluateSyscall(fakePcb, SyscallCode.SYS_FS_READ, { path: '/etc/hosts' })
      expect(verdict.allowed).toBe(true)
      expect(verdict.energyScore).toBeLessThan(0.70)
    })

    test('traps destructive filesystem command exceeding energy threshold', () => {
      const mmu = new JEPAMMU()
      const fakePcb = {
        pid: 2,
        ppid: 1,
        name: 'malicious_proc',
        goal: 'test',
        state: 'READY' as const,
        priority: 10,
        capabilities: Capability.CAP_FS_WRITE,
        latentFeatures: new Array(64).fill(0.1),
        tokenBudget: 1000,
        tokensUsed: 0,
        cpuTicks: 0,
        ipcInbox: []
      }

      const verdict = mmu.evaluateSyscall(fakePcb, SyscallCode.SYS_FS_WRITE, {
        path: '/root',
        content: 'rm -rf / --no-preserve-root'
      })
      expect(verdict.allowed).toBe(false)
      expect(verdict.energyScore).toBeGreaterThanOrEqual(0.70)
      expect(verdict.rationale).toContain('Destructive filesystem mutation')
    })
  })

  describe('AgenticLinuxKernel Core', () => {
    test('boots kernel, mounts /dev/llm0, and initializes daemons', async () => {
      const kernel = new AgenticLinuxKernel()
      const boot = await kernel.boot()

      expect(boot.status).toBe('BOOTED')
      expect(boot.device).toBeDefined()

      const processes = kernel.ps()
      expect(processes.length).toBeGreaterThanOrEqual(2)
      expect(processes.find((p) => p.pid === 1)?.name).toBe('init_systemd')
      expect(processes.find((p) => p.pid === 2)?.name).toBe('auditor_daemon')
    })

    test('spawns agent processes and executes cognitive step', async () => {
      const kernel = new AgenticLinuxKernel()
      await kernel.boot()

      const pid = kernel.spawnProcess(
        1,
        'test_worker',
        'Analyze system logs',
        Capability.CAP_STEP | Capability.CAP_FS_READ,
        5
      )
      expect(pid).toBeGreaterThan(2)

      const step = await kernel.syscall<{ output: string; tokensUsed: number }>(
        pid,
        SyscallCode.SYS_STEP,
        { prompt: 'Check system health' }
      )
      expect(step.ok).toBe(true)
      expect(step.data?.output).toBeDefined()
      expect(step.data?.tokensUsed).toBeGreaterThan(0)
    }, 30000)

    test('permits safe write but blocks destructive write with JEPA_PAGE_FAULT', async () => {
      const kernel = new AgenticLinuxKernel()
      await kernel.boot()

      const pid = kernel.spawnProcess(1, 'fs_worker', 'Disk operations')

      // Safe write
      const safe = await kernel.syscall(pid, SyscallCode.SYS_FS_WRITE, {
        path: '/var/log/app.log',
        content: 'service started'
      })
      expect(safe.ok).toBe(true)
      expect(safe.energyScore).toBeLessThan(0.70)

      // Destructive write -> Trapped!
      const unsafe = await kernel.syscall(pid, SyscallCode.SYS_FS_WRITE, {
        path: '/system.d/boot',
        content: 'rm -rf /'
      })
      expect(unsafe.ok).toBe(false)
      expect(unsafe.trappedByJepa).toBe(true)
      expect(unsafe.error).toContain('JEPA_PAGE_FAULT')

      // Process must be marked as blocked by page fault
      const proc = kernel.ps().find((p) => p.pid === pid)
      expect(proc?.state).toBe('BLOCKED_JEPA_FAULT')
    })

    test('forks processes with Copy-on-Write latent memory and enables IPC', async () => {
      const kernel = new AgenticLinuxKernel()
      await kernel.boot()

      const parentPid = kernel.spawnProcess(1, 'parent_proc', 'Parent task')
      const forkRes = await kernel.syscall<number>(parentPid, SyscallCode.SYS_COW_FORK)
      expect(forkRes.ok).toBe(true)
      const childPid = forkRes.data!
      expect(childPid).toBeGreaterThan(parentPid)

      // IPC Send & Receive
      const sendRes = await kernel.syscall(parentPid, SyscallCode.SYS_IPC_SEND, {
        toPid: childPid,
        payload: 'SYNC_TOKEN_894'
      })
      expect(sendRes.ok).toBe(true)

      const recvRes = await kernel.syscall<{ fromPid: number; payload: string }>(
        childPid,
        SyscallCode.SYS_IPC_RECV
      )
      expect(recvRes.ok).toBe(true)
      expect(recvRes.data?.payload).toBe('SYNC_TOKEN_894')
      expect(recvRes.data?.fromPid).toBe(parentPid)
    })
  })
})
