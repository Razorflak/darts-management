import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, ManyToMany, JoinTable } from 'typeorm';
import IPlayer from '@interface/IPlayer';
import IClub from '@interface/IClub';
import ITeam from '@interface/ITeam';
import ChampionshipClubTeam from './ChampionshipClubTeam';
import ChampionshipMatchClubTeam from './ChampionshipMatchClubTeam';
import Club from './Club';
import Team from './Team';

@Entity()
export default class Player implements IPlayer {
  @PrimaryGeneratedColumn()
  id: string;

  @ManyToOne(() => Club, (club) => club.id, { onDelete: 'SET NULL' })
  club: IClub;

  @ManyToMany(() => Team)
  @JoinTable()
  team: ITeam;

  @Column({ nullable: true })
  firstname: string;

  @Column({ nullable: true })
  lastname: string;

  @Column({ nullable: true })
  birthDay: Date;

  @Column({ nullable: true })
  birthCity: string;

  @Column({ nullable: true })
  mail: string;

  @Column({ nullable: true })
  licenceNumber: string;

  @ManyToMany(() => ChampionshipClubTeam, { cascade: true })
  @JoinTable()
  championshipClubTeam: ChampionshipClubTeam[];

  @ManyToMany(() => ChampionshipMatchClubTeam, { cascade: true })
  @JoinTable()
  championshipMatchClubTeam: ChampionshipMatchClubTeam[];
}
