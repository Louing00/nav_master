import { IsArray, IsBoolean, IsInt, IsOptional, IsString, IsUrl, MaxLength } from 'class-validator';

export class CreateAppDto {
  @IsString()
  @MaxLength(80)
  name: string;

  @IsUrl({ require_protocol: true, protocols: ['http', 'https'] })
  url: string;

  @IsOptional()
  @IsString()
  @MaxLength(300)
  description?: string;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  icon?: string;

  @IsOptional()
  @IsInt()
  categoryId?: number;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  tags?: string[];

  @IsOptional()
  @IsInt()
  sortOrder?: number;

  @IsOptional()
  @IsBoolean()
  visible?: boolean;

  @IsOptional()
  @IsBoolean()
  openInNewTab?: boolean;
}
