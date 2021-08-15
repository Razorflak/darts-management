import IChampionshipClubTeam from '@interface/IChampionshipClubTeam';
import IClub from '@interface/IClub';
import IClubTeam from '@interface/IClubTeam';
import { Column, Entity, ManyToOne, OneToMany, PrimaryGeneratedColumn } from 'typeorm';
import ChampionshipClubTeam from './ChampionshipClubTeam';
import Club from './Club';

@Entity()
export default class ClubTeam implements IClubTeam {
  @PrimaryGeneratedColumn()
  id: string;

  @ManyToOne(() => Club, (club) => club.id, { onDelete: 'CASCADE' })
  club: IClub;

  @Column()
  name: string;

  @OneToMany(() => ChampionshipClubTeam, (championshipClubTeam) => championshipClubTeam.id)
  championshipClubTeam: IChampionshipClubTeam[];
}
