import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, ManyToMany, JoinTable } from 'typeorm';
import IPlayer from '@interface/IPlayer';
import IChampionshipClubTeam from '@interface/IChampionshipClubTeam';
import IChampionshipMatchClubTeam from '@interface/IChampionshipMatchClubTeam';
import IClub from '@interface/IClub';
import ITeam from '@interface/ITeam';

@Entity()
export default class Player implements IPlayer {
  @PrimaryGeneratedColumn()
  id: string;

  @ManyToOne(() => Player, (player) => player.club)
  club: IClub;

  @ManyToOne(() => Player, (player) => player.team)
  team: ITeam;

  @Column()
  firstname: string;

  @Column()
  lastname: string;

  @Column()
  birth_day: Date;

  @Column()
  licenceNumber: string;

  @ManyToMany(() => Category)
  @JoinTable()
  championshipClubTeam: IChampionshipClubTeam[];

  @ManyToMany(() => Category)
  @JoinTable()
  championshipMatchClubTeam: IChampionshipMatchClubTeam[];
}
