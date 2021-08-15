import IChampionshipMatch from '@interface/IChampionshipMatch';
import IMatch from '@interface/IMatch';
import ISet from '@interface/ISet';
import ITeam from '@interface/ITeam';
import { Entity, JoinTable, ManyToMany, OneToMany, PrimaryGeneratedColumn, ManyToOne } from 'typeorm';
import ChampionshipMatch from './ChampionshipMatch';
import Set from './Set';
import Team from './Team';

@Entity()
export default class Match implements IMatch {
  @PrimaryGeneratedColumn()
  id: string;

  @ManyToMany(() => Team)
  @JoinTable()
  teams: ITeam[];

  @ManyToOne(() => ChampionshipMatch, (championshipMatch) => championshipMatch.id, {
    nullable: true,
    onDelete: 'CASCADE'
  })
  championshipMatch: IChampionshipMatch;

  @OneToMany(() => Set, (set) => set.id)
  sets: ISet[];

  @ManyToOne(() => Team, (team) => team.id, { onDelete: 'CASCADE' })
  winner: ITeam;
}
