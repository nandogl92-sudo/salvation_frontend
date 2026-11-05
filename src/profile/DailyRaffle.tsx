import { useEffect, useState } from 'react';
import { getTodayRaffle, type DailyRaffle as DailyRaffleView } from '../api/raffleApi';

const DailyRaffle = () => {
  const [raffle, setRaffle] = useState<DailyRaffleView | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    getTodayRaffle().then((result) => {
      if (cancelled) return;
      if (result.ok === true) {
        setRaffle(result.raffle);
        return;
      }
      setMessage(result.message);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <section className="bg-bg-100 rounded-2xl border border-bg-300 p-5 space-y-2" aria-label="Sorteo de hoy">
      <h2 className="text-xs font-bold text-text-200 uppercase tracking-widest">Sorteo de hoy</h2>
      {message && <p className="text-sm text-red-500" role="alert">{message}</p>}
      {!raffle && !message && <p className="text-sm text-text-200">Cargando el sorteo...</p>}
      {raffle && (
        <>
          <p className={`text-sm font-bold ${raffle.youWon ? 'text-accent-100' : 'text-text-100'}`}>
            {raffle.youWon ? 'Hoy te ha tocado.' : `Hoy le ha tocado a ${raffle.winnerName}.`}
          </p>
          <p className="text-xs text-text-200">Código para acceder</p>
          <p className="font-pixel text-lg tracking-[0.35em] text-[#f5c518]" aria-label={`Código ${raffle.code}`}>
            {raffle.code}
          </p>
          <p className="text-xs text-text-200">Es el mismo para todas las cuentas. De momento no hace falta escribirlo para jugar.</p>
        </>
      )}
    </section>
  );
};

export default DailyRaffle;
