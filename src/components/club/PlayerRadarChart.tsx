import type { RadarAxis } from '../../lib/playerProfileStats'

interface PlayerRadarChartProps {
  axes: RadarAxis[]
  className?: string
}

const CX = 120
const CY = 120
const R = 72

function point(angle: number, radius: number): { x: number; y: number } {
  const rad = ((angle - 90) * Math.PI) / 180
  return { x: CX + radius * Math.cos(rad), y: CY + radius * Math.sin(rad) }
}

function polygonPath(values: number[], maxR: number): string {
  const step = 360 / values.length
  return values
    .map((v, i) => {
      const { x, y } = point(i * step, (v / 100) * maxR)
      return `${i === 0 ? 'M' : 'L'} ${x} ${y}`
    })
    .join(' ') + ' Z'
}

export function PlayerRadarChart({ axes, className = '' }: PlayerRadarChartProps) {
  const step = 360 / axes.length
  const gridLevels = [25, 50, 75, 100]

  return (
    <div className={className}>
      <svg viewBox="0 0 240 240" className="w-full max-w-[260px] mx-auto" aria-hidden>
        {gridLevels.map((level) => (
          <polygon
            key={level}
            points={axes
              .map((_, i) => {
                const { x, y } = point(i * step, (level / 100) * R)
                return `${x},${y}`
              })
              .join(' ')}
            fill="none"
            stroke="rgba(43, 95, 192, 0.12)"
            strokeWidth="1"
          />
        ))}

        {axes.map((_, i) => {
          const { x, y } = point(i * step, R)
          return <line key={i} x1={CX} y1={CY} x2={x} y2={y} stroke="rgba(43, 95, 192, 0.15)" strokeWidth="1" />
        })}

        <path
          d={polygonPath(
            axes.map((a) => a.value),
            R
          )}
          fill="rgba(43, 95, 192, 0.2)"
          stroke="#2B5FC0"
          strokeWidth="2"
        />

        {axes.map((axis, i) => {
          const { x, y } = point(i * step, R + 18)
          return (
            <text
              key={axis.label}
              x={x}
              y={y}
              textAnchor="middle"
              dominantBaseline="middle"
              className="fill-brand-navy text-[9px] font-semibold"
              style={{ fontSize: 9 }}
            >
              {axis.label}
            </text>
          )
        })}
      </svg>

      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 mt-4">
        {axes.map((axis) => (
          <div key={axis.label} className="text-center">
            <p className="font-display text-lg font-bold text-brand-blue">{axis.raw}</p>
            <p className="text-[10px] uppercase tracking-wide text-gray-500">{axis.label}</p>
          </div>
        ))}
      </div>
    </div>
  )
}
