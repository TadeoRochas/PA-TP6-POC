import { Body, Controller, Get, HttpCode, Param, Post } from '@nestjs/common';
import { ActivationsService } from './service';

@Controller('activations')
export class ActivationsController {
  constructor(private readonly svc: ActivationsService) {}

  // RF-01/RF-02: crea activacion y responde 202 sin esperar
  @Post()
  @HttpCode(202)
  async create(@Body() body: { customerId: string; planId: string; simulateFailure?: string }) {
    const { customerId, planId, simulateFailure } = body ?? ({} as any);
    if (!customerId || !planId) {
      return { error: 'customerId y planId son requeridos' };
    }
    return this.svc.create(customerId, planId, simulateFailure ?? 'none');
  }

  // RF-09: estado actual + historial
  @Get(':id')
  async findOne(@Param('id') id: string) {
    const found = await this.svc.findById(id);
    if (!found) return { error: 'not_found' };
    return found;
  }
}
