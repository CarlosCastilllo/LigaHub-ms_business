import { jest } from '@jest/globals';
import {
  BadRequestException,
  ConflictException,
  INestApplication,
  NotFoundException,
  ValidationPipe,
} from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import request from 'supertest';
import { App } from 'supertest/types';
import { EquipoJugadorController } from './equipo-jugador.controller';
import { EquipoJugadorService } from './equipo-jugador.service';

describe('Team roster routes', () => {
  let app: INestApplication<App>;
  const equipoId = '550e8400-e29b-41d4-a716-446655440220';
  const jugadorId = '550e8400-e29b-41d4-a716-446655440210';
  const relacionId = '550e8400-e29b-41d4-a716-446655440221';
  const contrato = {
    id: relacionId,
    equipo_id: equipoId,
    jugador_id: jugadorId,
    fecha_inicio: '2026-01-15',
    fecha_fin: null,
    activo: true,
  };
  const service = {
    create: jest.fn().mockResolvedValue(contrato),
    findAll: jest.fn().mockResolvedValue([contrato]),
    findOne: jest.fn().mockResolvedValue(contrato),
    update: jest.fn().mockResolvedValue(contrato),
    retirar: jest
      .fn()
      .mockResolvedValue({ ...contrato, activo: false, fecha_fin: '2026-06-30' }),
    remove: jest.fn().mockResolvedValue({ message: 'deleted' }),
  };

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      controllers: [EquipoJugadorController],
      providers: [{ provide: EquipoJugadorService, useValue: service }],
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

  it('assigns a player to a team with contract dates', async () => {
    const body = {
      equipo_id: equipoId,
      jugador_id: jugadorId,
      fecha_inicio: '2026-01-15',
      fecha_fin: '2026-12-31',
    };

    await request(app.getHttpServer())
      .post('/equipo-jugador')
      .send(body)
      .expect(201);
    expect(service.create).toHaveBeenCalledWith(body);
  });

  it('rejects invalid assignment payloads', async () => {
    const server = app.getHttpServer();
    const valid = {
      equipo_id: equipoId,
      jugador_id: jugadorId,
      fecha_inicio: '2026-01-15',
    };

    await request(server).post('/equipo-jugador').send({}).expect(400);
    await request(server)
      .post('/equipo-jugador')
      .send({ ...valid, equipo_id: 'abc' })
      .expect(400);
    await request(server)
      .post('/equipo-jugador')
      .send({ ...valid, fecha_inicio: '15/01/2026' })
      .expect(400);
    await request(server)
      .post('/equipo-jugador')
      .send({ ...valid, activo: false })
      .expect(400);
  });

  it('filters by team and by player', async () => {
    const server = app.getHttpServer();

    await request(server)
      .get(`/equipo-jugador?equipo_id=${equipoId}`)
      .expect(200);
    expect(service.findAll).toHaveBeenLastCalledWith({ equipo_id: equipoId });
    await request(server)
      .get(`/equipo-jugador?jugador_id=${jugadorId}`)
      .expect(200);
    expect(service.findAll).toHaveBeenLastCalledWith({ jugador_id: jugadorId });
    await request(server).get('/equipo-jugador?equipo_id=abc').expect(400);
    await request(server).get('/equipo-jugador?jugador_id=abc').expect(400);
  });

  it('retires a player through the dedicated route', async () => {
    const server = app.getHttpServer();

    const response = await request(server)
      .patch(`/equipo-jugador/${relacionId}/retiro`)
      .send({ fecha_fin: '2026-06-30' })
      .expect(200);
    expect(response.body).toEqual(
      expect.objectContaining({ activo: false, fecha_fin: '2026-06-30' }),
    );
    expect(service.retirar).toHaveBeenCalledWith(relacionId, {
      fecha_fin: '2026-06-30',
    });
    expect(service.update).not.toHaveBeenCalled();

    await request(server)
      .patch(`/equipo-jugador/${relacionId}/retiro`)
      .send({})
      .expect(400);
    await request(server)
      .patch('/equipo-jugador/no-es-uuid/retiro')
      .send({ fecha_fin: '2026-06-30' })
      .expect(400);
  });

  it('does not allow moving an existing contract to another team or player', async () => {
    await request(app.getHttpServer())
      .patch(`/equipo-jugador/${relacionId}`)
      .send({ equipo_id: equipoId })
      .expect(400);
  });

  it('propagates 404, 409 and 400 from the service', async () => {
    const server = app.getHttpServer();
    const body = {
      equipo_id: equipoId,
      jugador_id: jugadorId,
      fecha_inicio: '2026-01-15',
    };
    service.create.mockRejectedValueOnce(new NotFoundException('missing'));
    service.create.mockRejectedValueOnce(new ConflictException('duplicate'));
    service.create.mockRejectedValueOnce(
      new BadRequestException('not active'),
    );
    service.retirar.mockRejectedValueOnce(
      new ConflictException('already retired'),
    );

    await request(server).post('/equipo-jugador').send(body).expect(404);
    await request(server).post('/equipo-jugador').send(body).expect(409);
    await request(server).post('/equipo-jugador').send(body).expect(400);
    await request(server)
      .patch(`/equipo-jugador/${relacionId}/retiro`)
      .send({ fecha_fin: '2026-06-30' })
      .expect(409);
  });
});
