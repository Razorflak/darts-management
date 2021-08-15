import IChampionship from '@interface/IChampionship';
import IChampionshipMatch from '@interface/IChampionshipMatch';
import IChampionshipMatchClubTeam from '@interface/IChampionshipMatchClubTeam';
import IMatch from '@interface/IMatch';
import { Column, ManyToOne, OneToMany, PrimaryColumn } from 'typeorm';
import Championship from './Championship';
import ChampionshipMatchClubTeam from './ChampionshipMatchClubTeam';
import Match from './Match';

export default class ChampionshipMatch implements IChampionshipMatch {
  @PrimaryColumn()
  id: string;

  @ManyToOne(() => Championship, (championship) => championship.id)
  championship: IChampionship;

  @OneToMany(
    () => ChampionshipMatchClubTeam,
    (championshipMatchClubTeam) => championshipMatchClubTeam.championshipMatch
  )
  championshipMatchClubTeam: IChampionshipMatchClubTeam[];

  @Column()
  championship_day: number;

  @Column()
  match_date?: Date;

  @Column()
  scheduled_match_date: Date;

  @OneToMany(() => Match, (match) => match.id)
  matches: IMatch[];
}
