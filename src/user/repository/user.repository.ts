import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { UserEntity } from '../entity/user.entity';

@Injectable()
export class UserRepository {
  constructor(
    @InjectRepository(UserEntity)
    private userRepository: Repository<UserEntity>,
  ) {}

  /**
   * Provider와 Sub로 사용자 조회
   */
  async findByProviderAndSub(
    provider: string,
    sub: string,
  ): Promise<UserEntity | null> {
    return this.userRepository.findOne({
      where: { provider, sub },
    });
  }

  /**
   * 사용자 ID로 조회
   */
  async findById(id: string): Promise<UserEntity | null> {
    return this.userRepository.findOne({
      where: { id },
    });
  }

  /**
   * 사용자 저장
   */
  async save(user: UserEntity): Promise<UserEntity> {
    return this.userRepository.save(user);
  }
}
