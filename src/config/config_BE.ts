import dotenv from 'dotenv';

// Set the NODE_ENV to 'development' by default
process.env.NODE_ENV = process.env.NODE_ENV || 'development';
const envFound = dotenv.config();
if (envFound.error) {
  // This error should crash whole process
  throw new Error("⚠️  Couldn't find .env file  ⚠️");
}
export default {
  env: process.env.NODE_ENV,
  activJwtAuth: process.env.ACTIVE_TOKEN_AUTH,
  tokenDuration: process.env.TOKEN_DURATION,
  /**
   * Your favorite port
   */
  port: parseInt(process.env.PORT, 10),
  /**
   * Your secret sauce
   */
  jwtSecret: process.env.JWT_SIGN_SECRET,
  /**
   * Used by winston logger
   */
  logs: {
    level: process.env.LOG_LEVEL || 'silly'
  },
  /**
   * API configs
   */
  api: {
    prefix: '/api'
  },

  dbPostgres: {
    host: process.env.DBHOST,
    port: process.env.DBPORT,
    name: process.env.DBNAME,
    user: process.env.DBUSER,
    userPwd: process.env.USERPASSWORD
  },

  mailer: {
    adress: process.env.EMAIL_ADRESS,
    password: process.env.EMAIL_PASSWORD
  }
};
//# sourceMappingURL=index.js.map
