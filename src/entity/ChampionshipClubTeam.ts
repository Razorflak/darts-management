import IChampionship from '@interface/IChampionship';
import IChampionshipClubTeam from '@interface/IChampionshipClubTeam';
import IClubTeam from '@interface/IClubTeam';
import IPlayer from '@interface/IPlayer';
import { Column, Entity, ManyToMany, ManyToOne, PrimaryGeneratedColumn } from 'typeorm';
import ClubTeam from './ClubTeam';
import Championship from './Championship';
import Player from './Player';

@Entity()
export default class ChampionshipClubTeam implements IChampionshipClubTeam {
  @PrimaryGeneratedColumn()
  id: string;

  @ManyToOne(() => ClubTeam, (clubTeam) => clubTeam.id, { onDelete: 'CASCADE' })
  clubteam: IClubTeam;

  @ManyToOne(() => Championship, (championship) => championship.id, { onDelete: 'CASCADE' })
  championship: IChampionship;

  @ManyToMany(() => Player, (player) => player.id, { cascade: true })
  players: IPlayer[];

  @Column()
  points: number;

  @Column()
  goalaverage: number;

  @Column()
  number_match_played: number;
}
