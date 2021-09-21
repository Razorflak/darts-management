import { logInfo } from '@error/Logger';
import gv from '@google-cloud/vision';
import { protos } from '@google-cloud/vision';

class GoogleVision {
  /**
   * Send an img to the Google APi to be scan with the Vision process
   * @param imgPath Absolute path to the img
   * @returns
   */
  async scanImg(imgPath: string): Promise<[protos.google.cloud.vision.v1.IAnnotateImageResponse]> {
    try {
      logInfo(`Scan by googleApi of file ${imgPath}`);
      const client = new gv.ImageAnnotatorClient();

      // Performs label detection on the image file
      const result = await client.documentTextDetection(imgPath);
      return result;
    } catch (error) {
      throw `Error during scan by Google API: ${error}`;
    }
  }

  /*******************************
   *  		Google Auth
   *******************************/

  /*private async getJsonCredential(): Promise<any> {
    try {
      const content: string = await new Promise((resolve, reject) => {
        fs.readFile(`${appPath}/config/googleCrendential.json`, (err, data) => {
          if (err) {
            reject('Error loading client secret file');
          }
          resolve(data.toString());
        });
      });
      return JSON.parse(content);
    } catch (error) {
      logError(error);
      throw error;
    }
  }*/
}

export default new GoogleVision();
