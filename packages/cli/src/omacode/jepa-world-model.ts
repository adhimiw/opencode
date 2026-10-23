/**
 * OmaCode JEPA (Joint Embedding Predictive Architecture) World Model
 * 
 * Based on Yann LeCun's World Model paradigm:
 * - Avoids fragile autoregressive token prediction for long-horizon planning.
 * - Encodes environment state (AST validity, dependency graph, test health) into latent space.
 * - Predicts future abstract latent representation given an action: s_{t+1} = Predictor(s_t, a_t).
 * - Computes an Energy Functional: Energy(s_{t+1}, goal).
 * - Preempts catastrophic drift and high-risk operations before execution.
 */

import {  type CandidateAction,  type JEPALatentVector,  type JEPAStatePrediction } from './types'

export class JEPAWorldModel {
  private latentDimensions: number = 64
  private safetyEnergyThreshold: number = 0.72 // Threshold above which intervention is required

  /**
   * Encodes the current workspace status into a compact latent vector
   */
  public encodeWorkspace(
    fileCount: number,
    hasSyntaxErrors: boolean,
    testPassRatio: number,
    uncommittedDiffLines: number,
    goalDescription: string
  ): JEPALatentVector {
    const features = new Array<number>(this.latentDimensions).fill(0)

    // Feature 0: Scale of repository
    features[0] = Math.min(1.0, fileCount / 500)
    // Feature 1: Syntax health (1.0 = clean, 0.0 = broken)
    features[1] = hasSyntaxErrors ? 0.0 : 1.0
    // Feature 2: Test pass ratio (0.0 to 1.0)
    features[2] = Math.max(0.0, Math.min(1.0, testPassRatio))
    // Feature 3: Mutation volatility
    features[3] = Math.min(1.0, uncommittedDiffLines / 1000)

    // Distribute goal text semantics across remaining latent dimensions
    const goalWords = goalDescription.toLowerCase().split(/\s+/)
    for (let i = 0; i < goalWords.length; i++) {
      const idx = 4 + (Math.abs(goalWords[i].charCodeAt(0) * 17) % (this.latentDimensions - 4))
      features[idx] += 0.25
    }

    // Normalize
    const norm = Math.sqrt(features.reduce((acc, v) => acc + v * v, 0)) || 1
    const normalized = features.map((v) => v / norm)

    const stateHash = normalized.slice(0, 8).map((v) => Math.round(v * 100)).join('-')

    return {
      dimensions: this.latentDimensions,
      features: normalized,
      stateHash
    }
  }

  /**
   * Predicts next latent state transition given proposed action
   */
  public predictTransition(
    currentState: JEPALatentVector,
    action: CandidateAction,
    goal: JEPALatentVector
  ): JEPAStatePrediction {
    const nextFeatures = [...currentState.features]
    let predictedRiskFactor = 0.0
    const reasons: string[] = []

    const strParams = JSON.stringify(action.parameters).toLowerCase()

    // Simulate action dynamics on latent dimensions
    if (action.tool === 'edit' || action.tool === 'write') {
      // Mutations increase volatility
      nextFeatures[3] = Math.min(1.0, nextFeatures[3] + 0.15)
      // Check for high-risk file targets
      if (strParams.includes('package.json') || strParams.includes('tsconfig') || strParams.includes('bun.lock')) {
        predictedRiskFactor += 0.35
        reasons.push('Action mutates core project configuration / lockfile')
      }
    } else if (action.tool === 'bash' || action.tool === 'shell') {
      if (strParams.includes('git clean') || strParams.includes('git reset') || strParams.includes('rm -rf')) {
        predictedRiskFactor += 0.75
        reasons.push('Action executes destructive unrecoverable filesystem command')
      }
      if (strParams.includes('install') || strParams.includes('add')) {
        predictedRiskFactor += 0.2
        reasons.push('Action introduces external third-party dependencies')
      }
    }

    // Compute energy distance to goal in latent space: || nextFeatures - goal.features ||^2
    let squaredDistance = 0
    for (let i = 0; i < this.latentDimensions; i++) {
      const diff = nextFeatures[i] - goal.features[i]
      squaredDistance += diff * diff
    }

    // Total Energy = latent distance + risk penalty
    const energyScore = Math.min(1.0, squaredDistance * 0.5 + predictedRiskFactor)

    let riskAssessment: 'STABLE' | 'MODERATE_DRIFT' | 'CATASTROPHIC_DRIFT' = 'STABLE'
    let interveneRequired = false

    if (energyScore > this.safetyEnergyThreshold) {
      riskAssessment = 'CATASTROPHIC_DRIFT'
      interveneRequired = true
    } else if (energyScore > 0.45) {
      riskAssessment = 'MODERATE_DRIFT'
    }

    const nextNorm = Math.sqrt(nextFeatures.reduce((acc, v) => acc + v * v, 0)) || 1
    const nextNormalized = nextFeatures.map((v) => v / nextNorm)

    const predictedNextLatent: JEPALatentVector = {
      dimensions: this.latentDimensions,
      features: nextNormalized,
      stateHash: nextNormalized.slice(0, 8).map((v) => Math.round(v * 100)).join('-')
    }

    return {
      currentStateLatent: currentState,
      predictedNextLatent,
      goalLatent: goal,
      energyScore: Math.round(energyScore * 1000) / 1000,
      riskAssessment,
      interveneRequired,
      safetyRationale: reasons.length > 0 ? reasons.join('; ') : 'Action predicted to remain within safe latent manifold'
    }
  }
}
