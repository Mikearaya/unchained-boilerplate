import { DeliveryProviderType } from 'meteor/unchained:core-delivery';

export default {
  deliveryProviders: [
    {
      _id: 'unchained-delivery-pickup',
      adapterKey: 'unchained-delivery.pickup',
      type: DeliveryProviderType.PICKUP,
      configuration: [
        {
          key: 'swiss-tax-category',
          value: 'reduced',
        },
        {
          key: 'is-default',
          value: 'true',
        },
      ],
    },
    {
      _id: 'unchained-delivery-shipping',
      adapterKey: 'unchained-delivery.shipping',
      type: DeliveryProviderType.SHIPPING,
      configuration: [
        {
          key: 'swiss-tax-category',
          value: 'reduced',
        },
      ],
    },
  ],
};
