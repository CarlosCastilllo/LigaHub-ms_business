import { jest } from '@jest/globals';
import { ValidationPipe } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { App } from 'supertest/types';
import { FasesController } from '../fases/fases.controller';
import { FasesService } from '../fases/fases.service';
import { TorneosController } from './torneos.controller';
import { TorneosService } from './torneos.service';

describe('Tournament and phase CRUD routes', () => {
  let app: INestApplication<App>;
  const torneoId = '550e8400-e29b-41d4-a716-446655440000';
  const faseId = '550e8400-e29b-41d4-a716-446655440001';
  const torneo = {
    id: torneoId,
    nombre: 'Torneo Apertura',
    descripcion: 'Temporada de apertura',
    estado: 'PENDIENTE',
    max_equipos: 16,
    deporte_id: '550e8400-e29b-41d4-a716-446655440010',
  };
  const fase = {
    id: faseId,
    tipo: 'GRUPOS',
    numero_orden: 1,
    fecha_inicio: '2026-03-01',
    fecha_fin: '2026-03-15',
    estado: 'PENDIENTE',
    torneo_id: torneoId,
    cantidad_grupos: 4,
    equipos_por_grupo: 4,
  };
  const torneosService = {
    create: jest.fn().mockResolvedValue(torneo),
    findAll: jest.fn().mockResolvedValue([torneo]),
    findOne: jest.fn().mockResolvedValue(torneo),
    findFases: jest.fn().mockResolvedValue([fase]),
    update: jest.fn().mockResolvedValue(torneo),
    remove: jest.fn().mockResolvedValue({ message: 'Torneo deleted' }),
  };
  const fasesService = {
    create: jest.fn().mockResolvedValue(fase),
    findAll: jest.fn().mockResolvedValue([fase]),
    findOne: jest.fn().mockResolvedValue(fase),
    update: jest.fn().mockResolvedValue(fase),
    remove: jest.fn().mockResolvedValue({ message: 'Fase deleted' }),
  };

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      controllers: [TorneosController, FasesController],
      providers: [
        { provide: TorneosService, useValue: torneosService },
        { provide: FasesService, useValue: fasesService },
      ],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
      }),
    );
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  it('wires both CRUDs and returns the phase associated by tournament UUID', async () => {
    const server = app.getHttpServer();

    await request(server).post('/torneos').send(torneo).expect(400);

    await request(server)
      .post('/torneos')
      .send({
        nombre: torneo.nombre,
        descripcion: torneo.descripcion,
        estado: torneo.estado,
        max_equipos: torneo.max_equipos,
        deporte_id: torneo.deporte_id,
      })
      .expect(201)
      .expect(({ body }) => expect(body.id).toBe(torneoId));
    await request(server).get('/torneos').expect(200);
    await request(server).get(`/torneos/${torneoId}`).expect(200);
    await request(server)
      .get(`/torneos/${torneoId}/fases`)
      .expect(200)
      .expect(({ body }) => expect(body[0].torneo_id).toBe(torneoId));
    await request(server)
      .patch(`/torneos/${torneoId}`)
      .send({ nombre: 'Torneo Actualizado' })
      .expect(200);
    await request(server).delete(`/torneos/${torneoId}`).expect(200);

    await request(server)
      .post('/fases')
      .send({
        tipo: 'GRUPOS',
        numero_orden: 1,
        fecha_inicio: '2026-03-01',
        fecha_fin: '2026-03-15',
        estado: 'PENDIENTE',
        torneo_id: torneoId,
        cantidad_grupos: 4,
        equipos_por_grupo: 4,
      })
      .expect(201)
      .expect(({ body }) => expect(body.torneo_id).toBe(torneoId));
    await request(server).get('/fases').expect(200);
    await request(server).get(`/fases/${faseId}`).expect(200);
    await request(server)
      .patch(`/fases/${faseId}`)
      .send({ numero_orden: 2 })
      .expect(200);
    await request(server).delete(`/fases/${faseId}`).expect(200);
  });
});
