/**
 * OmaCode Copy-on-Write (CoW) Sandbox Manager
 * 
 * Embodies Oligarchy's Ephemeral Divergence:
 * - "Mint the baseline, branch cheaply, trash freely."
 * - Actor works entirely within an ephemeral micro-sandbox / branch.
 * - Auditor inspects changes externally before granting merge rights.
 * - Fast-forward on verification, instant zero-cost wipeout on rejection.
 */

import fs from 'fs'
import path from 'path'
import { execSync } from 'child_process'
import { CoWSandboxState } from './types'

export class CoWSandboxManager {
  private baseDir: string
  private sandboxesRoot: string

  constructor(workspaceDir: string) {
    this.baseDir = path.resolve(workspaceDir)
    this.sandboxesRoot = path.join(this.baseDir, '.omacode', 'sandboxes')
  }

  /**
   * Initializes sandbox storage directory
   */
  private ensureSandboxDir(): void {
    if (!fs.existsSync(this.sandboxesRoot)) {
      fs.mkdirSync(this.sandboxesRoot, { recursive: true })
    }
  }

  /**
   * Mints an ephemeral micro-sandbox for the Actor
   */
  public createSandbox(actionId: string): CoWSandboxState {
    this.ensureSandboxDir()

    const sandboxId = `cow-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`
    const worktreePath = path.join(this.sandboxesRoot, sandboxId)
    const branchName = `omacode-overlay/${sandboxId}`

    let baseCommit = 'uncommitted-head'

    try {
      // Check if git is initialized
      const isGit = fs.existsSync(path.join(this.baseDir, '.git'))
      if (isGit) {
        baseCommit = execSync('git rev-parse --short HEAD', { cwd: this.baseDir, stdio: 'pipe' })
          .toString()
          .trim()

        // Create ephemeral worktree
        execSync(`git worktree add -b ${branchName} "${worktreePath}" HEAD`, {
          cwd: this.baseDir,
          stdio: 'pipe'
        })
      } else {
        // Fallback: directory copy overlay
        fs.mkdirSync(worktreePath, { recursive: true })
      }
    } catch {
      // Fallback: lightweight isolated scratch folder
      if (!fs.existsSync(worktreePath)) {
        fs.mkdirSync(worktreePath, { recursive: true })
      }
    }

    return {
      sandboxId,
      baseCommit,
      worktreePath,
      branchName,
      createdAt: Date.now(),
      isClean: true,
      activeDiffs: []
    }
  }

  /**
   * Collects file diffs from the ephemeral sandbox
   */
  public inspectDiffs(sandbox: CoWSandboxState): { filesChanged: number; diffOutput: string } {
    try {
      if (fs.existsSync(path.join(this.baseDir, '.git'))) {
        const diff = execSync('git status --short', { cwd: sandbox.worktreePath, stdio: 'pipe' })
          .toString()
          .trim()
        const lines = diff.split('\n').filter(Boolean)
        return {
          filesChanged: lines.length,
          diffOutput: diff
        }
      }
    } catch {
      // Fallback
    }

    return {
      filesChanged: sandbox.activeDiffs.length,
      diffOutput: sandbox.activeDiffs.join('\n')
    }
  }

  /**
   * Commits and merges verified changes into the primary workspace
   */
  public commitVerified(sandbox: CoWSandboxState, proofSignature: string): boolean {
    try {
      const isGit = fs.existsSync(path.join(this.baseDir, '.git'))
      if (isGit) {
        // Stage & commit in the worktree
        execSync(`git add -A && git commit -m "omacode(verified): ${proofSignature.slice(0, 12)}"`, {
          cwd: sandbox.worktreePath,
          stdio: 'pipe'
        })

        // Merge branch into primary workspace
        execSync(`git merge --ff-only ${sandbox.branchName}`, {
          cwd: this.baseDir,
          stdio: 'pipe'
        })
      }
      this.trashOverlay(sandbox)
      return true
    } catch {
      this.trashOverlay(sandbox)
      return false
    }
  }

  /**
   * Discards the ephemeral sandbox cleanly with zero collateral damage
   */
  public trashOverlay(sandbox: CoWSandboxState): void {
    try {
      const isGit = fs.existsSync(path.join(this.baseDir, '.git'))
      if (isGit) {
        try {
          execSync(`git worktree remove --force "${sandbox.worktreePath}"`, {
            cwd: this.baseDir,
            stdio: 'pipe'
          })
          execSync(`git branch -D ${sandbox.branchName}`, {
            cwd: this.baseDir,
            stdio: 'pipe'
          })
        } catch {
          // Ignore worktree remove errors
        }
      }

      if (fs.existsSync(sandbox.worktreePath)) {
        fs.rmSync(sandbox.worktreePath, { recursive: true, force: true })
      }
    } catch {
      // Best effort cleanup
    }
  }
}
