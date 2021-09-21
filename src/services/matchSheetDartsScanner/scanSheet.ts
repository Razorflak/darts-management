import { IDataScanResult } from './interfaces/IDataScanResult';
import imgSize from 'image-size';
import { ISizeCalculationResult } from 'image-size/dist/types/interface';
import googleScan from './googleScan';
import TransformImage from './transformImage';
import { protos } from '@google-cloud/vision';
import { IDataScanCoordonate } from './interfaces/IDataScanCoordonate';
import { logError } from '@error/Logger';
import config_BE from '@config/config_BE';
import { getRandomFileName } from 'helper/string';
import getPixels from 'get-pixels';
import { isWhitePixel } from 'helper/image';
import fs from 'fs';

class ScanSheet {
  tempPath = config_BE.matchSheetScanner.pathTmpProcessFolder;

  /**
   * Entry point of the scan process
   * @param imgSourceName Absolute path to the orginal match sheet photo
   * @param coordinatesConf Config file with field coordinates to use
   */
  async scanSheet(imgSourceName: string, coordinatesConf: IDataScanCoordonate): Promise<IDataScanResult> {
    try {
      // First scan to find calibation points
      const initialGoogleScan = await googleScan.scanImg(`${this.tempPath}/${imgSourceName}`);
      // Mock result of the first scann
      const elementsExemple: Array<protos.google.cloud.vision.v1.IEntityAnnotation> =
        initialGoogleScan[0].textAnnotations;
      // Calcul + transform
      const tempNameFile = await this.transformPerspectivImg(imgSourceName, elementsExemple);
      // Resize
      const repScanProcess = config_BE.matchSheetScanner.pathTmpProcessFolder;
      const resizedFilePath = repScanProcess + getRandomFileName('jpg', 10);
      let resizedImgPath = await TransformImage.resize(tempNameFile, resizedFilePath);
      resizedImgPath = await TransformImage.toMonochrome(resizedImgPath, repScanProcess + getRandomFileName('jpg', 10));
      //Second scan by Google API on the flat transformed img
      const dataScanGoogle = await googleScan.scanImg(resizedImgPath);
      return {
        data: this.getFieldValues(dataScanGoogle[0], coordinatesConf),
        checkbox: await this.getCheckBoxesValue(dataScanGoogle[0], coordinatesConf, resizedImgPath)
      };
    } catch (error) {
      logError(error);
      throw error;
    }
  }

  /**
   * return words found in every data define in conf file
   * @param sheetData
   * @param coordinatesConf
   * @returns
   */
  getFieldValues(
    sheetData: protos.google.cloud.vision.v1.IAnnotateImageResponse,
    coordinatesConf: IDataScanCoordonate
  ): { [key: string]: string } {
    const result = {};
    for (const [key, value] of Object.entries(coordinatesConf.data)) {
      //Get real coordinate for this element
      let elementCoordinates = this.getElementCoordinates(value, coordinatesConf, sheetData);
      elementCoordinates = this.applyOffsetOnElementCoordonates(elementCoordinates, 0.1);
      const contentValue = this.getContentWord(elementCoordinates, sheetData);
      result[key] = contentValue;
    }
    return result;
  }

  async getCheckBoxesValue(
    sheetData: protos.google.cloud.vision.v1.IAnnotateImageResponse,
    coordinatesConf: IDataScanCoordonate,
    imgPath: string
  ): Promise<{ [key: string]: number }> {
    const result = {};
    for (const [key, value] of Object.entries(coordinatesConf.checkbox)) {
      //Get real coordinate for this element
      let elementCoordinates = this.getElementCoordinates(value, coordinatesConf, sheetData);
      console.log('BEFORE MARGIN', elementCoordinates);
      elementCoordinates = this.applyOffsetOnElementCoordonates(elementCoordinates, -0.005);
      console.log('AFTER MARGIN', elementCoordinates);
      const croppedImg = await this.createCropCheckBoxes(imgPath, elementCoordinates, key);
      const checkBoxResult = {};
      checkBoxResult[key] = await this.getImgWhitePixelPercent(croppedImg);

      result[key] = checkBoxResult;
    }
    return result;
  }

