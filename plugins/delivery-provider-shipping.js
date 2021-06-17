/* eslint-disable class-methods-use-this */
import {
  DeliveryAdapter,
  DeliveryDirector,
} from 'meteor/unchained:core-delivery';
import { WorkerDirector } from 'meteor/unchained:core-worker';

import prepareOrderRow from '../sheets/prepareOrderRow';

class Delivery extends DeliveryAdapter {
  static key = 'unchained-shipping';

  static label = 'Heimlieferung';

  static version = '1.0';

  static initialConfiguration = [];

  static typeSupported(type) {
    return type === 'SHIPPING';
  }

  isActive() {
    return true;
  }

  async estimatedDeliveryThroughput() {
    return 0;
  }

  configurationError() {
    return null;
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

DeliveryDirector.registerAdapter(Delivery);
