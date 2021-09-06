import jwt from 'jsonwebtoken';
import config_BE from '@config/config_BE';
import IUser from '@interface/IUser';

/**
 * Create a new token to auth to the API
 * @param user User
 * @returns JWT token
 */
export function generateTokenForUser(user: IUser): string {
  return jwt.sign(
    {
      userId: user.id,
      isAdmin: false
    },
    config_BE.jwtSecret,
    {
      expiresIn: config_BE.tokenDuration
    }
  );
}

/**
 * Validate or not the token defined in the header
 * @param req Request
 * @param res Response
 * @param next go Next
 */
export function validateToken(req, res, next) {
  //Free pass on dev if activJwtAuth is true
  if (config_BE.env === 'development' && !config_BE.activJwtAuth) {
    next();
  }
  const headerAuth: string = req.get('authorization');
  const token = headerAuth !== null ? headerAuth.replace('Bearer ', '') : null;
  if (!token) {
    throw new Error('Missing TOKEN !');
  }
  //Validation du TOKEN
  const jwtToken = jwt.verify(token, config_BE.jwtSecret);
  if (jwtToken) {
    req.body.userId = parseInt(jwtToken['userId']);
    next();
  } else {
    throw new Error('TOKEN invalid');
  }
}
