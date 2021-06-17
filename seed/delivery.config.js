import { DeliveryProviderType } from 'meteor/unchained:core-delivery';

export default {
  deliveryProviders: [
    {
      _id: 'unchained-food-delivery-pickup',
      adapterKey: 'ch.unchained-food-delivery.delivery.pickup',
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
      _id: 'unchained-food-delivery-shipping',
      adapterKey: 'ch.unchained-food-delivery.delivery.shipping',
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
