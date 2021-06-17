import { Meteor } from 'meteor/meteor';
import { WebApp } from 'meteor/webapp';
import { startPlatform } from 'meteor/unchained:platform';
import { embedControlpanelInMeteorWebApp } from '@unchainedshop/controlpanel';

import 'meteor/unchained:core-payment/plugins/invoice';

import './plugins/delivery-provider-pickup';
import './plugins/delivery-provider-shipping';

import seed from './seed';

Meteor.startup(async () => {
  await startPlatform({
    introspection: true,

  });

  seed();

  embedControlpanelInMeteorWebApp(WebApp);
});
