import { Entity, PrimaryGeneratedColumn, Column, OneToOne, JoinColumn } from 'typeorm';
import IUser from '@interface/IUser';
import IPlayer from '@interface/IPlayer';
import Player from './Player';
@Entity()
export default class User implements IUser {
  @PrimaryGeneratedColumn()
  id: string;

  @Column()
  mail: string;

  @Column()
  password: string;

  @OneToOne(() => Player)
  @JoinColumn()
  player: IPlayer;

  @Column({ nullable: true })
  emailValidationCode: string | null;

  @Column({ nullable: true })
  isAccountValidated: boolean | null;
}
