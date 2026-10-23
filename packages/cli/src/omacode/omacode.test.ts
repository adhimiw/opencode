import { describe, expect, test } from 'bun:test'
import { CLMVerifier } from './clm-verifier'
import { JEPAWorldModel } from './jepa-world-model'
import { AuditorJudge } from './auditor-judge'
import { HardwarePacer } from './hardware-pacing'
import { OmaCodeEngine } from './actor-auditor-loop'
import {  type CandidateAction } from './types'

describe('OmaCode Subsystems', () => {
  describe('CLMVerifier (Contrastive-LM InfoNCE)', () => {
    test('ranks candidates and normalizes probabilities', () => {
      const clm = new CLMVerifier(0.07)
      const candidates: CandidateAction[] = [
        {
          id: 'c1',
          tool: 'edit',
          description: 'Refactor user authentication service',
          parameters: { file: 'src/auth.ts' },
          predictedOutcome: 'Clean auth flow'
        },
        {
          id: 'c2',
          tool: 'read',
          description: 'Read existing test fixtures',
          parameters: { file: 'test/auth.test.ts' },
          predictedOutcome: 'Extract test expectations'
        }
      ]

      const result = clm.rankCandidates('State: Updating authentication logic', candidates)
      expect(result.rankedCandidates.length).toBe(2)
      expect(result.winner).toBeDefined()
      expect(result.rankedCandidates[0].rank).toBe(1)
      const sumProb = result.rankedCandidates.reduce((acc, r) => acc + r.normalizedProb, 0)
      expect(sumProb).toBeGreaterThanOrEqual(0.98)
      expect(sumProb).toBeLessThanOrEqual(1.02)
    })

    test('penalizes and suppresses hard negative anti-patterns', () => {
      const clm = new CLMVerifier(0.07)
      const candidates: CandidateAction[] = [
        {
          id: 'c-valid',
          tool: 'edit',
          description: 'Apply surgical bug fix',
          parameters: { file: 'src/app.ts', code: 'return true' },
          predictedOutcome: 'Fix bug'
        },
        {
          id: 'c-distractor',
          tool: 'write',
          description: 'Truncated empty overwrite',
          parameters: { file: 'src/app.ts', content: '""' },
          predictedOutcome: 'Wipe file'
        }
      ]

      const result = clm.rankCandidates('State: Bug report in app.ts', candidates)
      const distractor = result.rankedCandidates.find((c) => c.candidateId === 'c-distractor')
      expect(distractor).toBeDefined()
      expect(distractor?.isAntiPattern).toBe(true)
      expect(distractor?.normalizedProb).toBeLessThan(0.05)
      expect(result.winner.id).toBe('c-valid')
    })
  })

  describe('JEPAWorldModel (Latent State Transition & Energy)', () => {
    test('encodes workspace state into latent representation vector', () => {
      const jepa = new JEPAWorldModel()
      const latent = jepa.encodeWorkspace(30, false, 1.0, 0, 'Clean codebase')
      expect(latent.dimensions).toBe(64)
      expect(latent.features.length).toBe(64)
      expect(latent.stateHash).toBeDefined()
    })

    test('predicts stable energy for benign actions', () => {
      const jepa = new JEPAWorldModel()
      const current = jepa.encodeWorkspace(20, false, 1.0, 0, 'Implement feature')
      const goal = jepa.encodeWorkspace(20, false, 1.0, 0, 'Feature implemented')

      const action: CandidateAction = {
        id: 'act-safe',
        tool: 'read',
        description: 'Read project config',
        parameters: { file: 'package.json' },
        predictedOutcome: 'Get dependencies'
      }

      const prediction = jepa.predictTransition(current, action, goal)
      expect(prediction.riskAssessment).toBe('STABLE')
      expect(prediction.interveneRequired).toBe(false)
      expect(prediction.energyScore).toBeLessThan(0.5)
    })

    test('intervenes and flags catastrophic drift on dangerous commands', () => {
      const jepa = new JEPAWorldModel()
      const current = jepa.encodeWorkspace(20, false, 1.0, 0, 'Normal work')
      const goal = jepa.encodeWorkspace(20, false, 1.0, 0, 'Normal work done')

      const destructiveAction: CandidateAction = {
        id: 'act-danger',
        tool: 'bash',
        description: 'Dangerous wipe',
        parameters: { command: 'rm -rf / --no-preserve-root' },
        predictedOutcome: 'Destruction'
      }

      const prediction = jepa.predictTransition(current, destructiveAction, goal)
      expect(prediction.riskAssessment).toBe('CATASTROPHIC_DRIFT')
      expect(prediction.interveneRequired).toBe(true)
      expect(prediction.energyScore).toBeGreaterThanOrEqual(0.72)
    })
  })

  describe('AuditorJudge (Orthogonal Sensory Auditor)', () => {
    test('generates cryptographically signed AuditProof', async () => {
      const auditor = new AuditorJudge(process.cwd())
      const proof = await auditor.auditWorkspace('test-action-123', process.cwd(), false)

      expect(proof.proofId).toMatch(/^proof-/)
      expect(proof.signature).toHaveLength(64) // sha256 hex
      expect(proof.confidenceScore).toBeGreaterThan(0.5)
      expect(proof.evidence).toBeDefined()
      expect(proof.status).toBe('VERIFIED')
    })
  })

  describe('HardwarePacer', () => {
    test('paces operations and refills tokens', async () => {
      const pacer = new HardwarePacer({
        maxOpsPerSecond: 100,
        streamDrainTimeoutMs: 5,
        enableHardwarePacing: true
      })

      const waitTime = await pacer.paceOperation()
      expect(waitTime).toBeGreaterThanOrEqual(5)
    })
  })

  describe('OmaCodeEngine (Full Dual-Agent Loop)', () => {
    test('executes end-to-end task with verification and CoW merge', async () => {
      const engine = new OmaCodeEngine({
        workspaceDir: process.cwd(),
        maxTurns: 2,
        enablePacing: false,
        runTestSuite: false
      })

      const stepsRecorded: string[] = []
      const report = await engine.executeTask('Refactor modular components', (step) => {
        stepsRecorded.push(`${step.phase}:${step.turn}`)
      })

      expect(report.sessionId).toMatch(/^oma-/)
      expect(report.finalStatus).toBe('SUCCESS_MERGED')
      expect(report.totalTurns).toBeGreaterThanOrEqual(1)
      expect(report.auditorProof).toBeDefined()
      expect(report.auditorProof.status).toBe('VERIFIED')
      expect(stepsRecorded.some((s) => s.startsWith('JEPA'))).toBe(true)
      expect(stepsRecorded.some((s) => s.startsWith('CLM'))).toBe(true)
      expect(stepsRecorded.some((s) => s.startsWith('AUDITOR'))).toBe(true)
    })
  })
})
