import { Injectable, NotFoundException } from '@nestjs/common';
import { UserRepository } from './repository/user.repository';
import { UserEntity } from './entity/user.entity';
import { ulid } from 'ulid';

export interface CreateUserDto {
  email: string;
  provider: string;
  sub: string;
  termAgreed: boolean;
  agreedAt: Date | null;
}

@Injectable()
export class UserService {
  constructor(private readonly userRepository: UserRepository) {}

  /**
   * Provider와 Sub로 사용자 조회
   */
  async findByProviderAndSub(
    provider: string,
    sub: string,
  ): Promise<UserEntity | null> {
    return this.userRepository.findByProviderAndSub(provider, sub);
  }

  /**
   * 사용자 생성
   */
  async create(createUserDto: CreateUserDto): Promise<UserEntity> {
    const user = new UserEntity();
    user.id = ulid();
    user.email = createUserDto.email;
    user.provider = createUserDto.provider;
    user.sub = createUserDto.sub;
    user.termAgreed = createUserDto.termAgreed;
    user.agreedAt = createUserDto.agreedAt;
    user.createdAt = new Date();
    user.updatedAt = new Date();

    return this.userRepository.save(user);
  }

  /**
   * 약관 동의 처리
   */
  async agreeTerms(userId: string): Promise<void> {
    const user = await this.userRepository.findById(userId);
    if (!user) {
      throw new NotFoundException('User not found');
    }

    user.termAgreed = true;
    user.agreedAt = new Date();
    user.updatedAt = new Date();

    await this.userRepository.save(user);
  }

  /**
   * 마지막 로그인 시간 업데이트
   */
  async updateLastLogin(userId: string): Promise<void> {
    const user = await this.userRepository.findById(userId);
    if (!user) {
      throw new NotFoundException('User not found');
    }

    user.updatedAt = new Date();
    await this.userRepository.save(user);
  }

  /**
   * 사용자 ID로 조회
   */
  async findById(userId: string): Promise<UserEntity | null> {
    return this.userRepository.findById(userId);
  }
}
