import { ApiProperty } from '@nestjs/swagger';
import {
  IsNotEmpty,
  IsString,
  Matches,
  MaxLength,
  MinLength,
} from 'class-validator';

// Same rules as shown on the profile page.
export const PASSWORD_POLICY_REGEX =
  /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*]).{8,50}$/;

export class ChangePasswordDto {
  @ApiProperty({ format: 'password', writeOnly: true })
  @IsString()
  @IsNotEmpty()
  currentPassword!: string;

  @ApiProperty({
    format: 'password',
    writeOnly: true,
    minLength: 8,
    maxLength: 50,
    description:
      'Ít nhất 8 ký tự, gồm chữ hoa, chữ thường, chữ số và ký tự đặc biệt (!@#$%^&*)',
  })
  @IsString()
  @MinLength(8)
  @MaxLength(50)
  @Matches(PASSWORD_POLICY_REGEX, {
    message:
      'newPassword must contain upper case, lower case, a digit and a special character (!@#$%^&*)',
  })
  newPassword!: string;
}
