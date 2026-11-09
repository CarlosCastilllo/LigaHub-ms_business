import { jest } from '@jest/globals';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import request from 'supertest';
import { App } from 'supertest/types';
import { EscenariosTorneoController } from './escenarios-torneo.controller';
import { EscenariosTorneoService } from './escenarios-torneo.service';

describe('EscenariosTorneoController', () => {
  let app: INestApplication<App>;
  const torneoId = '550e8400-e29b-41d4-a716-446655440000';
  const asignacionId = '550e8400-e29b-41d4-a716-446655440001';
  const asignacion = {
    id: asignacionId,
    fecha_asignacion: '2026-11-08',
    estado: 'ACTIVO',
    escenario_id: '550e8400-e29b-41d4-a716-446655440010',
    torneo_id: torneoId,
  };
  const createPayload = {
    fecha_asignacion: asignacion.fecha_asignacion,
    estado: asignacion.estado,
    escenario_id: asignacion.escenario_id,
    torneo_id: asignacion.torneo_id,
  };
  const service = {
    create: jest.fn().mockResolvedValue(asignacion),
    findAll: jest.fn().mockResolvedValue([asignacion]),
    findOne: jest.fn().mockResolvedValue(asignacion),
    update: jest.fn().mockResolvedValue(asignacion),
    remove: jest.fn().mockResolvedValue({ message: 'Assignment deleted' }),
    getCountByTorneo: jest
      .fn()
      .mockResolvedValue({ torneo_id: torneoId, total_escenarios: 1 }),
  };

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      controllers: [EscenariosTorneoController],
      providers: [{ provide: EscenariosTorneoService, useValue: service }],
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

  it('exposes assignment CRUD, UUID validation, and the tournament report', async () => {
    const server = app.getHttpServer();

    await request(server)
      .post('/escenarios-torneo')
      .send(createPayload)
      .expect(201)
      .expect(({ body }) => {
        expect(body.torneo_id).toBe(torneoId);
        expect(body.escenario_id).toBe(createPayload.escenario_id);
      });
    await request(server)
      .post('/escenarios-torneo')
      .send({ ...createPayload, escenario_id: 'bad-uuid' })
      .expect(400);
    await request(server).get('/escenarios-torneo').expect(200);
    await request(server)
      .get(`/escenarios-torneo/${asignacionId}`)
      .expect(200);
    await request(server)
      .patch(`/escenarios-torneo/${asignacionId}`)
      .send({ estado: 'INACTIVO' })
      .expect(200);
    await request(server)
      .delete(`/escenarios-torneo/${asignacionId}`)
      .expect(200);
    await request(server)
      .get(`/escenarios-torneo/reports/torneo/${torneoId}/count`)
      .expect(200)
      .expect(({ body }) => expect(body.total_escenarios).toBe(1));
  });
});
