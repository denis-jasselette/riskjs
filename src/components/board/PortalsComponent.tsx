import { useContext } from 'preact/hooks'

import GameContext from '@/components/GameContext'

export const PortalsComponent = () => {
  const { gameState } = useContext(GameContext)
  const portals = gameState.portals ?? gameState.mapConfig.portals ?? []
  const territories = gameState.mapConfig.territories

  return (
    <>
      {portals.map(([a, b]) => {
        const coordsA = territories[a]?.coords
        const coordsB = territories[b]?.coords
        if (!coordsA || !coordsB)
          return null

        const mx = (coordsA.x + coordsB.x) / 2
        const my = (coordsA.y + coordsB.y) / 2

        return (
          <g key={`${a}-${b}`}>
            <line
              x1={coordsA.x}
              y1={coordsA.y}
              x2={coordsB.x}
              y2={coordsB.y}
              stroke="#c084fc"
              strokeWidth="2"
              strokeDasharray="6 3"
              strokeLinecap="round"
              opacity="0.85"
            />
            <circle cx={coordsA.x} cy={coordsA.y} r="4" fill="#c084fc" stroke="#7c3aed" strokeWidth="1.5" />
            <circle cx={coordsB.x} cy={coordsB.y} r="4" fill="#c084fc" stroke="#7c3aed" strokeWidth="1.5" />
            <text
              x={mx}
              y={my - 5}
              textAnchor="middle"
              fontSize="8"
              fill="#7c3aed"
              fontWeight="bold"
              paintOrder="stroke"
              stroke="#fff"
              strokeWidth="2"
            >
              ⟡
            </text>
          </g>
        )
      })}
    </>
  )
}