  private getCalibrationPoints(
    arrayElements: Array<protos.google.cloud.vision.v1.IEntityAnnotation>
  ): Array<protos.google.cloud.vision.v1.IVertex> {
    // Looking for calibration fields in the Google scan result
    const arrayCalibrage: Array<protos.google.cloud.vision.v1.IEntityAnnotation> = arrayElements.filter(
      (x) => x.description === 'MMMMMM'
    );

    if (arrayCalibrage.length !== 4) throw new Error("Erreur de calabrage. Les 4 points n'ont pas été trouvé");
    const result = new Array<protos.google.cloud.vision.v1.IVertex>();
    for (const element of arrayCalibrage) {
      element.boundingPoly.vertices.forEach((element) => {
        result.push(element);
      });
    }
    return result;
  }

  /**
   * retrieves the point at the end of the field
   * @param top is a field at the top of the sheet ?
   * @param left is a field at the left of the sheet ?
   * @param arrayPoints Calibration points found on the sheet
   * @returns
   */
  private getBorderCoordinates(
    top: boolean,
    left: boolean,
    arrayPoints: Array<protos.google.cloud.vision.v1.IVertex>
  ): protos.google.cloud.vision.v1.IVertex | null {
    //Calcul de la moyenne des coordoné x et y
    let moyenneX = 0,
      moyenneY = 0;
    for (const point of arrayPoints) {
      moyenneY += point.y;
      moyenneX += point.x;
    }
    moyenneX = moyenneX / arrayPoints.length;
    moyenneY = moyenneY / arrayPoints.length;

    const pointsMatches = arrayPoints.filter((point) => point.x < moyenneX === left && point.y < moyenneY === top);
    if (pointsMatches.length === 0) {
      throw new Error('getBorderCoordinates, No point found');
    } else if (pointsMatches.length === 1) {
      return pointsMatches[0];
    }
    return this.getBorderCoordinates(top, left, pointsMatches);
  }

  /**
   * Transform the perspective of the original photo in a flat view of the sheet
   * @param imgName name of the original photo (ex: kfnosemfnomze.jpg)
   * @param sheetElements result of the first scan by the Google API
   * @returns
   */
  private async transformPerspectivImg(
    imgName: string,
    sheetElements: Array<protos.google.cloud.vision.v1.IEntityAnnotation>
  ): Promise<string> {
    //Get the 4 calibation fields
    const pointsCalibrage: Array<protos.google.cloud.vision.v1.IVertex> = this.getCalibrationPoints(sheetElements);
    const topLeftPoint: protos.google.cloud.vision.v1.IVertex = this.getBorderCoordinates(true, true, pointsCalibrage);
    const topRightPoint: protos.google.cloud.vision.v1.IVertex = this.getBorderCoordinates(
      true,
      false,
      pointsCalibrage
    );
    const bottomLeftPoint: protos.google.cloud.vision.v1.IVertex = this.getBorderCoordinates(
      false,
      true,
      pointsCalibrage
    );
    const bottomRightPoint: protos.google.cloud.vision.v1.IVertex | null = this.getBorderCoordinates(
      false,
      false,
      pointsCalibrage
    );

    //Getting image dimensions
    let imgData: ISizeCalculationResult;
    try {
      const buffer = fs.readFileSync(`${this.tempPath}/${imgName}`);
      imgData = imgSize(buffer);
      buffer;
    } catch (error) {
      logError(error);
      throw new Error(`Error during getting size of: ${imgName}`);
    }
    //Generating coordinates tranform
    const stringCoordinates = `${topLeftPoint.x},${topLeftPoint.y} 0,0 ${topRightPoint.x},${topRightPoint.y} ${imgData.width},0 ${bottomRightPoint.x},${bottomRightPoint.y} ${imgData.width},${imgData.height} ${bottomLeftPoint.x},${bottomLeftPoint.y} 0,${imgData.height}`;
    const repScanProcess = config_BE.matchSheetScanner.pathTmpProcessFolder;
    const transformedFilePath = repScanProcess + getRandomFileName('jpg', 10);
    //Execute perspectiv transform
    return TransformImage.perspective(repScanProcess + imgName, transformedFilePath, stringCoordinates).then(() => {
      return transformedFilePath;
    });
  }

