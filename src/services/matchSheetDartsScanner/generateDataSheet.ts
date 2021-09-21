import { ISheetCheckBox } from './interfaces/ISheetCheckBox';
import { ISheetDoubleTeam } from './interfaces/ISheetDoubleTeam';
import { ISheetPlayer } from './interfaces/ISheetPlayer';
import FuzzySet from 'fuzzyset';
import { logError } from '@error/Logger';
import IChampionshipMatch from '@interface/IChampionshipMatch';
import { IDataScanResult } from './interfaces/IDataScanResult';
import moment from 'moment';
import { getManager } from 'typeorm';
import Player from '@entity/Player';

class GenerateDataSheet {
  /**
   * In this class we will transform the raw datas get from the sheet into model Entities
   */

  createChampionshipMatchFromRawData(): IChampionshipMatch {
    return null;
  }

  getMatchDate(dataSheet: IDataScanResult): Date {
    try {
      const rawDateArray = Object.keys(dataSheet)
        .filter((key) => key.includes('dateMatch'))
        .reduce((arrayDate, key) => {
          arrayDate.push(dataSheet[key]);
          return arrayDate;
        }, []);
      let i = 0;
      const dateMomentObject = moment(
        `${rawDateArray[i]}${rawDateArray[i++]}
    /${rawDateArray[i++]}${rawDateArray[i++]}
    /${rawDateArray[i++]}${rawDateArray[i++]}`,
        'DD/MM/YY'
      );
      return dateMomentObject.toDate();
    } catch (error) {
      logError(error);
      throw error;
    }
  }
  async getPlayers(dataSheet: IDataScanResult): Promise<Array<ISheetPlayer>> {
    const players = await getManager().getRepository(Player).find(); // TODO add a filter to get only player from a committe
    const fuzzy = FuzzySet();
    players.forEach((element) => {
      fuzzy.add(element.licenceNumber);
    });
    const sheetPlayer = Object.keys(dataSheet)
      .filter((key) => key.includes('licence'))
      .reduce((arrayMatchSheetPlayer, key) => {
        try {
          const fuzzyResult = fuzzy.get(dataSheet[key]);
          if (fuzzyResult.length === 0) throw `No Fuzzy data found for field ${key} with data ${dataSheet[key]}`;
          const player = players.find((player) => player.licenceNumber === fuzzyResult[0][1]);
          arrayMatchSheetPlayer.push({
            letter: key.slice(-1),
            player
          });
        } catch (error) {
          logError(error);
          arrayMatchSheetPlayer.push({
            letter: key.slice(-1),
            player: undefined
          });
        }
        return arrayMatchSheetPlayer;
      }, []);
    return sheetPlayer;
  }

  getPlayersDoubleTeam(matchPlayers: ISheetPlayer[], dataSheet: IDataScanResult): ISheetDoubleTeam[] {
    try {
      const sheetDoubleTeams = Object.keys(dataSheet)
        .filter((key) => key.includes('double'))
        .reduce((arrayMatchSheetDoubleTeam, key) => {
          const letters = dataSheet[key].replace(/[^abcdefghABCDEFGH]+/g, '');
          const players = [];
          try {
            if (letters.length !== 2) throw `Found more or less than 2 letters on double team fields: ${key}`;
            let i = letters.length;
            while (i--) {
              players.push(matchPlayers.find((player) => player.letter === letters[i]).player);
            }
          } catch (error) {
            logError(error);
          }
          arrayMatchSheetDoubleTeam.push({
            letter: key.slice(-2),
            players
          });
          return arrayMatchSheetDoubleTeam;
        }, []);
      return sheetDoubleTeams;
    } catch (error) {
      logError(error);
      throw error;
    }
  }

  getSheetCheckboxChecked(checkBoxs: Array<{ key: string; value: number }>): ISheetCheckBox[] {
    const arrayCheckBoxes: ISheetCheckBox[] = checkBoxs.map((element) => {
      return {
        key: element.key,
        whitePixelPercent: element.value,
        isChecked: false
      };
    });
    arrayCheckBoxes.sort((a, b) => a.whitePixelPercent - b.whitePixelPercent);
    //Logic
    /**
     * We assumed that box 0 to 3 are white.
     *
     */

    //get max delta for white boxes
    let maxWhiteBoxDelta = 0;
    for (let i = 0; i < 4; i++) {
      if (i === 0) continue;
      const currentDelta = arrayCheckBoxes[i].whitePixelPercent - arrayCheckBoxes[i - 1].whitePixelPercent;
      if (currentDelta > maxWhiteBoxDelta) maxWhiteBoxDelta = currentDelta;
    }
    maxWhiteBoxDelta += 10; //Apply an arbitrary margin //TODO Gonna need to play with this value to find the right one
    const referenceWhiteBox = arrayCheckBoxes[3]; //Reference cause this is the last who have to be white
    arrayCheckBoxes.forEach((element) => {
      if (element.whitePixelPercent > referenceWhiteBox.whitePixelPercent + maxWhiteBoxDelta) {
        element.isChecked = true;
      }
    });
    return arrayCheckBoxes;
  }
}

export default new GenerateDataSheet();
