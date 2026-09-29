import { EDA_STATS, STAT_LABELS, STAT_LABELS_SHORT } from "@/data/eda-stats";

// Same red/blue as UFC_RED/UFC_BLUE in chart-setup.ts, inlined here so this
// (server-renderable) component doesn't pull in the "use client" chart setup.
const RED_RGB = "224, 33, 45";
const BLUE_RGB = "59, 130, 246";

// Diverging scale: red = positive, blue = negative, neutral (transparent) at 0.
function cellColor(v: number) {
  const alpha = Math.min(Math.abs(v), 1) * 0.85;
  return v >= 0 ? `rgba(${RED_RGB}, ${alpha})` : `rgba(${BLUE_RGB}, ${alpha})`;
}

const LEGEND_STEPS = [-1, -0.5, 0, 0.5, 1];

function ColorLegend() {
  return (
    <div className="mt-4 flex flex-col items-center gap-1">
      <div
        className="h-2.5 w-full max-w-xs rounded-full"
        style={{
          background: `linear-gradient(to right, rgba(${BLUE_RGB}, 0.85), rgba(${BLUE_RGB}, 0), rgba(${RED_RGB}, 0), rgba(${RED_RGB}, 0.85))`,
        }}
      />
      <div className="flex w-full max-w-xs justify-between text-[0.65rem] tabular-nums text-neutral-500">
        {LEGEND_STEPS.map((s) => (
          <span key={s}>{s.toFixed(1)}</span>
        ))}
      </div>
    </div>
  );
}

// Lower triangle only, as in the notebook (the matrix is symmetric).
export function CorrelationHeatmap() {
  const { features, matrix } = EDA_STATS.correlation;
  return (
    <div className="flex flex-col items-center">
      <div className="w-full overflow-x-auto">
        <table className="mx-auto border-separate border-spacing-0.5 text-xs">
          <thead>
            <tr>
              <th />
              {features.map((f) => (
                <th key={f} className="px-1 pb-1 font-medium text-neutral-400">
                  <span className="block max-w-[4.5rem] truncate" title={STAT_LABELS[f] ?? f}>
                    {STAT_LABELS_SHORT[f] ?? f}
                  </span>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {features.map((row, i) => (
              <tr key={row}>
                <th
                  className="max-w-[7rem] truncate pr-2 text-right font-medium text-neutral-400"
                  title={STAT_LABELS[row] ?? row}
                >
                  {STAT_LABELS_SHORT[row] ?? row}
                </th>
                {features.map((col, j) =>
                  j > i ? (
                    <td key={col} />
                  ) : (
                    <td
                      key={col}
                      title={`${STAT_LABELS_SHORT[row] ?? row} x ${STAT_LABELS_SHORT[col] ?? col}: ${matrix[i][j].toFixed(2)}`}
                      className="h-9 w-14 rounded text-center tabular-nums text-neutral-100"
                      style={{ backgroundColor: cellColor(matrix[i][j]) }}
                    >
                      {matrix[i][j].toFixed(2)}
                    </td>
                  )
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <ColorLegend />
    </div>
  );
}
