import { exec } from 'child_process';
import config from '@config/config_BE';

class TransformImage {
  magickImgPathExe = config.matchSheetScanner.pathImageMagick;

  toMonochrome(imgSrcPath: string, imgDestPath): Promise<string> {
    return new Promise((resolve, reject) => {
      exec(
        `"${this.magickImgPathExe}" "${imgSrcPath}" -monochrome "${imgDestPath}"`,
        {
          cwd: `${__dirname}/../../`
        },
        (error) => {
          if (error) {
            reject(error);
          }
          resolve(imgDestPath);
        }
      );
    });
  }

  resize(imgSrcPath: string, imgDestPath: string): Promise<string> {
    //TODO déterminer la bonne taille pour la feuille de match pour le  resize
    return new Promise((resolve, reject) => {
      exec(
        `"${this.magickImgPathExe}" convert "${imgSrcPath}" -resize 930x1280! ${imgDestPath}`,
        {
          cwd: `${__dirname}/../../`
        },
        (error) => {
          if (error) {
            reject(error);
          }
          resolve(imgDestPath);
        }
      );
    });
  }

  /**
   * Apply a perspective transform to an image
   * @param imgName Image file name
   * @param stringCoordinates coordinate transform string
   * @returns
   */
  perspective(imgSrcPath: string, imgDestPath: string, stringCoordinates: string): Promise<void> {
    return new Promise((resolve, reject) => {
      exec(
        `"${this.magickImgPathExe}" convert "${imgSrcPath}" -matte -virtual-pixel transparent -distort Perspective "${stringCoordinates}" "${imgDestPath}"`,
        {
          cwd: `${__dirname}/../../`
        },
        (error) => {
          if (error) {
            reject(error);
          }
          resolve();
        }
      );
    });
  }

  crop(
    imgSrcPath: string,
    imgDestPath: string,
    offsetX: number,
    offsetY: number,
    width: number,
    height: number
  ): Promise<string> {
    return new Promise((resolve, reject) => {
      exec(
        `"${this.magickImgPathExe}" convert "${imgSrcPath}" -crop ${width}x${height}+${offsetX}+${offsetY} +repage "${imgDestPath}"`,
        {
          cwd: `${__dirname}/../../`
        },

        (error) => {
          if (error) {
            reject(error);
          }
          resolve(imgDestPath);
        }
      );
    });
  }
}

export default new TransformImage();
