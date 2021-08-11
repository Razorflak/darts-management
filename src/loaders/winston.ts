import { createLogger } from 'winston';
import DailyRotateFile = require('winston-daily-rotate-file');
import config from '@config/config_BE';
const logger = createLogger({
  transports: [
    new DailyRotateFile({
      dirname: `log/${config.env}`,
      filename: 'application-%DATE%.log',
      datePattern: 'YYYY-MM-DD-HH',
      zippedArchive: true,
      maxSize: '20m',
      maxFiles: '14d'
    })
  ]
});

export default logger;
