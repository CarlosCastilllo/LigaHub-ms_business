import {
  ValidationArguments,
  ValidatorConstraint,
  ValidatorConstraintInterface,
} from 'class-validator';

@ValidatorConstraint({ name: 'fecha_fin_no_anterior', async: false })
export class FechaFinNoAnteriorConstraint implements ValidatorConstraintInterface {
  validate(fecha_fin: unknown, args?: ValidationArguments): boolean {
    const { fecha_inicio } = (args?.object ?? {}) as {
      fecha_inicio?: unknown;
    };

    if (typeof fecha_inicio !== 'string' || typeof fecha_fin !== 'string') {
      return true;
    }

    return fecha_fin >= fecha_inicio;
  }

  defaultMessage(): string {
    return 'fecha_fin debe ser igual o posterior a fecha_inicio';
  }
}
