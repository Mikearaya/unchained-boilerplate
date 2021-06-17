/* eslint-disable class-methods-use-this */
import {
  DeliveryAdapter,
  DeliveryDirector,
} from 'meteor/unchained:core-delivery';
import { WorkerDirector } from 'meteor/unchained:core-worker';

import prepareOrderRow from '../sheets/prepareOrderRow';

const pickupLocations = [
  {
    _id: 'unchained',
    name: 'unchained.shop',
    address: {
      company: 'Unchained Commcere GmbH',
      addressLine: 'Florastrasse 58',
      addressLine2: 'Erdgeschoss',
      postalCode: '8008',
      city: 'Zürich',
      countryCode: 'CH',
    },
    meta: {
      openingTimes: [
        'Mittwoch 11–12 Uhr oder 16–17 Uhr',
        'Donnerstag 11–12 Uhr oder 16–17 Uhr',
      ],
      mailInfo: `
Pick-Up bei Unchained Commcere GmbH, Erdgeschoss, Florastrasse 58, 8008 Zürich
Mittwoch 11–12 Uhr oder 16–17 Uhr
Donnerstag 11–12 Uhr oder 16–17 Uhr`,
    },
  },
  {
    _id: 'innoarchitects',
    name: 'INNOARCHITECTS',
    address: {
      company: 'INNOARCHITECTS AG',
      addressLine: 'Gurtenbrauerei 31',
      addressLine2: 'Erdgeschoss',
      postalCode: '3084',
      city: 'Wabern bei Bern',
      countryCode: 'CH',
    },
    meta: {
      openingTimes: ['Mittwoch 11–17 Uhr', 'Donnerstag 12–20 Uhr'],
      mailInfo: `
      Pick-Up bei INNOARCHITECTS AG: Erdgeschoss, Gurtenbrauerei 31, 3084, Wabern bei Bern
      Mittwoch 11–17 Uhr
Donnerstag 12–20 Uhr`,
    },
  },
];

class Pickup extends DeliveryAdapter {
  static key = 'ch.unchained-food-delivery.delivery.pickup';

  static label = 'Pick-up';

  static version = '1.0';

  static initialConfiguration = [];

  isActive() {
    return true;
  }

  static typeSupported(type) {
    return type === 'PICKUP';
  }

  configurationError() {
    return null;
  }

  async estimatedDeliveryThroughput() {
    return 0;
  }

  async pickUpLocationById(id) {
    return pickupLocations.find((store) => store._id === id);
  }

  async pickUpLocations() {
    return pickupLocations;
  }

  async send(transactionContext) {
    const { order } = this.context;

    const input = await prepareOrderRow(order, transactionContext.meta);

    WorkerDirector.addWork({
      type: 'GOOGLE_SHEET',
      input,
    });

    return true;
  }
}

DeliveryDirector.registerAdapter(Pickup);
