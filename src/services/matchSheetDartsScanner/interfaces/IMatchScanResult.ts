import { IScanWarning } from './IScanWarning';
import { ISheetCheckBox } from './ISheetCheckBox';
export interface IScanMatchResult {
  checkboxes: ISheetCheckBox[];
  warning: IScanWarning;
}
