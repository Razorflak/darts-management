import 'reflect-metadata';
import { createConnection } from 'typeorm';
import DataTestingInsertion from 'mocks/DataTestingInsertion';
import { logInfo } from '@error/logger';

export default createConnection()
  .then((connection) => {
    DataTestingInsertion(connection);
  })
  .catch((error) => logInfo('Error during initialisation of TypeORM\n' + error));
