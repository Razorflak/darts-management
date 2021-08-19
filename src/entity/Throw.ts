import ILeg from '@interface/ILeg';
import IPlayer from '@interface/IPlayer';
import IThrow from '@interface/IThrow';
import { Column, Entity, PrimaryGeneratedColumn, ManyToOne, ManyToMany } from 'typeorm';
import Leg from './Leg';
import Player from './Player';

@Entity()
export default class Throw implements IThrow {
  @PrimaryGeneratedColumn()
  id: string;

  @Column()
  number: number;

  @Column()
  nbr_darts: number;

  @Column()
  score: number;

  @ManyToMany(() => Leg, (leg) => leg.id, { onDelete: 'CASCADE' })
  leg: ILeg;

  @ManyToOne(() => Player, (player) => player.id)
  player: IPlayer;
}
