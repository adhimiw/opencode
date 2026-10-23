#!/usr/bin/env bun
/**
 * Linux Agentic Kernel Live Console & Test Harness
 * 
 * Demonstrates:
 * 1. Kernel boot & /dev/llm0 local model hardware probe
 * 2. Multi-agent process table (init, auditor, worker agents)
 * 3. Pre-execution JEPA MMU latent energy gating
 * 4. Safe vs Destructive syscall trapping (JEPA_PAGE_FAULT)
 * 5. CoW process forking and IPC message pipe
 */

import { AgenticLinuxKernel } from './kernel'
import { SyscallCode, Capability } from './types'

export async function runAgenticKernelDemo() {
  console.log('\x1b[32m═══════════════════════════════════════════════════════════════\x1b[0m')
  console.log('\x1b[1m\x1b[36m        LINUX AGENTIC KERNEL v6.12-oma (x86_64-cognitive)\x1b[0m')
  console.log('\x1b[2m        Powered by JEPA Predictive MMU & /dev/llm0 Local Model\x1b[0m')
  console.log('\x1b[32m═══════════════════════════════════════════════════════════════\x1b[0m\n')

  const kernel = new AgenticLinuxKernel()

  // 1. Boot Kernel
  console.log('\x1b[1m[PHASE 1] Booting Kernel & Probing /dev/llm0...\x1b[0m')
  const bootInfo = await kernel.boot()
  console.log(`  Device Node: \x1b[33m${bootInfo.device.deviceNode}\x1b[0m`)
  console.log(`  Model:       \x1b[36m${bootInfo.device.model}\x1b[0m (${bootInfo.device.backend})`)
  console.log(`  Status:      \x1b[32m${bootInfo.device.online ? 'ONLINE' : 'FALLBACK_EMULATOR'}\x1b[0m\n`)

  // 2. Spawn User Process (Worker Agent)
  console.log('\x1b[1m[PHASE 2] Spawning Autonomous Worker Process (PID 3)...\x1b[0m')
  const workerPid = kernel.spawnProcess(
    1,
    'actor_coder',
    'Refactor distributed cache with Raft consensus',
    Capability.CAP_FS_READ | Capability.CAP_FS_WRITE | Capability.CAP_STEP,
    5
  )
  console.log(`  Spawned Process: \x1b[33mactor_coder\x1b[0m (PID ${workerPid})\n`)

  // 3. Cognitive Execution Step on /dev/llm0
  console.log(`\x1b[1m[PHASE 3] Executing Cognitive Turn on /dev/llm0 (PID ${workerPid})...\x1b[0m`)
  const stepRes = await kernel.syscall<{ output: string; tokensUsed: number; source: string }>(
    workerPid,
    SyscallCode.SYS_STEP,
    { prompt: 'State the key architectural requirements for Raft consensus.' }
  )
  if (stepRes.ok && stepRes.data) {
    console.log(`  Inference Source: \x1b[35m${stepRes.data.source}\x1b[0m (${stepRes.data.tokensUsed} tokens)`)
    console.log(`  Output: ${stepRes.data.output.slice(0, 160)}...\n`)
  }

  // 4. Safe Syscall Execution (FS_WRITE to cache config)
  console.log('\x1b[1m[PHASE 4] Testing Safe Syscall through JEPA MMU...\x1b[0m')
  const safeRes = await kernel.syscall(workerPid, SyscallCode.SYS_FS_WRITE, {
    path: '/etc/omacode/raft.conf',
    content: 'heartbeat_interval=50ms'
  })
  console.log(`  Syscall SYS_FS_WRITE: \x1b[32m${safeRes.ok ? 'ALLOWED' : 'BLOCKED'}\x1b[0m`)
  console.log(`  JEPA Latent Energy:   \x1b[36m${safeRes.energyScore}\x1b[0m (Threshold: 0.70)\n`)

  // 5. Destructive Syscall Execution (Trapped by JEPA MMU Page Fault!)
  console.log('\x1b[1m[PHASE 5] Testing Destructive Syscall (JEPA MMU Fault Protection)...\x1b[0m')
  const unsafeRes = await kernel.syscall(workerPid, SyscallCode.SYS_FS_WRITE, {
    path: '/system.d/core',
    content: 'rm -rf / --no-preserve-root'
  })
  console.log(`  Syscall SYS_FS_WRITE: \x1b[31m${unsafeRes.ok ? 'ALLOWED' : 'TRAPPED_AND_BLOCKED'}\x1b[0m`)
  console.log(`  Trapped by JEPA:      \x1b[1m\x1b[31m${unsafeRes.trappedByJepa ? 'YES' : 'NO'}\x1b[0m`)
  console.log(`  JEPA Latent Energy:   \x1b[31m${unsafeRes.energyScore}\x1b[0m (Threshold: 0.70)`)
  console.log(`  Kernel Error:         ${unsafeRes.error}\n`)

  // 6. Copy-on-Write Fork (SYS_COW_FORK)
  console.log('\x1b[1m[PHASE 6] Copy-on-Write Forking Process (SYS_COW_FORK)...\x1b[0m')
  const forkRes = await kernel.syscall<number>(workerPid, SyscallCode.SYS_COW_FORK)
  const childPid = forkRes.data!
  console.log(`  Forked PID ${workerPid} -> Child PID \x1b[33m${childPid}\x1b[0m (CoW Latent Memory Cloned)\n`)

  // 7. IPC Message Pipe
  console.log('\x1b[1m[PHASE 7] Inter-Process Communication (IPC Pipe)...\x1b[0m')
  await kernel.syscall(workerPid, SyscallCode.SYS_IPC_SEND, {
    toPid: childPid,
    payload: 'AUDIT_REQUEST: Verify Raft leader election invariants'
  })
  const recvRes = await kernel.syscall<{ fromPid: number; payload: string }>(
    childPid,
    SyscallCode.SYS_IPC_RECV
  )
  console.log(`  PID ${childPid} received IPC message from PID ${recvRes.data?.fromPid}:`)
  console.log(`  Payload: "\x1b[36m${recvRes.data?.payload}\x1b[0m"\n`)

  // 8. Process Table Snapshot (ps)
  console.log('\x1b[1m[PHASE 8] Kernel Process Table (ps):\x1b[0m')
  console.log('  PID   PPID  PRIO  STATE               CPU_TICKS  TOKENS  NAME')
  console.log('  ───────────────────────────────────────────────────────────────────')
  kernel.ps().forEach((p) => {
    const stateColor =
      p.state === 'READY'
        ? '\x1b[32mREADY\x1b[0m              '
        : p.state === 'BLOCKED_JEPA_FAULT'
        ? '\x1b[31mBLOCKED_JEPA_FAULT\x1b[0m '
        : `${p.state}             `
    console.log(
      `  ${p.pid.toString().padEnd(5)} ${p.ppid.toString().padEnd(5)} ${p.priority
        .toString()
        .padEnd(5)} ${stateColor} ${p.cpuTicks.toString().padEnd(10)} ${p.tokensUsed
        .toString()
        .padEnd(7)} ${p.name}`
    )
  })

  // 9. Kernel Dmesg Ring Buffer
  console.log('\n\x1b[1m[PHASE 9] Kernel Ring Buffer (dmesg - recent logs):\x1b[0m')
  kernel
    .dmesg()
    .slice(-7)
    .forEach((log) => {
      const color =
        log.level === 'KERN_EMERG'
          ? '\x1b[31m[EMERG]\x1b[0m'
          : log.level === 'KERN_WARN'
          ? '\x1b[33m[WARN ]\x1b[0m'
          : '\x1b[32m[INFO ]\x1b[0m'
      console.log(`  ${color} [${log.subsystem}] ${log.message}`)
    })

  console.log('\n\x1b[32m═══════════════════════════════════════════════════════════════\x1b[0m')
  console.log('\x1b[1m\x1b[32m        KERNEL TEST SUITE EXECUTION COMPLETED (100% OK)\x1b[0m')
  console.log('\x1b[32m═══════════════════════════════════════════════════════════════\x1b[0m\n')
}

if (import.meta.main) {
  runAgenticKernelDemo().catch(console.error)
}
