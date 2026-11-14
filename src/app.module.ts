import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { APP_GUARD } from '@nestjs/core';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AficionadosModule } from './aficionados/aficionados.module';
import { AnotacionesModule } from './anotaciones/anotaciones.module';
import { ApuestasModule } from './apuestas/apuestas.module';
import { BoletasModule } from './boletas/boletas.module';
import { SecurityGuard } from './common/guards/security.guard';
import { EscenariosModule } from './escenarios/escenarios.module';
import { EscenariosTorneoModule } from './escenarios-torneo/escenarios-torneo.module';
import { FasesModule } from './fases/fases.module';
import { InscripcionesModule } from './inscripciones/inscripciones.module';
import { LocalidadesModule } from './localidades/localidades.module';
import { MetodosPagoModule } from './metodos-pago/metodos-pago.module';
import { MetodosPagoAficionadoModule } from './metodos-pago-aficionado/metodos-pago-aficionado.module';
import { PartidosModule } from './partidos/partidos.module';
import { PelotasModule } from './pelotas/pelotas.module';
import { JugadoresModule } from './jugadores/jugadores.module';
import { PosicionesEspacialesModule } from './posiciones-espaciales/posiciones-espaciales.module';
import { EquiposModule } from './equipos/equipos.module';
import { EquipoJugadorModule } from './equipo-jugador/equipo-jugador.module';
import { AficionadoEquipoModule } from './aficionado-equipo/aficionado-equipo.module';
import { HabilidadesModule } from './habilidades/habilidades.module';
import { HabilidadJugadorModule } from './habilidad-jugador/habilidad-jugador.module';
import { DeportesModule } from './deportes/deportes.module';
import { EquiposDeportesModule } from './equipos-deportes/equipos-deportes.module';
import { TorneosModule } from './torneos/torneos.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        type: 'mysql',
        host: configService.get<string>('DB_HOST'),
        port: configService.get<number>('DB_PORT'),
        username: configService.get<string>('DB_USER'),
        password: configService.get<string>('DB_PASS'),
        database: configService.get<string>('DB_NAME'),
        entities: [__dirname + '/**/*.entity{.ts,.js}'],
        synchronize: false,
      }),
    }),
    FasesModule,
    TorneosModule,
    InscripcionesModule,
    EscenariosModule,
    EscenariosTorneoModule,
    LocalidadesModule,
    PartidosModule,
    AficionadosModule,
    BoletasModule,
    ApuestasModule,
    MetodosPagoModule,
    MetodosPagoAficionadoModule,
    AnotacionesModule,
    PelotasModule,
    JugadoresModule,
    PosicionesEspacialesModule,
    EquiposModule,
    EquipoJugadorModule,
    AficionadoEquipoModule,
    HabilidadesModule,
    HabilidadJugadorModule,
    DeportesModule,
    EquiposDeportesModule,
  ],
  providers: [
    {
      provide: APP_GUARD,
      useClass: SecurityGuard,
    },
  ],
})
export class AppModule {}
