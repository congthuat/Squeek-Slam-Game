import { useQuery } from '@tanstack/react-query'
import { api } from '../lib/api'
import { useI18n } from '../lib/i18n'

interface ChainStatusData {
  ok?: boolean
  freshness?: string | null
  coreStatus?: string | null
  rpm?: number | null
  distanceMm?: number | null
  workUnits?: number | null
  blockHeight?: number | null
  stale?: boolean
  observedAt?: string | null
}

export default function ChainStatus() {
  const { t } = useI18n()
  const { data, isError } = useQuery<ChainStatusData>({
    queryKey: ['chain-status'],
    queryFn: async () => {
      const res = await fetch(api('chain/status'))
      if (!res.ok) throw new Error('chain_status_failed')
      return res.json()
    },
    refetchInterval: 10_000,
  })

  const online = !isError && data?.ok === true && data?.freshness === 'online'
  const running = data?.coreStatus === 'RUNNING'
  const block = typeof data?.blockHeight === 'number' ? data.blockHeight : null
  const rpm = typeof data?.rpm === 'number' ? data.rpm : null
  const km = typeof data?.distanceMm === 'number' ? data.distanceMm / 1_000_000 : null
  const work = typeof data?.workUnits === 'number' ? data.workUnits : null

  const dotClass = online
    ? 'bg-emerald-400'
    : data?.ok === true
      ? 'bg-amber-400'
      : isError
        ? 'bg-zinc-600'
        : 'animate-pulse bg-zinc-600'

  return (
    <div className="flex flex-col gap-1 lg:items-end">
      <div className="flex items-center gap-2">
        <span className={`h-2 w-2 shrink-0 rounded-full ${dotClass}`} />
        <span className="text-xs font-semibold text-zinc-300">Squeekchain Sepolia</span>
        {block != null && (
          <span className="font-mono text-xs text-zinc-500">#{block.toLocaleString('en-US')}</span>
        )}
      </div>
      <div className="text-[11px] text-zinc-500">
        {isError || data?.ok === false ? (
          t('chain.offline')
        ) : !data ? (
          <span className="font-mono">…</span>
        ) : (
          <span className="flex flex-wrap items-center gap-x-1.5">
            <span>🐹 {running ? t('chain.running') : t('chain.idle')}</span>
            {rpm != null && (
              <span>
                · <span className="font-mono">{rpm.toFixed(1)}</span> RPM
              </span>
            )}
            {km != null && (
              <span>
                · <span className="font-mono">{km.toFixed(1)}</span> km
              </span>
            )}
            {work != null && (
              <span>
                · <span className="font-mono">{work.toLocaleString('en-US')}</span> {t('chain.work')}
              </span>
            )}
          </span>
        )}
      </div>
    </div>
  )
}
