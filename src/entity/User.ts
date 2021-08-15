import { Entity, PrimaryGeneratedColumn, Column } from 'typeorm';
import IUser from '@interface/IUser';
import IPlayer from '@interface/IPlayer';
@Entity()
export class User implements IUser {
  // @PrimaryGeneratedColumn()
  // id: string;
  // @Column()
  // firstName: string;
  // @Column()
  // lastName: string;
  // @Column()
  // age: number;

  @PrimaryGeneratedColumn()
  id: string;

  @Column()
  mail: string;

  @Column()
  password: string;

  // @Column({ nullable: true })
  player: IPlayer;

  @Column({ nullable: true })
  emailValidationCode: string | null;

  @Column({ nullable: true })
  isAccountValidated: boolean | null;
}
