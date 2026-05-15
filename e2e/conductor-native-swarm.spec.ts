import { test, expect } from '@playwright/test'
import { execSync } from 'child_process'

/**
 * Helper: poll until a condition is met or timeout.
 * Uses bare setTimeout/Promise, not Playwright-specific APIs.
 */
async function poll(
  fn: () => Promise<{ done: boolean; info?: string }>,
  timeoutMs = 120_000,
  intervalMs = 5_000,
): Promise<void> {
  const deadline = Date.now() + timeoutMs
  while (Date.now() < deadline) {
    const result = await fn()
    if (result.done) return
    await new Promise((resolve) => setTimeout(resolve, intervalMs))
  }
  const last = await fn()
  if (!last.done) throw new Error(`Polling timed out after ${timeoutMs}ms: ${last.info ?? 'no info'}`)
}

/**
 * Test: GET /api/conductor-spawn returns completed mission with checkpoints
 *
 * Launches a native-swarm mission via the POST endpoint, then polls the GET
 * endpoint until the mission transitions to "completed" with worker checkpoints.
 * Verifies the full lifecycle works end-to-end.
 */
test('GET /api/conductor-spawn returns completed mission with checkpoints', async ({ request }) => {
  // Clean any stale tmux sessions from previous runs
  try {
    execSync('tmux kill-session -t swarm-swarm2 2>/dev/null', { stdio: 'ignore' })
  } catch { /* ok */ }

  // Launch a native-swarm mission via the API
  const spawnRes = await request.post('/api/conductor-spawn', {
    data: {
      goal: 'Test API native-swarm: run echo api-test-ok',
      maxParallel: 1,
    },
  })
  expect(spawnRes.ok()).toBe(true)
  const spawnBody = await spawnRes.json()
  expect(spawnBody.ok).toBe(true)
  expect(spawnBody.mode).toBe('native-swarm')
  expect(spawnBody.assignments?.length).toBeGreaterThanOrEqual(1)

  const missionId: string = spawnBody.jobId
  console.log(`Launched mission: ${missionId}, worker: ${spawnBody.assignments[0].workerId}`)

  // Poll the GET endpoint until the mission is completed
  await poll(async () => {
    const pollRes = await request.get(`/api/conductor-spawn?missionId=${encodeURIComponent(missionId)}`)
    if (!pollRes.ok()) return { done: false, info: `HTTP ${pollRes.status()}` }

    const pollBody = await pollRes.json()
    const mission = pollBody.mission ?? {}
    const status = mission.status ?? 'unknown'
    const assignments = mission.assignments ?? []
    const workerStates = assignments
      .map((a: { workerId: string; state: string }) => `${a.workerId}=${a.state}`)
      .join(', ')

    if (status === 'completed') {
      return { done: true, info: `status=${status}` }
    }
    if (assignments.some((a: { state: string }) => a.state === 'checkpointed' || a.state === 'done')) {
      return { done: true, info: `workers=[${workerStates}]` }
    }
    return { done: false, info: `status=${status} workers=[${workerStates}]` }
  }, 180_000)

  // Fetch final state and verify checkpoints
  const finalRes = await request.get(`/api/conductor-spawn?missionId=${encodeURIComponent(missionId)}`)
  expect(finalRes.ok()).toBe(true)
  const finalBody = await finalRes.json()
  const finalMission = finalBody.mission ?? {}

  expect(finalMission.status).toBe('completed')

  for (const assignment of finalMission.assignments ?? []) {
    expect(assignment.state).toMatch(/checkpointed|done/)
    if (assignment.checkpoint) {
      expect(assignment.checkpoint.stateLabel).toBe('DONE')
      console.log(`Worker ${assignment.workerId}: ${assignment.checkpoint.stateLabel} — ${assignment.checkpoint.result}`)
    }
  }

  // Clean up tmux session
  try {
    execSync('tmux kill-session -t swarm-swarm2 2>/dev/null', { stdio: 'ignore' })
  } catch { /* ok */ }
})
