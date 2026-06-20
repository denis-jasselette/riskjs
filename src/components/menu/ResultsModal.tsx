import { useEffect, useRef, useState } from 'react'

import style from '@/components/menu/ResultsModal.module.scss'
import { TROOP_COLORS } from '@/lib/troopColors'
import PlayerConfig from '@/models/PlayerConfig'
import { PlayerStanding, TurnSnapshot } from '@/models/ResultsData'

export type ResultsModalProps = {
  /** Null while game is still in progress. */
  winner: PlayerConfig | null
  standings: PlayerStanding[]
  localPlayer: PlayerConfig
  fogOfWar: boolean
  /** Total turns the game lasted (or turns elapsed so far). */
  totalTurns: number
  history?: TurnSnapshot[]
  onPlayAgain: () => void
  onQuit: () => void
  /** Called when the Spectate button is clicked. Only relevant mid-game. */
  onSpectate?: () => void
}

type Tab = 'standings' | 'troops' | 'territories'

const TABS: { id: Tab, label: string }[] = [
  { id: 'standings', label: 'Standings' },
  { id: 'troops', label: 'Troops over time' },
  { id: 'territories', label: 'Territories over time' },
]

export default function ResultsModal({
  winner,
  standings,
  localPlayer,
  fogOfWar,
  totalTurns,
  history,
  onPlayAgain,
  onQuit,
  onSpectate,
}: ResultsModalProps) {
  const dialogRef = useRef<HTMLDialogElement>(null)
  const [activeTab, setActiveTab] = useState<Tab>('standings')

  const gameOver = winner !== null
  const localStanding = standings.find(s => s.player.color === localPlayer.color)
  const localEliminated = localStanding != null && localStanding.territories === null

  useEffect(() => {
    dialogRef.current?.showModal()
  }, [])

  return (
    <dialog ref={dialogRef} className={style.dialog}>
      <Hero
        winner={winner}
        localPlayer={localPlayer}
        localEliminated={localEliminated}
        gameOver={gameOver}
        totalTurns={totalTurns}
        localStanding={localStanding}
        fogOfWar={fogOfWar}
        onSpectate={onSpectate}
      />

      <div className={style.tabs}>
        {TABS.map(t => (
          <button
            key={t.id}
            className={`${style.tab}${activeTab === t.id ? ` ${style.active}` : ''}`}
            onClick={() => setActiveTab(t.id)}
          >
            {t.label}
          </button>
        ))}
      </div>

      <div className={style.tabBody}>
        {activeTab === 'standings' && (
          <StandingsTable
            standings={standings}
            localPlayer={localPlayer}
            gameOver={gameOver}
            fogOfWar={fogOfWar}
          />
        )}
        {activeTab === 'troops' && (
          <HistoryChart
            history={history}
            standings={standings}
            metric="troops"
          />
        )}
        {activeTab === 'territories' && (
          <HistoryChart
            history={history}
            standings={standings}
            metric="territories"
          />
        )}
      </div>

      <div className={style.footer}>
        <button className={style.playAgainBtn} onClick={onPlayAgain}>
          ▶ Play again
        </button>
        <button className={style.quitBtn} onClick={onQuit}>
          ✕ Quit
        </button>
      </div>
    </dialog>
  )
}

/* ── Hero ─────────────────────────────────────────────── */

type HeroProps = {
  winner: PlayerConfig | null
  localPlayer: PlayerConfig
  localEliminated: boolean
  gameOver: boolean
  totalTurns: number
  localStanding?: PlayerStanding
  fogOfWar: boolean
  onSpectate?: () => void
}

