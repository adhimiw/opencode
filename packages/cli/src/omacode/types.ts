/**
 * OmaCode Core Type Definitions
 * 
 * Synthesizing:
 * 1. Oligarchy Actor-Auditor Pattern (Separation of Agency, Phenomenological Truth, CoW Overlays)
 * 2. Contrastive Language Models (CLM - InfoNCE State-Action Disaggregated Scoring & Verification)
 * 3. Joint Embedding Predictive Architecture (JEPA - Latent State World Model & Risk Energy)
 * 4. Hardware Pacing & Rate Limiting
 */

export type AuditStatus = 'VERIFIED' | 'REJECTED' | 'WARNING' | 'HALTED'

export interface SensoryEvidence {
  syntaxCheckPassed: boolean
  typecheckPassed: boolean
  testsPassed: boolean
  testExitCode?: number
  testOutputSummary?: string
  diagnosticsCount: number
  diffStats: {
    filesChanged: number
    insertions: number
    deletions: number
  }
  securityAuditPassed: boolean
  runtimePerception?: string
}

export interface AuditProof {
  proofId: string
  timestamp: number
  targetWorkspace: string
  sandboxBranch: string
  actorActionId: string
  evidence: SensoryEvidence
  confidenceScore: number // 0.0 to 1.0
  status: AuditStatus
  orthogonalVerdict: string
  signature: string // Cryptographic or SHA256 integrity hash
}

export interface CandidateAction {
  id: string
  tool: string
  description: string
  parameters: Record<string, unknown>
  predictedOutcome: string
  antiPatternRisks?: string[]
}

export interface CLMScore {
  candidateId: string
  rawScore: number
  normalizedProb: number
  rank: number
  isAntiPattern: boolean
  rationale: string
}

export interface CLMRankResult {
  stateSummary: string
  rankedCandidates: CLMScore[]
  winner: CandidateAction
  distractorPenaltyApplied: boolean
  latencyMs: number
}

export interface JEPALatentVector {
  dimensions: number
  features: number[]
  stateHash: string
}

export interface JEPAStatePrediction {
  currentStateLatent: JEPALatentVector
  predictedNextLatent: JEPALatentVector
  goalLatent: JEPALatentVector
  energyScore: number // Lower is closer to goal
  riskAssessment: 'STABLE' | 'MODERATE_DRIFT' | 'CATASTROPHIC_DRIFT'
  interveneRequired: boolean
  safetyRationale: string
}

export interface CoWSandboxState {
  sandboxId: string
  baseCommit: string
  worktreePath: string
  branchName: string
  createdAt: number
  isClean: boolean
  activeDiffs: string[]
}

export interface HardwarePacerConfig {
  maxOpsPerSecond: number
  streamDrainTimeoutMs: number
  ioBackpressureThresholdBytes: number
  enableHardwarePacing: boolean
}

export interface OmaCodeExecutionReport {
  sessionId: string
  taskPrompt: string
  totalTurns: number
  jepaTransitions: JEPAStatePrediction[]
  clmVerifications: CLMRankResult[]
  actorActionsExecuted: CandidateAction[]
  auditorProof: AuditProof
  finalStatus: 'SUCCESS_MERGED' | 'AUDIT_REJECTED_TRASHED' | 'EARLY_HALTED'
  elapsedMs: number
}
