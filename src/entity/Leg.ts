import ILeg from '@interface/ILeg';
import ISet from '@interface/ISet';
import ITeam from '@interface/ITeam';
import IThrow from '@interface/IThrow';
import { Entity, ManyToOne, OneToMany, PrimaryGeneratedColumn } from 'typeorm';
import Set from './Set';
import Team from './Team';
import Throw from './Throw';

@Entity()
export default class Leg implements ILeg {
  @PrimaryGeneratedColumn()
  id: string;

  @ManyToOne(() => Set, (set) => set.id, { onDelete: 'CASCADE' })
  set: ISet;

  @OneToMany(() => Throw, (_throw) => _throw.id)
  throws: IThrow[];

  @ManyToOne(() => Team, (team) => team.id)
  winner: ITeam;
}
