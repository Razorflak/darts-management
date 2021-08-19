import IChampionshipMatch from '@interface/IChampionshipMatch';
import IChampionshipMatchClubTeam from '@interface/IChampionshipMatchClubTeam';
import IClubTeam from '@interface/IClubTeam';
import IPlayer from '@interface/IPlayer';
import { Column, Entity, ManyToMany, ManyToOne, PrimaryGeneratedColumn } from 'typeorm';
import ChampionshipMatch from './ChampionshipMatch';
import ClubTeam from './ClubTeam';
import Player from './Player';

@Entity()
export default class ChampionshipMatchClubTeam implements IChampionshipMatchClubTeam {
  @PrimaryGeneratedColumn()
  id: string;

  @ManyToOne(() => ClubTeam, (clubTeam) => clubTeam.id, { onDelete: 'CASCADE' })
  clubteam: IClubTeam;

  @ManyToOne(() => ChampionshipMatch, (championshipMatch) => championshipMatch.id, { onDelete: 'CASCADE' })
  championshipMatch: IChampionshipMatch;

  @ManyToMany(() => Player, (player) => player.id, { cascade: true })
  players: IPlayer[];

  @Column()
  score: number;
}
