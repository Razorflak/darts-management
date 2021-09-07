import multer from 'multer';
import { logInfo } from '../error/Logger';
import appRoutePath from 'app-root-path';
import path from 'path';

const storageImgCommerce = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, `${appRoutePath}/tmp/img`);
  },
  filename: function (req, file, cb) {
    cb(null, Date.now() + path.extname(file.originalname)); //Appending extension
  }
});

const destImgCommerce = multer({
  storage: storageImgCommerce
});

export function fileUpload(req, res, next) {
  destImgCommerce.single('file')(req, res, next);
}

logInfo('####### MULTER Loaded #######');
