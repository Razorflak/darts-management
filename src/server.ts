import express from 'express';
import config from '@config/config_BE';
import { logInfo, typeMessage } from '@error/logger';

import loaderExpress from '@loaders/express';
import loaderTypeORM from '@loaders/typeORM';

async function startServer() {
  const app = express();

  /**
   * A little hack here
   * Import/Export can only be used in 'top-level code'
   * Well, at least in node 10 without babel and at the time of writing
   * So we are using good old require.
   **/
  //await require('./loaders/index').default({ expressApp: app })
  //await require('./loaders/')

  // Pour le moment on fait les appels 1 à 1
  //TODO Revoir pour factoriser ça quand ça deviendra charger...
  loaderExpress({ app });
  loaderTypeORM;
  //await require("@loaders/dbPostgres");

  //await insertDonneesTest();

  app.listen(config.port, () => {
    logInfo('##########Server listening on port: ' + config.port + '##########', typeMessage.Succesful);
  });

  await require('./loaders/multer');
}

startServer();
