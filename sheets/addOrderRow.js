/* eslint-disable no-underscore-dangle, no-param-reassign */
import * as Sentry from '@sentry/node';
import { GoogleSpreadsheet } from 'google-spreadsheet';

const {
  GOOGLE_SERVICE_ACCOUNT_EMAIL,
  GOOGLE_PRIVATE_KEY,
  GOOGLE_SPREADSHEET_ID,
} = process.env;

const getTitleColIndexMapping = (titles, rows, minMatchingTitles = 4) => {
  const titleRow = rows.find((row) => {
    const matches = titles.reduce(
      (prev, title) =>
        row.find(
          (cell) =>
            typeof cell.value === 'string' &&
            cell.value?.trim().toLowerCase() === title.trim().toLowerCase(),
        )
          ? prev + 1
          : prev,
      0,
    );

    if (matches > minMatchingTitles) {
      return true;
    }

    return false;
  });

  const titleEntries = titles.map((title) => {
    const index = titleRow.findIndex(
      (cell) => cell.value?.trim().toLowerCase() === title.trim().toLowerCase(),
    );
    return [title, index];
  });

  return Object.fromEntries(titleEntries);
};

const isValueTimestampString = (value) => {
  const isoTimestampPattern = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/;
  return value && typeof value === 'string' && isoTimestampPattern.test(value);
};

const getNextRowIndex = (rows, checkIndex, offset = 10) => {
  const lastEntryRowIndex = rows.findIndex((row, index) => {
    return !row[checkIndex].value && index > offset;
  });

  if (lastEntryRowIndex === -1) {
    throw new Error(
      `Google Spreadsheet Error: No empty rows available. SpreadsheetId ${GOOGLE_SPREADSHEET_ID}`,
    );
  }

  return lastEntryRowIndex;
};

const fixDateTimeCell = (cell, value) => {
  const t = new Date(value);
  const timeZoneOffset = 2;
  cell.formula = `=(${
    t.getTime() / 1000
  })/86400+DATE(1970,1,1)+time(${timeZoneOffset},0,0)`;
  return cell;
};

const getOrdersSheet = async () => {
  try {
    console.log('Loading Google Spreadsheet', {
      GOOGLE_SPREADSHEET_ID,
      GOOGLE_SERVICE_ACCOUNT_EMAIL,
    });
    // spreadsheet key is the long id in the sheets URL
    const doc = new GoogleSpreadsheet(GOOGLE_SPREADSHEET_ID);

    /**
     * '1KKUjl4hg0Fcxcr2HHXdpYybb3qiUm2EWZy97LUixJK0', // Staging Sheet von Thilly
     * '1dOc4GUhh2JON6rZ0tV8Q5Mw5z0IqV_yyUyNWZjCC4CQ', // Dev Sheet von Simon
     */

    await doc.useServiceAccountAuth({
      client_email: GOOGLE_SERVICE_ACCOUNT_EMAIL,
      private_key: GOOGLE_PRIVATE_KEY,
    });

    await doc.loadInfo();

    const sheet =
      doc.sheetsByIndex.find(
        ({ _rawProperties }) =>
          _rawProperties.title.trim().toLowerCase() === 'bestellungen',
      ) || doc.sheetsByIndex[0];

    // await sheet.loadHeaderRow();
    return sheet;
  } catch (error) {
    console.error('Error in getOrdersSheet', error);
    throw error;
  }
};

const addOrderRow = async ({ products, ...payload }) => {
  const sheet = await getOrdersSheet();

  try {
    const prodRows = Object.fromEntries(
      (products || [])
        ?.map(({ sku, quantity, price }) => {
          return [
            [`product.${sku}.quantity`, quantity],
            [`product.${sku}.price`, price],
          ];
        })
        .flat(),
    );
    const rowCommand = {
      ...payload,
      ...prodRows,
    };

    await sheet.loadCells();

    const titleColIndexMapping = getTitleColIndexMapping(
      Object.keys(rowCommand),
      sheet._cells,
    );

    const nextRowIndex = getNextRowIndex(
      sheet._cells,
      titleColIndexMapping.timestamp,
    );

    const nextRow = sheet._cells[nextRowIndex];

    const unmapped = Object.entries(titleColIndexMapping).reduce(
      (acc, [title, colIndex]) => {
        if (colIndex > -1) {
          if (isValueTimestampString(rowCommand[title])) {
            fixDateTimeCell(nextRow[colIndex], rowCommand[title]);
          } else if (typeof rowCommand[title] === 'number') {
            nextRow[colIndex].value = rowCommand[title];
            nextRow[colIndex].valueType = 'numberValue';
          } else {
            nextRow[colIndex].value = rowCommand[title]?.toString();
          }
          return acc;
        }

        return rowCommand[title]
          ? { ...acc, [title]: rowCommand[title]?.toString() }
          : acc;
      },
      {},
    );

    if (Object.values(unmapped).length) {
      fixDateTimeCell(nextRow[0], rowCommand.timestamp);
      nextRow[0].note = `Uneinorderbare Informationen: \n\n ${Object.entries(
        unmapped,
      )
        .map(([key, value]) => `${key}: ${value}`)
        .join('\n')}`;
    }

    await sheet.saveUpdatedCells();

    return rowCommand;
  } catch (error) {
    console.error('Error in addOrderRow', error);
    Sentry.captureException(error, payload);
    throw error;
  }
};

export default addOrderRow;
