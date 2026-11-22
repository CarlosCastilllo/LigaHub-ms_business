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

// Cliente de ms-notificaciones (Flask + Gmail). Autentica con X-Service-Key.
@Injectable()
export class NotificationsClient {
  private readonly logger = new Logger(NotificationsClient.name);

  constructor(private readonly configService: ConfigService) {}

  // Devuelve cuántos correos se enviaron. No lanza: el correo es secundario.
  async enviarNuevoPartido(
    destinatarios: DestinatarioCorreo[],
    partido: PartidoCorreo,
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
        `${baseUrl}/api/partidos/nuevo`,
        { destinatarios, partido },
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
        `No fue posible enviar los correos del nuevo partido: ${status ?? 'sin respuesta'}`,
      );
      return 0;
    }
  }
}
