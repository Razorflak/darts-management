import { logError } from '@error/Logger';
import { Router } from 'express';
import MailService from 'services/MailerService';
import listEmailTemplate from '@mailTemplate/mails.json';
import scanSheet from 'services/matchSheetDartsScanner/scanSheet';
import coordinates from '@services/matchSheetDartsScanner/config/coordinatesElementsMatchSheet.json';

const route = Router();
export default (app: Router) => {
  //Initialisation des instance de controleur

  app.use('/dev', route);

  route.get('/test', async (req, res) => {
    const result = 'Dev Route';
    res.send(result);
  });
  route.get('/testmail', async (req, res) => {
    try {
      MailService.sendMail(
        'tanguyj35@gmail.com',
        listEmailTemplate.validationEmail.subject,
        listEmailTemplate.validationEmail.template,
        { firstName: 'Julien' }
      );
      res.send('TOTO');
    } catch (error) {
      res.send(error);
    }
  });

  route.get('/testscan', async (req, res) => {
    try {
      res.send(await scanSheet.scanSheet('_12131312.jpg', coordinates));
    } catch (error) {
      logError(error);
      res.send('KO');
    }
  });
};
