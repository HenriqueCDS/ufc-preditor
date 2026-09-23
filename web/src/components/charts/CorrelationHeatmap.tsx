import { EDA_STATS } from "@/data/eda-stats";

// Diverging scale: red = positive, blue = negative, neutral at 0.
function cellColor(v: number) {
  const alpha = Math.min(Math.abs(v), 1) * 0.85;
  return v >= 0 ? `rgba(224, 33, 45, ${alpha})` : `rgba(59, 130, 246, ${alpha})`;
}

// Lower triangle only, as in the notebook (the matrix is symmetric).
export function CorrelationHeatmap() {
  const { features, matrix } = EDA_STATS.correlation;
  return (
    <div className="overflow-x-auto">
      <table className="mx-auto border-separate border-spacing-0.5 text-xs">
        <thead>
          <tr>
            <th />
            {features.map((f) => (
              <th key={f} className="px-1 pb-1 font-medium text-neutral-400">
                <span className="block max-w-[4.5rem] truncate" title={f}>
                  {f}
                </span>
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {features.map((row, i) => (
            <tr key={row}>
              <th className="pr-2 text-right font-medium text-neutral-400">{row}</th>
              {features.map((col, j) =>
                j > i ? (
                  <td key={col} />
                ) : (
                  <td
                    key={col}
                    title={`${row} x ${col}: ${matrix[i][j].toFixed(2)}`}
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
  );
}
