import { IsUrl } from 'class-validator';

export class PreviewAppDto {
  @IsUrl({ require_protocol: true, protocols: ['http', 'https'] })
  url: string;
}