function Hero({
  winner,
  localPlayer,
  localEliminated,
  gameOver,
  totalTurns,
  localStanding,
  fogOfWar,
  onSpectate,
}: HeroProps) {
  if (gameOver && winner) {
    const winnerColor = TROOP_COLORS[winner.color]
    const isLocalWinner = winner.color === localPlayer.color
    return (
      <div className={style.hero}>
        <div className={style.heroBlur} />
        <div className={style.heroContent}>
          <div className={style.heroIcon}>🏆</div>
          <div className={style.heroTitle}>
            <span className={style.heroColorDot} style={{ background: winnerColor }} />
            <span style={{ color: winnerColor }}>
              {isLocalWinner ? 'You win!' : `${winner.name} wins!`}
            </span>
          </div>
          <div className={style.heroSub}>
            Conquered all 42 territories ·
            {' '}
            {totalTurns}
            {' '}
            turns
          </div>
        </div>
      </div>
    )
  }

  // Eliminated mid-game
  const eliminationTurn = localStanding?.turnsAlive ?? '?'
  return (
    <div className={style.hero}>
      <div className={style.heroBlur} />
      <div className={style.heroContent}>
        <div className={style.heroIcon}>💀</div>
        <div className={style.heroTitle} style={{ color: 'rgba(255,255,255,0.55)' }}>
          {localEliminated ? 'You were eliminated' : 'Game in progress'}
        </div>
        {localEliminated && (
          <div className={style.heroSub}>
            Turn
            {' '}
            {eliminationTurn}
            {' '}
            · game still in progress
          </div>
        )}
        {localEliminated && (
          <>
            <button
              className={style.spectateBtn}
              onClick={fogOfWar ? undefined : onSpectate}
              disabled={fogOfWar}
            >
              👁 Spectate
            </button>
            {fogOfWar && (
              <div className={style.fogHint}>Unavailable — fog of war is on</div>
            )}
          </>
        )}
      </div>
    </div>
  )
}

/* ── Standings table ───────────────────────────────────── */

type StandingsTableProps = {
  standings: PlayerStanding[]
  localPlayer: PlayerConfig
  gameOver: boolean
  fogOfWar: boolean
}

function StandingsTable({ standings, localPlayer, gameOver, fogOfWar }: StandingsTableProps) {
  return (
    <table className={style.table}>
      <thead className={style.tableHeader}>
        <tr>
          <th />
          <th style={{ textAlign: 'left' }}>Player</th>
          <th>Terr.</th>
          <th>Troops</th>
          <th>Turns</th>
          <th>Rating</th>
        </tr>
      </thead>
      <tbody>
        {standings.map((s) => {
          const isLocal = s.player.color === localPlayer.color
          const isEliminated = s.territories === null
          const isActiveOpponent = !isEliminated && !isLocal
          const hideStats = isActiveOpponent && fogOfWar

          return (
            <tr
              key={s.player.color}
              className={`${style.tableRow}${isLocal ? ` ${style.youRow}` : ''}`}
            >
              <td>
                <span className={`${style.rank} ${rankClass(s.rank)}`}>{s.rank}</span>
              </td>
              <td>
                <div className={style.playerCell}>
                  <span
                    className={style.colorDot}
                    style={{ background: TROOP_COLORS[s.player.color] }}
                  />
                  <span className={`${style.playerName}${isLocal ? ` ${style.you}` : ''}`}>
                    {s.player.name}
                    {isLocal ? ' (You)' : ''}
                  </span>
                </div>
              </td>
              <td className={isEliminated || hideStats ? style.dimCell : ''}>
                {hideStats ? '?' : isEliminated ? '—' : s.territories}
              </td>
              <td className={isEliminated || hideStats ? style.dimCell : ''}>
                {hideStats ? '?' : isEliminated ? '—' : s.troops}
              </td>
              <td className={!isEliminated && !gameOver ? style.dimCell : ''}>
                {!isEliminated && !gameOver ? '—' : s.turnsAlive}
              </td>
              <td>
                <RatingCell standing={s} gameOver={gameOver} isLocal={isLocal} />
              </td>
            </tr>
          )
        })}
      </tbody>
    </table>
  )
}

function rankClass(rank: number) {
  if (rank === 1) return style.rank1
  if (rank === 2) return style.rank2
  if (rank === 3) return style.rank3
  return ''
}

type RatingCellProps = {
  standing: PlayerStanding
  gameOver: boolean
  isLocal: boolean
}

