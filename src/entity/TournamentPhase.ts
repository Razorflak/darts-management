import Tournament from './Tournament';
import ITournamentPhase from '@interface/ITournamentPhase';
import { Entity, PrimaryGeneratedColumn, Column, OneToMany, ManyToOne } from 'typeorm';
import TournamentMatch from './TournamentMatch';

@Entity()
export default class TournamentPhase implements ITournamentPhase {
  @PrimaryGeneratedColumn()
  id: string;

  @Column()
  name: string;

  @Column()
  startDate: Date;

  @Column()
  endDate: Date;

  @OneToMany(() => TournamentMatch, (match) => match.id)
  matches: TournamentMatch[];

  @ManyToOne(() => Tournament, (tournament) => tournament.id, { onDelete: 'CASCADE' })
  tournament: Tournament;
}
