import { Router } from 'express';

const route = Router();
export default (app: Router) => {
  //Initialisation des instance de controleur

  app.use('/dev', route);

  route.get('/test', async (req, res) => {
    const result = 'Dev Route';
    res.send(result);
  });
};
