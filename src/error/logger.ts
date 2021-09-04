import { terminal } from 'terminal-kit';
///import winston from "winston";
import logger from '@loaders/winston';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function logError(err: any): void {
  terminal.red(err.message + '\n');
  //Log vers les fichiers (avec winston)
  logger.error(err.code + ' : ' + err.message);
}

export function logDev(message: string) {
  message += '\n';
  terminal.magenta(message);
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function logInfo(message: any, type: number = typeMessage.Info) {
  //Obligé de rajouter le saut d eligne à la main...
  message += '\n';
  switch (type) {
    case typeMessage.Succesful:
      terminal.green(message);
      break;
    case typeMessage.Error:
      terminal.red(message);
      break;
    case typeMessage.Info:
      terminal.blue(message);
      break;
    case typeMessage.Warning:
      terminal.orange(message);
      break;
  }
}

export enum typeMessage {
  Succesful = 1,
  Error = 2,
  Info = 3,
  Warning = 4
}
