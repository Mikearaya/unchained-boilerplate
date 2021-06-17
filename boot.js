import { Meteor } from 'meteor/meteor';
import { WebApp } from 'meteor/webapp';
import { startPlatform } from 'meteor/unchained:platform';
import { embedControlpanelInMeteorWebApp } from '@unchainedshop/controlpanel';

import 'meteor/unchained:core-delivery/plugins/post';
import 'meteor/unchained:core-delivery/plugins/pick-mup';
import 'meteor/unchained:core-payment/plugins/invoice';
import 'meteor/unchained:core-pricing/plugins/order-items';
import 'meteor/unchained:core-pricing/plugins/order-discount';
import 'meteor/unchained:core-pricing/plugins/order-delivery';
import 'meteor/unchained:core-pricing/plugins/order-payment';
import 'meteor/unchained:core-pricing/plugins/product-catalog-price';
import 'meteor/unchained:core-worker/plugins/external';
import 'meteor/unchained:core-worker/plugins/http-request';
import 'meteor/unchained:core-worker/plugins/heartbeat';
import 'meteor/unchained:core-worker/plugins/email';
import 'meteor/unchained:core-events/plugins/node-event-emitter';
import './plugins/sausage'

import seed from './seed';

Meteor.startup(async () => {
  await startPlatform({
    introspection: true,

  });

  seed();

  embedControlpanelInMeteorWebApp(WebApp);
});
