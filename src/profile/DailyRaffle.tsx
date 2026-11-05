import { useEffect, useState } from 'react';
import { chooseRaffleHour, getTodayRaffle, type DailyRaffle as DailyRaffleView } from '../api/raffleApi';

const hourLabel = (hour: number): string => `${hour}:00`;

const DailyRaffle = () => {
  const [raffle, setRaffle] = useState<DailyRaffleView | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [savingHour, setSavingHour] = useState<number | null>(null);

  useEffect(() => {
    let cancelled = false;
    const load = () => {
      getTodayRaffle().then((result) => {
        if (cancelled) return;
        if (result.ok === true) {
          setRaffle(result.raffle);
          setMessage(null);
          return;
        }
        setMessage(result.message);
      });
    };
    load();
    const timer = window.setInterval(load, 3000);
    return () => {
      cancelled = true;
      window.clearInterval(timer);
    };
  }, []);

  const handleChoose = (hour: number) => {
    if (!raffle || raffle.youRest || raffle.agreedHour !== null || savingHour !== null) return;
    setSavingHour(hour);
    chooseRaffleHour(hour).then((result) => {
      setSavingHour(null);
      if (result.ok === true) {
        setRaffle(result.raffle);
        setMessage(null);
        return;
      }
      setMessage(result.message);
    });
  };

  const players = raffle?.players.map((player) => player.name).join(' y ') ?? '';

  return (
    <section className="bg-bg-100 rounded-2xl border border-bg-300 p-5 space-y-3" aria-label="Sorteo de hoy">
      <h2 className="text-xs font-bold text-text-200 uppercase tracking-widest">Sorteo de hoy</h2>
      {message && <p className="text-sm text-red-500" role="alert">{message}</p>}
      {!raffle && !message && <p className="text-sm text-text-200">Cargando el sorteo...</p>}
      {raffle && (
        <>
          {raffle.youRest && (
            <p className="text-lg font-bold text-text-100">Hoy toca descansar.</p>
          )}
          {raffle.youPlay && (
            <p className="text-sm font-bold text-accent-100">
              Hoy te ha tocado jugar{raffle.rivalName ? ` con ${raffle.rivalName}` : ''}.
            </p>
          )}
          {raffle.youRest && players.length > 0 && (
            <p className="text-sm text-text-200">Hoy juegan {players}.</p>
          )}
          <p className="text-xs text-text-200">Código para acceder</p>
          <p className="font-pixel text-lg tracking-[0.35em] text-[#f5c518]" aria-label={`Código ${raffle.code}`}>
            {raffle.code}
          </p>
          <p className="text-xs text-text-200">Es el mismo para las dos cuentas. De momento no hace falta escribirlo para jugar.</p>
          {raffle.youPlay && raffle.agreedHour !== null && (
            <p className="text-sm font-bold text-text-100">Hora acordada: {hourLabel(raffle.agreedHour)}.</p>
          )}
          {raffle.youPlay && raffle.agreedHour === null && (
            <div className="space-y-2">
              {raffle.cleared && (
                <p className="text-sm font-bold text-red-500" role="status">No coincidís. La hora se ha borrado. Elegid otra vez.</p>
              )}
              {raffle.rivalHour !== null && (
                <p className="text-sm text-text-200">La otra persona ha elegido las {hourLabel(raffle.rivalHour)}.</p>
              )}
              {raffle.yourHour !== null && raffle.rivalHour === null && (
                <p className="text-sm text-text-200">Has elegido las {hourLabel(raffle.yourHour)}. Falta la otra persona.</p>
              )}
              <div className="grid grid-cols-3 gap-2" role="group" aria-label="Horas de juego, de 15:00 a 23:00">
                {raffle.hours.map((hour) => {
                  const selected = raffle.yourHour === hour;
                  const handleHour = () => {
                    handleChoose(hour);
                  };
                  return (
                    <button
                      key={hour}
                      type="button"
                      aria-label={`Elegir las ${hourLabel(hour)}`}
                      aria-pressed={selected}
                      disabled={savingHour !== null}
                      onClick={handleHour}
                      className={`rounded-lg px-3 py-2 text-sm font-bold ${selected ? 'bg-[#f5c518] text-[#1a1403]' : 'border border-bg-300 text-text-100'}`}
                    >
                      {hourLabel(hour)}
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </>
      )}
    </section>
  );
};

export default DailyRaffle;
