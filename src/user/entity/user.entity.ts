import {
  Column,
  Entity,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
  Unique,
} from 'typeorm';

@Entity('users', { schema: 'public' })
@Unique(['provider', 'sub'])
export class UserEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  email: string;

  @Column()
  provider: string;

  @Column({ name: 'sub' })
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
