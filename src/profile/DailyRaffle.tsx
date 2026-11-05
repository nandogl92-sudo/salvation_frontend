import { useEffect, useState } from 'react';
import { chooseRaffleHour, getTodayRaffle, type DailyRaffle as DailyRaffleView, type RaffleSeat } from '../api/raffleApi';

const FALLBACK_HOURS = [15, 16, 17, 18, 19, 20, 21, 22, 23];

const hourLabel = (hour: number): string => `${hour}:00`;

const DailyRaffle = () => {
  const [raffle, setRaffle] = useState<DailyRaffleView | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [savingKey, setSavingKey] = useState<string | null>(null);

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

  const handleChoose = (seatId: string, hour: number) => {
    if (!raffle || savingKey !== null) return;
    const seat = raffle.seats.find((item) => item.id === seatId);
    if (!seat?.yours || seat.agreedHour !== null || seat.blocked.includes(hour)) return;
    setSavingKey(`${seatId}:${hour}`);
    chooseRaffleHour(hour, seatId).then((result) => {
      setSavingKey(null);
      if (result.ok === true) {
        setRaffle(result.raffle);
        setMessage(null);
        return;
      }
      setMessage(result.message);
    });
  };

  const mine = raffle?.seats.filter((seat) => seat.yours) ?? [];
  const rivals = mine.map((seat) => seat.rivalName).filter((name) => name !== null);
  const hours = raffle && raffle.hours.length > 0 ? raffle.hours : FALLBACK_HOURS;

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
          {raffle.youPlay && rivals.length === 1 && (
            <p className="text-sm font-bold text-accent-100">Hoy juegas contra {rivals[0]}.</p>
          )}
          {raffle.youPlay && rivals.length > 1 && (
            <p className="text-sm font-bold text-accent-100">
              Hoy juegas dos partidos, contra {rivals.join(' y ')}. Aunque ganes los dos, hoy solo suma 1 punto.
            </p>
          )}
          {raffle.youPlay && (
            <p className="text-xs text-text-200">Quien gana su partido del día suma 1 punto a la semana del ranking.</p>
          )}
          <div className="space-y-2">
            <h3 className="text-sm font-bold text-text-100">Partidos de hoy</h3>
            <ul className="space-y-1">
              {raffle.seats.map((seat) => {
                const agreed = seat.agreedHour !== null ? ` a las ${hourLabel(seat.agreedHour)}` : '';
                const point = seat.counts ? '' : ' No suma punto: ya se han enfrentado 2 veces esta semana.';
                return (
                  <li key={seat.id} className="text-sm text-text-200">
                    {seat.names.join(' contra ')}{agreed}.{point}
                  </li>
                );
              })}
            </ul>
          </div>
          {mine.map((seat) => (
            <SeatHours
              key={seat.id}
              seat={seat}
              hours={hours}
              savingKey={savingKey}
              onChoose={handleChoose}
            />
          ))}
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

const SeatHours = ({
  seat,
  hours,
  savingKey,
  onChoose,
}: {
  seat: RaffleSeat;
  hours: number[];
  savingKey: string | null;
  onChoose: (seatId: string, hour: number) => void;
}) => {
  const canChoose = seat.agreedHour === null;
  const handleHour = (hour: number) => {
    onChoose(seat.id, hour);
  };

  return (
    <div className="space-y-2">
      <h3 className="text-sm font-bold text-text-100">Hora contra {seat.rivalName}</h3>
      {seat.agreedHour !== null && (
        <p className="text-sm font-bold text-text-100">Hora acordada: {hourLabel(seat.agreedHour)}.</p>
      )}
      {canChoose && seat.cleared && (
        <p className="text-sm font-bold text-red-500" role="status">No coincidís. Esas horas ya no se pueden elegir.</p>
      )}
      {canChoose && seat.rivalHour !== null && (
        <p className="text-sm text-text-200">La otra persona ha elegido las {hourLabel(seat.rivalHour)}.</p>
      )}
      {canChoose && seat.yourHour !== null && seat.rivalHour === null && (
        <p className="text-sm text-text-200">Has elegido las {hourLabel(seat.yourHour)}. Falta la otra persona.</p>
      )}
      {canChoose && (
        <p className="text-xs text-text-200">Elige una hora, de 15:00 a 23:00. Solo queda fijada si los dos elegís la misma.</p>
      )}
      <div className="grid grid-cols-3 gap-2" role="group" aria-label={`Horas contra ${seat.rivalName}`}>
        {hours.map((hour) => {
          const blocked = seat.blocked.includes(hour);
          const selected = !blocked && (seat.agreedHour === hour || seat.yourHour === hour);
          const chooseThisHour = () => {
            if (blocked) return;
            handleHour(hour);
          };
          const buttonClass = blocked
            ? 'bg-bg-200 text-text-200 line-through'
            : selected
              ? 'bg-[#f5c518] text-[#1a1403]'
              : 'bg-bg-300 text-text-100';
          return (
            <button
              key={hour}
              type="button"
              aria-label={blocked ? `Las ${hourLabel(hour)} ya no se pueden elegir` : `Elegir las ${hourLabel(hour)} contra ${seat.rivalName}`}
              aria-pressed={selected}
              disabled={blocked || !canChoose || savingKey !== null}
              onClick={chooseThisHour}
              className={`rounded-lg px-3 py-3 text-sm font-bold disabled:opacity-50 ${buttonClass}`}
            >
              {hourLabel(hour)}
            </button>
          );
        })}
      </div>
    </div>
  );
};

export default DailyRaffle;
