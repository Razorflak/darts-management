import IChampionshipMatch from '@interface/IChampionshipMatch';
import IChampionshipMatchClubTeam from '@interface/IChampionshipMatchClubTeam';
import IClubTeam from '@interface/IClubTeam';
import IPlayer from '@interface/IPlayer';
import { Column, ManyToMany, ManyToOne, PrimaryColumn } from 'typeorm';
import ChampionshipMatch from './ChampionshipMatch';
import ClubTeam from './ClubTeam';
import Player from './Player';

export default class ChampionshipMatchClubTeam implements IChampionshipMatchClubTeam {
  @PrimaryColumn()
  id: string;

  @ManyToOne(() => ClubTeam, (clubTeam) => clubTeam.id)
  clubteam: IClubTeam;

  @ManyToOne(() => ChampionshipMatch, (championshipMatch) => championshipMatch.id)
  championshipMatch: IChampionshipMatch;

  @ManyToMany(() => Player, (player) => player.id)
  players: IPlayer[];

  @Column()
  score: number;
}
