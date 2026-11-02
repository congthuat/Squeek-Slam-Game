// Live Squeekchain telemetry (hamster wheel + block builder) proxied with a short cache.
const express = require('express')

const router = express.Router()

const CACHE_TTL_MS = 8000
const UPSTREAM_TIMEOUT_MS = 6000
let cache = { at: 0, data: null }

async function fetchJson(url) {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), UPSTREAM_TIMEOUT_MS)
  try {
    const resp = await fetch(url, { signal: controller.signal, headers: { accept: 'application/json' } })
    if (!resp.ok) throw new Error(`upstream_${resp.status}`)
    return await resp.json()
  } finally {
    clearTimeout(timer)
  }
}

// GET /api/chain/status
router.get('/status', async (_req, res) => {
  const now = Date.now()
  if (cache.data && now - cache.at < CACHE_TTL_MS) return res.json(cache.data)

  try {
    const [status, core] = await Promise.all([
      fetchJson('https://api.squeekchain.com/v1/status'),
      fetchJson('https://api.squeekchain.com/v1/core'),
    ])

    const measurement = status?.measurement ?? {}
    const anchor = status?.builder?.anchor ?? {}
    const chain = core?.chain ?? {}

    const data = {
      ok: true,
      fetchedAt: new Date().toISOString(),
      freshness: measurement.freshness ?? null,
      coreStatus: measurement.coreStatus ?? null,
      rpm: typeof measurement.rpmMilli === 'number' ? measurement.rpmMilli / 1000 : null,
      speedMmS: typeof measurement.speedMmPerSecond === 'number' ? measurement.speedMmPerSecond : null,
      distanceMm: typeof measurement.distanceMm === 'number' ? measurement.distanceMm : null,
      workUnits: measurement.cumulativeWorkUnits != null ? Number(measurement.cumulativeWorkUnits) : null,
      blockHeight: anchor.blockHeight != null ? Number(anchor.blockHeight) : null,
      chainId: chain.chainId ?? null,
      indexedThroughBlock: chain.indexedThroughBlock != null ? Number(chain.indexedThroughBlock) : null,
      observedAt: measurement.observedAt ?? null,
    }

    cache = { at: now, data }
    res.json(data)
  } catch (err) {
    console.error('[chain] upstream failed:', err.message)
    if (cache.data) return res.json({ ...cache.data, stale: true })
    res.status(502).json({ ok: false, error: 'chain_unreachable' })
  }
})

module.exports = router
