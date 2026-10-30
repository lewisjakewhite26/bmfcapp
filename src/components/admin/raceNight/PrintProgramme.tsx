import { programmeTotals, type Programme } from '../../../lib/raceNight'

/** Printable programme (no payment info). Everything else on the page is hidden when printing. */
export function PrintProgramme({ programme }: { programme: Programme }) {
  const totals = programmeTotals(programme)
  return (
    <>
      <style>{`
        @media print {
          body * { visibility: hidden; }
          #race-night-print, #race-night-print * { visibility: visible; }
          #race-night-print { position: absolute; left: 0; top: 0; width: 100%; padding: 0; margin: 0; box-shadow: none; }
          @page { margin: 12mm; }
        }
      `}</style>
      <div id="race-night-print" className="glass-card p-5 mt-3 print:bg-white text-brand-navy">
        <header className="text-center mb-4">
          <h2 className="font-display text-3xl font-bold">{programme.title}</h2>
          <p className="text-sm text-gray-600">
            {totals.races} races · {totals.horses} horses · {totals.sponsors} sponsors
          </p>
        </header>
        <div className="grid sm:grid-cols-2 gap-x-6 gap-y-5 print:grid-cols-2">
          {programme.races.map((race, i) => (
            <section key={race.id} className="break-inside-avoid">
              <div className="border-b-2 border-brand-navy pb-1 mb-1">
                <h3 className="font-display text-lg font-bold">Race {i + 1}</h3>
                {race.sponsor.trim() && <p className="text-xs text-gray-600">Sponsored by {race.sponsor}</p>}
              </div>
              <table className="w-full text-xs">
                <thead>
                  <tr className="text-left text-gray-500">
                    <th className="w-6 py-0.5 font-semibold">#</th>
                    <th className="font-semibold">Horse</th>
                    <th className="font-semibold">Owner</th>
                    <th className="font-semibold">Jockey</th>
                  </tr>
                </thead>
                <tbody>
                  {race.runners.map((r) => (
                    <tr key={r.id} className="border-t border-gray-200">
                      <td className="py-1 font-semibold">{r.number}</td>
                      <td className="py-1 pr-2">{r.horse}</td>
                      <td className="py-1 pr-2">{r.owner}</td>
                      <td className="py-1">{r.jockey}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </section>
          ))}
        </div>
      </div>
    </>
  )
}
