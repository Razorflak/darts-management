import { Router } from 'express';
import UserService from 'services/userService';

const route = Router();
export default (app: Router) => {
  app.use('/register', route);

  route.put('/', async (req, res) => {
    try {
      const result = await UserService.createUser(req.body);
      res.send(result);
    } catch (error) {
      res.status(500).send({ error: error });
    }
  });
};
