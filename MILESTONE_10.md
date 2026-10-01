# MILESTONE_10 - Pedir la recuperación de la contraseña

## Objective

Quien no recuerda su contraseña puede pedirlo desde el inicio de sesión, con el email de su cuenta, y entiende si la petición ha salido bien.

## Key Concepts

Hoy, si la contraseña no se recuerda, la persona se queda fuera. Este paso abre esa puerta sin obligarla a crear otra cuenta. La petición usa el mismo email con el que se registró, porque es lo que identifica la cuenta. Al terminar, sabe si puede seguir o qué ha fallado. Todavía no cambia la contraseña: solo deja hecha la petición. El milestone siguiente usa esa petición para elegir la contraseña nueva y entrar con ella.

## Checklist

- [x] Mostrar en el inicio de sesión una acción para recuperar la contraseña
- [x] Pedir el email de la cuenta
- [x] Confirmar cuando la petición se ha enviado
- [x] Si el email no corresponde a una cuenta, explicarlo sin iniciar sesión
- [x] Si la petición falla, mostrar el motivo y dejar el acceso como estaba

## Acceptance Criteria

- Desde el inicio de sesión se puede pedir la recuperación sin estar dentro de la cuenta.
- Un email de una cuenta existente deja claro que la petición se ha hecho.
- Un email desconocido no inicia sesión y explica qué ha pasado.
- Un fallo no cambia la contraseña ni entra en la cuenta, y se entiende el motivo.
