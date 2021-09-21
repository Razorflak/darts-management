import { protos } from '@google-cloud/vision';

export interface IDataScanCoordonate {
  calibrationWord: Array<string>;
  referenceSize: {
    x: number;
    y: number;
  };
  data: {
    [key: string]: Array<protos.google.cloud.vision.v1.IVertex>;
  };
  checkbox: {
    [key: string]: Array<protos.google.cloud.vision.v1.IVertex>;
  };
}
