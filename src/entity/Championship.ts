import IChampionship from '@interface/IChampionship';
import IChampionshipClubTeam from '@interface/IChampionshipClubTeam';
import ICommitte from '@interface/ICommitte';
import { Column, Entity, ManyToMany, ManyToOne, PrimaryColumn } from 'typeorm';
import ChampionshipClubTeam from './ChampionshipClubTeam';
import Committe from './Committe';

@Entity()
export default class Championship implements IChampionship {
  @PrimaryColumn()
  id: string;

  @ManyToMany(() => ChampionshipClubTeam, { cascade: true })
  championshipClubTeam: IChampionshipClubTeam[];

  @ManyToOne(() => Committe, (committe) => committe.id, { onDelete: 'CASCADE' })
  committe: ICommitte;

  @Column()
  name: string;

  @Column()
  start_date: Date;

  @Column()
  end_date: Date;
}
