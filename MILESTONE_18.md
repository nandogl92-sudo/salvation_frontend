# MILESTONE_18 - Límites: 8 al día, 2 al mismo rival, sin elegir rival

## Objective
Nadie farmea el mes a base de horas o de una segunda cuenta. Las ranqueadas tienen tope y el rival no se elige a dedo.

## Key Concepts
Sin límites, el primero se escapa el sábado y dos cuentas se pasan el mes. Máximo 8 ranqueadas al día. Contra la misma persona, 2 por semana (el resto, amistoso). El ranking sale de una cola, no de “elijo a mi otra cuenta”. El developer aprende a mostrar cupos y a bloquear el botón cuando no queda cupo, sin inventar sistemas raros.

## Checklist

- [x] Mostrar cuántas ranqueadas le quedan hoy (de 8)
- [x] Si ya jugó 8 ranqueadas hoy, no dejar lanzar otra ranqueada
- [x] Mostrar que contra ese rival ya no suma (límite 2/semana) y ofrecer solo amistoso
- [x] La ranqueada empareja sin lista “elige a X”
- [x] Mensajes cortos cuando el cupo se ha acabado

## Acceptance Criteria

- Con 8 ranqueadas hechas hoy, el botón de ranking no sigue sumando.
- No se puede elegir un rival concreto para una ranqueada.
- Un 3.er duelo en la misma semana contra la misma persona no suma al premio.
