import readline from 'readline'
import { OmaCodeEngine } from './actor-auditor-loop'
import { AuditorJudge } from './auditor-judge'
import { CLMVerifier } from './clm-verifier'
import { JEPAWorldModel } from './jepa-world-model'
import { AgenticLinuxKernel } from './agentic-kernel/kernel'
import { CandidateAction } from './types'

export class OmaCodeTui {
  private workspaceDir: string
  private rl: readline.Interface | null = null
  private engine: OmaCodeEngine
  private auditor: AuditorJudge
  private clm: CLMVerifier
  private jepa: JEPAWorldModel
  private isBusy: boolean = false

  constructor(workspaceDir: string = process.cwd()) {
    this.workspaceDir = workspaceDir
    this.engine = new OmaCodeEngine({
      workspaceDir: this.workspaceDir,
      maxTurns: 3,
      enablePacing: true
    })
    this.auditor = new AuditorJudge(this.workspaceDir)
    this.clm = new CLMVerifier(0.07)
    this.jepa = new JEPAWorldModel()
  }

  private drawHeader() {
    console.clear()
    const cols = process.stdout.columns || 80
    const hr = '━'.repeat(Math.min(cols, 80))

    console.log(`\x1b[36m${hr}\x1b[0m`)
    console.log(
      `\x1b[1m\x1b[33m  OMACODE DUAL-AGENT TUI\x1b[0m \x1b[2mv2.0-omega\x1b[0m  │  \x1b[32mActor-Auditor Verification Console\x1b[0m`
    )
    console.log(
      `  \x1b[2mWorkspace: ${this.workspaceDir.slice(0, 35)}  │  MMU: JEPA (64-dim)  │  Model: /dev/llm0\x1b[0m`
    )
    console.log(`\x1b[36m${hr}\x1b[0m`)
    console.log(`\x1b[1mQuick Commands:\x1b[0m`)
    console.log(
      `  \x1b[33m<any task prompt>\x1b[0m  Execute dual-agent loop (Actor CoW + Auditor Proof)`
    )
    console.log(`  \x1b[36m/audit\x1b[0m             Run sensory validation over current workspace`)
    console.log(`  \x1b[35m/clm\x1b[0m               Benchmark CLM InfoNCE candidate ranking`)
    console.log(`  \x1b[31m/jepa <cmd>\x1b[0m        Predict command risk with JEPA World Model`)
    console.log(`  \x1b[32m/kernel\x1b[0m            Boot Linux Agentic Kernel (/dev/llm0)`)
    console.log(`  \x1b[2m/clear, /help, /exit\x1b[0m`)
    console.log(`\x1b[36m${hr}\x1b[0m\n`)
  }

