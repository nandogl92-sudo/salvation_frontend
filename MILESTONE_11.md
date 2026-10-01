# MILESTONE_11 - Entrar con la contraseña nueva

## Objective

Después de pedir la recuperación, la persona elige una contraseña nueva y entra en su cuenta con ella.

## Key Concepts

La contraseña nueva sustituye a la anterior en la misma cuenta. No se crea otro usuario ni se pierden los puntos. Hay que escribirla dos veces para evitar un error al teclear. Cuando se guarda, la contraseña vieja deja de servir y la nueva abre la sesión. Si no se guarda, la contraseña anterior sigue valiendo y se ve el motivo. Con el milestone anterior ya se sabe pedir la recuperación; aquí esa petición termina en poder jugar otra vez.

## Checklist

- [x] Pedir la contraseña nueva y su confirmación
- [x] No aceptar una contraseña vacía, demasiado corta o distinta en los dos campos
- [x] Al guardar una contraseña válida, permitir entrar con ella
- [x] Dejar de aceptar la contraseña anterior
- [x] Si no se guarda, mantener la contraseña anterior y mostrar el motivo

## Acceptance Criteria

- Entrar con la contraseña nueva abre la misma cuenta, con sus puntos.
- Entrar con la contraseña anterior ya no abre la cuenta.
- Una contraseña que no coincide, es demasiado corta o no se guarda no cambia el acceso y explica qué ha pasado.