function RatingCell({ standing, gameOver, isLocal }: RatingCellProps) {
  const { rating, ratingDelta } = standing
  const isEliminated = standing.territories === null

  // Active opponent mid-game: hide rating
  if (!isEliminated && !isLocal && !gameOver) {
    return <span className={style.mutedCell}>in game</span>
  }

  if (rating == null) return <span className={style.dimCell}>—</span>

  return (
    <div className={style.ratingCell}>
      <span className={style.ratingVal}>{rating.toLocaleString()}</span>
      {ratingDelta != null && (
        <span className={`${style.ratingDelta} ${ratingDelta >= 0 ? style.pos : style.neg}`}>
          {ratingDelta >= 0 ? '+' : ''}
          {ratingDelta}
        </span>
      )}
    </div>
  )
}

/* ── History chart ─────────────────────────────────────── */

type HistoryChartProps = {
  history?: TurnSnapshot[]
  standings: PlayerStanding[]
  metric: 'troops' | 'territories'
}

const CHART_W = 300
const CHART_H = 80

function HistoryChart({ history, standings, metric }: HistoryChartProps) {
  if (!history || history.length === 0) {
    return (
      <div style={{ color: 'rgba(255,255,255,0.25)', fontSize: '0.75rem', textAlign: 'center', padding: '24px 0' }}>
        No history recorded yet
      </div>
    )
  }

  const getVal = (h: TurnSnapshot, color: string) => {
    const map = h[metric as keyof TurnSnapshot] as Partial<Record<string, number>>
    return map[color] ?? 0
  }

  const maxVal = Math.max(
    1,
    ...history.map(h => Math.max(...standings.map(s => getVal(h, s.player.color)))),
  )

  const xStep = CHART_W / Math.max(1, history.length - 1)

  return (
    <>
      <svg className={style.chart} viewBox={`0 0 ${CHART_W} ${CHART_H + 10}`} xmlns="http://www.w3.org/2000/svg">
        {/* grid lines */}
        {[0, 0.25, 0.5, 0.75, 1].map(frac => (
          <line
            key={frac}
            x1={0}
            y1={CHART_H * (1 - frac)}
            x2={CHART_W}
            y2={CHART_H * (1 - frac)}
            stroke="rgba(255,255,255,0.06)"
            strokeWidth={1}
          />
        ))}

        {standings.map((s) => {
          const isEliminated = s.territories === null
          const pts = history
            .map((h, i) => {
              const v = getVal(h, s.player.color)
              const x = i * xStep
              const y = CHART_H - (v / maxVal) * CHART_H
              return `${x},${y}`
            })
            .join(' ')

          // find elimination point index
          const elimIdx = history.findIndex(h => getVal(h, s.player.color) === 0)

          return (
            <g key={s.player.color}>
              <polyline
                points={pts}
                fill="none"
                stroke={TROOP_COLORS[s.player.color]}
                strokeWidth={isEliminated ? 1.5 : 2}
                strokeLinejoin="round"
                strokeDasharray={isEliminated ? '3 2' : undefined}
              />
              {isEliminated && elimIdx > 0 && (
                <line
                  x1={elimIdx * xStep}
                  y1={0}
                  x2={elimIdx * xStep}
                  y2={CHART_H}
                  stroke={TROOP_COLORS[s.player.color]}
                  strokeWidth={1}
                  strokeDasharray="2 3"
                  opacity={0.4}
                />
              )}
            </g>
          )
        })}

        <text x={CHART_W / 2} y={CHART_H + 9} fill="rgba(255,255,255,0.2)" fontSize={7} textAnchor="middle">
          Turn →
        </text>
      </svg>

      <div className={style.chartLegend}>
        {standings.map(s => (
          <div key={s.player.color} className={style.legendItem}>
            <svg width={14} height={2} style={{ flexShrink: 0 }}>
              <line
                x1={0}
                y1={1}
                x2={14}
                y2={1}
                stroke={TROOP_COLORS[s.player.color]}
                strokeWidth={s.territories === null ? 1.5 : 2}
                strokeDasharray={s.territories === null ? '3 2' : undefined}
              />
            </svg>
            {s.player.name}
          </div>
        ))}
      </div>
    </>
  )
}