  public async start(): Promise<void> {
    this.drawHeader()

    this.rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout,
      prompt: '\x1b[1m\x1b[32momacode:~$ \x1b[0m'
    })

    this.rl.prompt()

    this.rl.on('line', async (line) => {
      const input = line.trim()
      if (!input) {
        this.rl?.prompt()
        return
      }

      if (this.isBusy) {
        console.log('\x1b[33m[BUSY] Previous task is still executing...\x1b[0m')
        return
      }

      this.isBusy = true

      try {
        if (input === '/exit' || input === 'exit' || input === ':q') {
          console.log('\n\x1b[33mExiting OmaCode TUI. Goodbye!\x1b[0m')
          this.rl?.close()
          process.exit(0)
        } else if (input === '/clear' || input === 'clear') {
          this.drawHeader()
        } else if (input === '/help' || input === 'help') {
          this.drawHeader()
        } else if (input === '/audit' || input.startsWith('/audit ')) {
          const targetDir = input.split(' ')[1] || this.workspaceDir
          console.log(`\n\x1b[1m\x1b[34m[SENSORY AUDITOR]\x1b[0m Inspecting target: ${targetDir}`)
          const proof = await this.auditor.auditWorkspace('tui-audit', targetDir, false)
          console.log(`  Proof ID:   ${proof.proofId}`)
          console.log(
            `  Verdict:    \x1b[32m${proof.status}\x1b[0m (${(proof.confidenceScore * 100).toFixed(0)}% confidence)`
          )
          console.log(`  Diagnostics: Syntax OK: ${proof.evidence.syntaxCheckPassed}, Typecheck OK: ${proof.evidence.typecheckPassed}`)
          console.log(`  Signature:  \x1b[33m${proof.signature}\x1b[0m\n`)
        } else if (input === '/clm') {
          console.log(`\n\x1b[1m\x1b[36m[CLM SYSTEM ONE RANKER]\x1b[0m Evaluating candidates with InfoNCE...`)
          const candidates: CandidateAction[] = [
            {
              id: 'cand-1',
              tool: 'edit',
              description: 'Surgical refactor in isolated CoW sandbox',
              parameters: { file: 'src/core.ts' },
              predictedOutcome: 'Clean build'
            },
            {
              id: 'cand-2',
              tool: 'bash',
              description: 'Run vitest on modified test suite',
              parameters: { command: 'bun test' },
              predictedOutcome: 'Verify tests'
            },
            {
              id: 'cand-distractor',
              tool: 'write',
              description: 'Blank wipe file (anti-pattern)',
              parameters: { file: 'src/core.ts', content: '""' },
              predictedOutcome: 'Broken file'
            }
          ]
          const res = this.clm.rankCandidates(`State: Interactive TUI session`, candidates)
          console.log(`  Evaluated in \x1b[32m${res.latencyMs}ms\x1b[0m:`)
          res.rankedCandidates.forEach((c) => {
            console.log(
              `   #${c.rank} [${c.candidateId}] Prob: \x1b[1m${(c.normalizedProb * 100).toFixed(1)}%\x1b[0m - ${c.rationale}`
            )
          })
          console.log(`  Winner: \x1b[32m${res.winner.description}\x1b[0m\n`)
        } else if (input.startsWith('/jepa')) {
          const cmd = input.slice(5).trim() || 'rm -rf node_modules'
          console.log(`\n\x1b[1m\x1b[35m[JEPA WORLD MODEL]\x1b[0m Evaluating: "${cmd}"`)
          const current = this.jepa.encodeWorkspace(30, false, 1.0, 0, 'Keep workspace stable')
          const goal = this.jepa.encodeWorkspace(30, false, 1.0, 0, 'Clean build')
          const act: CandidateAction = {
            id: 'jepa-test',
            tool: 'bash',
            description: cmd,
            parameters: { command: cmd },
            predictedOutcome: 'Unknown'
          }
          const pred = this.jepa.predictTransition(current, act, goal)
          console.log(`  Risk:        \x1b[${pred.interveneRequired ? '31m' : '32m'}${pred.riskAssessment}\x1b[0m`)
          console.log(`  Energy:      ${pred.energyScore} (Barrier: 0.72)`)
          console.log(`  Intervene:   \x1b[1m${pred.interveneRequired ? 'YES (BLOCKED)' : 'NO'}\x1b[0m`)
          console.log(`  Rationale:   ${pred.safetyRationale}\n`)
        } else if (input === '/kernel') {
          console.log(`\n\x1b[1m\x1b[32m[LINUX AGENTIC KERNEL]\x1b[0m Booting microkernel with /dev/llm0...`)
          const kernel = new AgenticLinuxKernel()
          const boot = await kernel.boot()
          console.log(`  Device Node: ${boot.device.deviceNode} (${boot.device.model})`)
          const pid = kernel.spawnProcess(1, 'tui_worker', 'Execute user task in kernel space')
          console.log(`  Spawned PID ${pid} (${kernel.ps().find((p) => p.pid === pid)?.name})`)
          console.log(`  Process Table (${kernel.ps().length} active PCBs):`)
          kernel.ps().forEach((p) => {
            console.log(`    PID ${p.pid} [${p.state}] priority=${p.priority} (${p.name})`)
          })
          console.log(`  Kernel boot verification complete.\n`)
        } else {
          // Standard Task Prompt: Run Full OmaCode Dual-Agent Loop!
          console.log(`\n\x1b[1m\x1b[32m[MISSION DISPATCH]\x1b[0m "${input}"`)
          console.log(`\x1b[2mExecuting Actor-Auditor verification loop with CoW sandboxing...\x1b[0m\n`)

          const report = await this.engine.executeTask(input, (step) => {
            const labels = {
              JEPA: '\x1b[35m[JEPA]\x1b[0m',
              CLM: '\x1b[36m[CLM]\x1b[0m',
              ACTOR: '\x1b[33m[ACTOR]\x1b[0m',
              AUDITOR: '\x1b[34m[AUDITOR]\x1b[0m',
              MERGE: '\x1b[32m[MERGE]\x1b[0m'
            }
            console.log(`  ${labels[step.phase]} (Turn ${step.turn}) ${step.message}`)
          })

          console.log(`\n\x1b[1mTask Result:\x1b[0m \x1b[32m${report.finalStatus}\x1b[0m in ${report.elapsedMs}ms`)
          console.log(`  Proof ID:   ${report.auditorProof.proofId}`)
          console.log(`  Confidence: ${(report.auditorProof.confidenceScore * 100).toFixed(0)}%`)
          console.log(`  Signature:  \x1b[33m${report.auditorProof.signature.slice(0, 24)}...\x1b[0m\n`)
        }
      } catch (err) {
        console.error('\x1b[31mError during execution:\x1b[0m', err)
      } finally {
        this.isBusy = false
        this.rl?.prompt()
      }
    })

    this.rl.on('close', () => {
      console.log('\x1b[33mSession closed.\x1b[0m')
      process.exit(0)
    })
  }
}

export async function runOmaCodeTui(dir: string = process.cwd()) {
  const tui = new OmaCodeTui(dir)
  await tui.start()
}

if (import.meta.main) {
  runOmaCodeTui().catch(console.error)
}
