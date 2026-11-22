import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios from 'axios';

export interface DestinatarioCorreo {
  email: string;
  nombre: string;
}

export interface PartidoCorreo {
  equipo_local: string;
  equipo_visitante: string;
  // ISO 8601; el servicio de correo lo muestra en hora de Colombia.
  fecha_hora: string;
  torneo: string;
  fase: string;
  escenario: string | null;
  direccion: string | null;
}

// HU-GC-07: marcador del partido en los correos de gol y de resumen.
export interface MarcadorCorreo {
  equipo_local: string;
  equipo_visitante: string;
  goles_local: number;
  goles_visitante: number;
  torneo: string;
  fase: string;
}

export interface GolCorreo {
  jugador: string;
  equipo: string;
  minuto: number;
}

export interface ResumenCorreo extends MarcadorCorreo {
  fecha_hora: string;
  escenario: string | null;
}

// Cliente de ms-notificaciones (Flask + Gmail). Autentica con X-Service-Key.
// Ningún método lanza: el correo es secundario y devuelven cuántos se enviaron.
@Injectable()
export class NotificationsClient {
  private readonly logger = new Logger(NotificationsClient.name);

  constructor(private readonly configService: ConfigService) {}

  // HU-GC-06: aviso de nuevo partido.
  enviarNuevoPartido(
    destinatarios: DestinatarioCorreo[],
    partido: PartidoCorreo,
  ): Promise<number> {
    return this.enviar(
      '/api/partidos/nuevo',
      { destinatarios, partido },
      'del nuevo partido',
    );
  }

  // HU-GC-07: aviso de un gol registrado con el partido en juego.
  enviarGol(
    destinatarios: DestinatarioCorreo[],
    partido: MarcadorCorreo,
    gol: GolCorreo,
  ): Promise<number> {
    return this.enviar(
      '/api/partidos/gol',
      { destinatarios, partido, gol },
      'del gol',
    );
  }

  // HU-GC-07: resumen del partido al finalizarlo.
  enviarResumenPartido(
    destinatarios: DestinatarioCorreo[],
    partido: ResumenCorreo,
    goles: GolCorreo[],
  ): Promise<number> {
    return this.enviar(
      '/api/partidos/resumen',
      { destinatarios, partido, goles },
      'del resumen del partido',
    );
  }

  private async enviar(
    ruta: string,
    body: object,
    descripcion: string,
  ): Promise<number> {
    const baseUrl = this.configService.get<string>('EMAIL_SERVICE_URL');
    const apiKey = this.configService.get<string>('EMAIL_SERVICE_API_KEY');
    if (!baseUrl || !apiKey) {
      this.logger.warn(
        'EMAIL_SERVICE_URL o EMAIL_SERVICE_API_KEY sin configurar: no se envían correos',
      );
      return 0;
    }
    try {
      const { data } = await axios.post<{ enviados?: number }>(
        `${baseUrl}${ruta}`,
        body,
        {
          headers: { 'X-Service-Key': apiKey },
          // Gmail envía un correo por destinatario: puede tardar.
          timeout: 60000,
        },
      );
      return data?.enviados ?? 0;
    } catch (error) {
      const status = axios.isAxiosError(error) ? error.response?.status : undefined;
      this.logger.error(
        `No fue posible enviar los correos ${descripcion}: ${status ?? 'sin respuesta'}`,
      );
      return 0;
    }
  }
}
