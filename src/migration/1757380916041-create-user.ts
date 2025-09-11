import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateUser1757380916041 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
            CREATE TABLE users (
                id VARCHAR(26) PRIMARY KEY,
                email VARCHAR(255) UNIQUE,
                provider VARCHAR(50) NOT NULL,   
                provider_sub VARCHAR(255) NOT NULL,
                term_agreed BOOLEAN DEFAULT FALSE,
                agreed_at TIMESTAMP,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP, 
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP 
            )
        `);

    await queryRunner.query(
      `COMMENT ON COLUMN users.provider IS '로그인 제공자 (google, kakao 등)';`,
    );
    await queryRunner.query(
      `COMMENT ON COLUMN users.provider_sub IS '로그인 제공자 고유 아이디';`,
    );
    await queryRunner.query(
      `COMMENT ON COLUMN users.term_agreed IS '약관 동의 여부';`,
    );
    await queryRunner.query(
      `COMMENT ON COLUMN users.agreed_at IS '약관 동의 시각 (null 가능)';`,
    );
    await queryRunner.query(
      `COMMENT ON COLUMN users.created_at IS '생성 시각';`,
    );
    await queryRunner.query(
      `COMMENT ON COLUMN users.updated_at IS '마지막 접속 시각';`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE users`);
  }
}
