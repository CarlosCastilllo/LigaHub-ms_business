# 7 - Frontend: escenarios de torneo y fase final

## Objetivo y alcance

Agregar al frontend de LigaHub (`LigaHub-Frontend`, Next.js) dos apartados que consumen `ms_business`, siguiendo el mismo patrón que el apartado de **inscripciones**:

| Apartado | Ruta | Recurso de Business |
|---|---|---|
| Escenarios de torneo | `/escenarios-torneo` | `/escenarios-torneo` |
| Fases finales | `/fases-finales` | `/fases?tipo=FINAL` y `/fases/:id` |

Fuera de alcance:

- **Escenario y equipo**: sus microservicios no forman parte de este trabajo. Por eso `escenario_id` se escribe a mano como UUID, igual que `equipo_id` en inscripción.
- **Fase de grupos**: el apartado es solo para fases finales.

## 1) El patrón de inscripción

Cada apartado de Business en el frontend tiene cinco piezas:

```text
src/
├── app/
│   ├── (dashboard)/<recurso>/page.tsx          # página: lista, búsqueda, crear/editar/eliminar
│   └── api/business/<recurso>/
│       ├── route.ts                            # proxy GET/POST  → ms_business
│       └── [id]/route.ts                       # proxy GET/PATCH/DELETE → ms_business
├── components/features/<recurso>/
│   ├── <Recurso>Table.tsx                      # tabla
│   └── <Recurso>FormModal.tsx                  # formulario de crear/editar
└── lib/api/business-<recurso>.ts               # cliente: tipos + findAll/create/update/remove
```

Más una entrada en `src/lib/navigation.ts` para el menú lateral.

**¿Por qué un proxy?** El navegador no llama directamente a `ms_business` (que no tiene CORS habilitado). Llama a `/api/business/...` en el mismo origen del frontend, y la ruta de Next reenvía la petición, con el header `Authorization`, a `BUSINESS_API_BASE_URL` (por defecto `http://localhost:3030`). Ver `src/lib/server/business-proxy.ts`.

## 2) Escenarios de torneo

### Archivos

```text
src/lib/api/business-escenarios-torneo.ts
src/app/api/business/escenarios-torneo/route.ts
src/app/api/business/escenarios-torneo/[id]/route.ts
src/components/features/escenarios-torneo/EscenariosTorneoTable.tsx
src/components/features/escenarios-torneo/EscenarioTorneoFormModal.tsx
src/components/features/escenarios-torneo/EscenarioTorneoFormModal.test.tsx
src/app/(dashboard)/escenarios-torneo/page.tsx
```

### Formulario

| Campo | Control | Validación en el cliente |
|---|---|---|
| Fecha de asignación | `date` (por defecto, hoy) | Obligatoria. |
| Estado | Lista: Activo / Inactivo | — |
| ID del escenario | Texto | UUID válido. |
| Torneo | **Lista desplegable** con los torneos existentes (`nombre — id`) | Debe ser un torneo de la lista. |

Al abrir el formulario se cargan los torneos con `businessTorneosApi.findAll()`, igual que en inscripción. Si no se pueden cargar, la lista se deshabilita y se muestra el error.

## 3) Fases finales

### Archivos

```text
src/lib/api/business-fases-finales.ts
src/lib/api/business-fases-finales.test.ts
src/app/api/business/fases/route.ts
src/app/api/business/fases/[id]/route.ts
src/components/features/fases-finales/FasesFinalesTable.tsx
src/components/features/fases-finales/FaseFinalFormModal.tsx
src/components/features/fases-finales/FaseFinalFormModal.test.tsx
src/app/(dashboard)/fases-finales/page.tsx
```

### El tipo siempre es FINAL

El formulario **no muestra** el campo `tipo`. El cliente de API lo fija:

```ts
create(input: FaseFinalInput) {
  return request<FaseFinalDTO>("/api/business/fases", {
    method: "POST",
    body: { ...input, tipo: "FINAL" },
  });
},
```

Al editar (`PATCH`) no se envía `tipo`, porque Business no permite cambiarlo.

### Solo se listan las finales

```ts
findAll() {
  return request<FaseFinalDTO[]>("/api/business/fases?tipo=FINAL");
},
```

