import IMatch from '@interface/IMatch';
import ITeam from '@interface/ITeam';
import { Entity, JoinTable, ManyToMany, PrimaryGeneratedColumn } from 'typeorm';
import Match from './Match';

@Entity()
export default class Team implements ITeam {
  @PrimaryGeneratedColumn()
  id: string;

  @ManyToMany(() => Match)
  @JoinTable()
  matches: IMatch[];
}
