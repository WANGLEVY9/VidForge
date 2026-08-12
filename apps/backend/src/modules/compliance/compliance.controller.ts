import { Body, Controller, Post, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { ComplianceService } from './compliance.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@ApiTags('合规审核')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('compliance')
export class ComplianceController {
  constructor(private readonly compliance: ComplianceService) {}

  @Post('scan')
  @ApiOperation({ summary: '对一段文本做合规扫描' })
  async scan(@Body() body: { text: string; forbidden?: string[]; useLlm?: boolean }) {
    if (body.useLlm) {
      return this.compliance.scanTextWithLlm(body.text, body.forbidden ?? []);
    }
    return this.compliance.scanText(body.text, body.forbidden ?? []);
  }

  @Post('scan-shots')
  @ApiOperation({ summary: '对分镜列表做合规扫描' })
  async scanShots(
    @Body() body: { shots: Array<{ voiceover?: string; caption?: string }>; forbidden?: string[] }
  ) {
    return this.compliance.scanShots(body.shots ?? [], body.forbidden ?? []);
  }
}
