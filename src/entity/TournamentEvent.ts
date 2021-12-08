import ITournamentEvent from '@interface/ITournamentEvent';
import { Column, Entity, OneToMany, PrimaryGeneratedColumn } from 'typeorm';
import Tournament from './Tournament';

@Entity()
export default class TournamentEvent implements ITournamentEvent {
  @PrimaryGeneratedColumn()
  id: string;

  @Column()
  name: string;

  @Column()
  startDate: Date;

  @Column()
  endDate: Date;

  @Column()
  place: string;

  @OneToMany(() => Tournament, (tournament) => tournament.id)
  tournaments: Tournament[];
}