El filtro lo aplica `ms_business` (ver la guía 6). La ruta proxy `src/app/api/business/fases/route.ts` reenvía únicamente un `tipo` conocido (`GRUPOS` o `FINAL`) para no pasar parámetros arbitrarios al backend.

### Formulario

| Campo | Origen | Control | Validación en el cliente |
|---|---|---|---|
| Número de orden | Fase | Número | Entero ≥ 1. |
| Estado | Fase | Lista: Pendiente / En curso / Finalizada | — |
| Fecha de inicio | Fase | `date` | Obligatoria. |
| Fecha de fin | Fase | `date` | Obligatoria y no anterior a la de inicio. |
| Torneo | Fase | **Lista desplegable** de torneos | Debe ser un torneo de la lista. |
| Número de partidos | FaseFinal | Número | Entero ≥ 1. |
| Modalidad | FaseFinal | Lista: Partido único / Ida y vuelta | — |

## 4) Menú lateral

En `src/lib/navigation.ts`, dentro de la sección **Business**:

```ts
{
  href: "/escenarios-torneo",
  label: "Escenarios de torneo",
  icon: MapPin,
  requires: (access) => access.hasPermission("/escenarios-torneo", "GET"),
},
{
  href: "/fases-finales",
  label: "Fases finales",
  icon: Medal,
  requires: (access) => access.hasPermission("/fases", "GET"),
},
```

`requires` oculta el ítem a quien no tiene el permiso y, a través de `canAccessPath`, también bloquea la página si se escribe la URL a mano.

## 5) Autenticación y permisos

Funcionan en dos capas:

1. **Frontend (qué se ve).** El menú y los botones se muestran según los permisos del usuario (`GET /api/auth/me` de `ms_security`):

   | Acción | Escenarios de torneo | Fases finales |
   |---|---|---|
   | Ver el apartado | `GET /escenarios-torneo` | `GET /fases` |
   | Botón crear | `POST /escenarios-torneo` | `POST /fases` |
   | Botón editar | `PATCH /escenarios-torneo/{id}` | `PATCH /fases/{id}` |
   | Botón eliminar | `DELETE /escenarios-torneo/{id}` | `DELETE /fases/{id}` |

   Además, la lista desplegable de torneos necesita `GET /torneos`. Sin ese permiso el formulario abre, pero muestra "No se pudieron cargar los torneos".

2. **Backend (lo que realmente protege).** Cada petición lleva el token; el `SecurityGuard` de `ms_business` lo valida contra `ms_security`. Aunque alguien se salte la interfaz, el backend rechaza lo que no tenga permitido. Si responde `401`, el frontend cierra la sesión.

El rol `ADMIN` ya tiene todos estos permisos gracias al seeder de `ms_security`.

## 6) Pruebas

```bash
npm test
```

| Prueba | Qué comprueba |
|---|---|
| `EscenarioTorneoFormModal.test.tsx` | Carga los torneos en la lista y envía el torneo seleccionado. |
| `FaseFinalFormModal.test.tsx` | No hay selector de tipo, se envían los campos de la fase final y se rechaza una fecha de fin anterior a la de inicio. |
| `business-fases-finales.test.ts` | El listado pide `?tipo=FINAL`, crear envía `tipo: "FINAL"` y editar no envía `tipo`. |

## 7) Prueba manual

1. Arranca `ms_security`, `ms_business` y el frontend (`npm run dev`).
2. Inicia sesión como `ADMIN`.
3. Crea un torneo en **Torneos**.
4. En **Escenarios de torneo**, asigna un escenario: elige el torneo en la lista y escribe un UUID de escenario.
5. En **Fases finales**, crea una fase: elige el torneo, completa fechas, número de partidos y modalidad.
6. Comprueba que en **Fases finales** no aparecen fases de grupos creadas por Postman.

## 8) Resumen

1. Los dos apartados copian el patrón de inscripción: página, tabla, modal, cliente de API, proxy y entrada de menú.
2. El torneo se elige siempre en una lista desplegable; escenario se escribe como UUID.
3. La fase final fija `tipo: "FINAL"` al crear y lista con `?tipo=FINAL`.
4. La interfaz se adapta a los permisos, pero la protección real la hace el `SecurityGuard` con `ms_security`.
