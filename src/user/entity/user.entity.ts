import {
  Column,
  Entity,
  PrimaryColumn,
  CreateDateColumn,
  UpdateDateColumn,
  Unique,
} from 'typeorm';

@Entity('users', { schema: 'public' })
@Unique(['provider', 'sub'])
export class UserEntity {
  @PrimaryColumn('varchar', { length: 26 })
  id: string;

  @Column()
  email: string;

  @Column()
  provider: string;

  @Column({ name: 'provider_sub' })
  sub: string;

  @Column({ name: 'term_agreed', default: false })
  termAgreed: boolean;

  @Column({ type: 'timestamp', name: 'agreed_at', nullable: true })
  agreedAt: Date | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
