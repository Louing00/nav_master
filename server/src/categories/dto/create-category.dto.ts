import { IsBoolean, IsInt, IsOptional, IsString, MaxLength } from 'class-validator';

export class CreateCategoryDto {
  @IsString()
  @MaxLength(80)
  name: string;

  @IsOptional()
  @IsString()
  @MaxLength(240)
  description?: string;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  icon?: string;

  @IsOptional()
  @IsInt()
  sortOrder?: number;

  @IsOptional()
  @IsBoolean()
  visible?: boolean;
}