  /**
   * Return the real coordinates of an element on the sheet
   * @param confElementCoordinates
   * @param coordinatesConf
   * @param googleScan
   * @returns
   */
  getElementCoordinates(
    confElementCoordinates: Array<protos.google.cloud.vision.v1.IVertex>,
    coordinatesConf: IDataScanCoordonate,
    googleScan: protos.google.cloud.vision.v1.IAnnotateImageResponse
  ): Array<protos.google.cloud.vision.v1.IVertex> {
    //ratio calculation

    const googleHeight = googleScan.fullTextAnnotation.pages[0].height;
    const googleWidth = googleScan.fullTextAnnotation.pages[0].width;
    const xRatio = googleWidth / coordinatesConf.referenceSize.x;
    const yRatio = googleHeight / coordinatesConf.referenceSize.y;

    const pointTopLeft = confElementCoordinates[0];
    const pointBottomRight = confElementCoordinates[1];
    const topLeftX = pointTopLeft.x * xRatio;
    const topLeftY = pointTopLeft.y * yRatio;
    const bottomRightX = pointBottomRight.x * xRatio;
    const bottomRightY = pointBottomRight.y * yRatio;
    return [
      { x: topLeftX, y: topLeftY },
      { x: bottomRightX, y: bottomRightY }
    ];
  }

  /**
   *
   * @param coordonates Apply an offset on element coordinates
   * @param offsetPercent
   * @returns
   */
  applyOffsetOnElementCoordonates(
    coordonates: Array<protos.google.cloud.vision.v1.IVertex>,
    offsetPercent: number
  ): Array<protos.google.cloud.vision.v1.IVertex> {
    const topLeftX = Math.round(coordonates[0].x * (1 - offsetPercent));
    const topLeftY = Math.round(coordonates[0].y * (1 - offsetPercent));
    const bottomRightX = Math.round(coordonates[1].x * (1 + offsetPercent));
    const bottomRightY = Math.round(coordonates[1].y * (1 + offsetPercent));
    return [
      { x: topLeftX, y: topLeftY },
      { x: bottomRightX, y: bottomRightY }
    ];
  }

  /**
   * Return words found inner coordinates in elementCoordinates
   *
   * @param elementCoordinates
   * @param dataCoordinates
   * @returns
   */
  private getContentWord(
    elementCoordinates: Array<protos.google.cloud.vision.v1.IVertex>,
    dataCoordinates: protos.google.cloud.vision.v1.IAnnotateImageResponse
  ): string {
    try {
      const allMatchinWords = dataCoordinates.textAnnotations.filter((elem) => {
        const topLeftCoordinatesSheet = elem.boundingPoly.vertices[0];
        const bottomRightCoordinatesSheet = elem.boundingPoly.vertices[2];
        //Conf data calcul
        const topLeftX = elementCoordinates[0].x;
        const topLeftY = elementCoordinates[0].y;
        const bottomRightX = elementCoordinates[1].x;
        const bottomRightY = elementCoordinates[1].y;

        return (
          topLeftCoordinatesSheet.x >= topLeftX &&
          bottomRightCoordinatesSheet.x >= topLeftX &&
          topLeftCoordinatesSheet.y >= topLeftY &&
          bottomRightCoordinatesSheet.y >= topLeftY &&
          topLeftCoordinatesSheet.x <= bottomRightX &&
          bottomRightCoordinatesSheet.x <= bottomRightX &&
          bottomRightCoordinatesSheet.y <= bottomRightY &&
          topLeftCoordinatesSheet.y <= bottomRightY
        );
      });
      let result = '';
      for (const elem of allMatchinWords) {
        result += (elem as protos.google.cloud.vision.v1.IEntityAnnotation).description;
      }
      return result;
    } catch (error) {
      logError(error);
      throw error;
    }
  }

  /**
   *
   * @param imgName
   * @param coordonates
   * @returns
   */
  private async createCropCheckBoxes(
    imgName: string,
    coordonates: Array<protos.google.cloud.vision.v1.IVertex>,
    destTmp: string
  ): Promise<string> {
    return await TransformImage.crop(
      imgName,
      config_BE.matchSheetScanner.pathTmpProcessFolder + destTmp + '.jpg',
      coordonates[0].x,
      coordonates[0].y,
      coordonates[1].x - coordonates[0].x,
      coordonates[1].y - coordonates[0].y
    );
  }

  getImgWhitePixelPercent(imgPath: string): Promise<number> {
    return new Promise((resolve) => {
      getPixels(imgPath, function (err, data) {
        let nbrWhitePixel = 0;
        for (let i = 0; i < data.data.length; i++) {
          const pixel = {
            r: data.data[i],
            g: data.data[i++],
            b: data.data[i++],
            a: data.data[i++]
          };
          isWhitePixel(pixel) && nbrWhitePixel++;
        }
        resolve((100 * nbrWhitePixel) / data.data.length);
      });
    });
  }
}

export default new ScanSheet();
