import ILeg from '@interface/ILeg';
import IMatch from '@interface/IMatch';
import ISet from '@interface/ISet';
import ITeam from '@interface/ITeam';
import { Entity, ManyToOne, OneToMany, PrimaryGeneratedColumn } from 'typeorm';
import Leg from './Leg';
import Match from './Match';
import Team from './Team';

@Entity()
export default class Set implements ISet {
  @PrimaryGeneratedColumn()
  id: string;

  @ManyToOne(() => Match, (match) => match.id, { onDelete: 'CASCADE' })
  match: IMatch;

  @OneToMany(() => Leg, (leg) => leg.id)
  legs: ILeg[];

  @ManyToOne(() => Team, (team) => team.id)
  winner: ITeam;
}
