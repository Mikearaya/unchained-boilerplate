import {
  DeliveryPricingDirector,
  DeliveryPricingAdapter,
} from 'meteor/unchained:core-pricing';
import { OrderDeliveries } from 'meteor/unchained:core-orders';

const DeliveryInfoTypes = {
  MIN_ORDER_VALUE: 'MIN_ORDER_VALUE',
  FEE: 'FEE',
  FREE: 'FREE',
};

const UNKNOWN_DELIVERY_COST_CLASS = {
  name: 'unbekannt. Bitte Postleitzahl eingeben.',
  minOrderValue: 0,
  deliveryFee: 0,
  freeDeliveryThreshold: 999999999,
  confirmationMessage: 'Lieferkosten unbekannt',
};

const DEFAULT_DELIVERY_COST_CLASS = {
  name: 'Ganze Schweiz',
  minOrderValue: 6000,
  deliveryFee: 1500,
  freeDeliveryThreshold: 12000,
  confirmationMessage:
    'Wir bringen dein Paket am Mittwoch auf die Post, Donnerstagmittag kommt es bei dir an.',
};

const DELIVERY_COST_CLASSES = [
  {
    name: 'Zürich Stadt',
    postalCodes: [
      '8000',
      '8001',
      '8002',
      '8003',
      '8004',
      '8005',
      '8006',
      '8008',
      '8032',
      '8037',
      '8038',
      '8040',
      '8041',
      '8044',
      '8045',
      '8046',
      '8047',
      '8048',
      '8049',
      '8050',
      '8051',
      '8052',
      '8053',
      '8055',
      '8057',
      '8063',
      '8064',
      '8092',
      '8093',
      '8143',
    ],
    minOrderValue: 4000,
    deliveryFee: 800,
    freeDeliveryThreshold: 8000,
    confirmationMessage:
      'Die Lieferung Stadt Zürich ist jeweils am Mittwoch zwischen 10 und 24 Uhr',
  },
  {
    name: 'Angrenzende Gemeinden',
    postalCodes: [
      '8702',
      '8117',
      '8600',
      '8304',
      '8152',
      '8153',
      '8105',
      '8102',
      '8952',
      '8142',
      '8143',
      '8134',
      '8802',
    ],
    minOrderValue: 5000,
    deliveryFee: 1200,
    freeDeliveryThreshold: 10000,
    confirmationMessage:
      'Die Lieferung Angrenzende Gemeinden (Stadt Zürich) ist jeweils am Mittwoch zwischen 12 und 24 Uhr',
  },
];

// eslint-disable-next-line import/prefer-default-export
export const getDeliveryCostClass = (postalCode) =>
  postalCode > 999 && postalCode < 9999
    ? DELIVERY_COST_CLASSES.find(({ postalCodes }) =>
        postalCodes.includes(postalCode),
      ) || DEFAULT_DELIVERY_COST_CLASS
    : UNKNOWN_DELIVERY_COST_CLASS;

class DeliveryPrice extends DeliveryPricingAdapter {
  static key = 'shop.unchained.pricing.delivery-zurich';

  static version = '1.0';

  static label = 'Velogebühren';

  static orderIndex = 11;

  static isActivatedFor() {
    return true; // check if delivery address is in switzerland?
  }

  async calculate() {
    if (!this.context.order) {
      // Simulation Mode
      const deliveryCostClass = UNKNOWN_DELIVERY_COST_CLASS;
      this.result.addFee({
        amount: deliveryCostClass.minOrderValue,
        isTaxable: true,
        isNetPrice: false,
        meta: {
          adapter: this.constructor.key,
          description: `Mindestbestellwert ${deliveryCostClass.name}`,
        },
      });
      this.result.addFee({
        amount: deliveryCostClass.deliveryFee,
        isTaxable: true,
        isNetPrice: false,
        meta: {
          adapter: this.constructor.key,
          description: `Liefergebühr ${deliveryCostClass.name}`,
        },
      });
      return super.calculate();
    }

    const delivery = this.context.order.delivery();

    if (this.context.provider.type === 'SHIPPING') {
      const deliveryInfo = [];
      this.log('DeliveryPrice -> Add Fee');

      this.context.meta = { ...this.context.meta, test: 'asdf' };

      const { postalCode } =
        this.context?.address || this.context.order.billingAddress || {};

      const deliveryCostClass = getDeliveryCostClass(postalCode);

      // You're not allowed to use this.context.order.pricing() here,
      // because the order calculation reruns after items, payment, delivery
      const items = this.context.order.items();
      const cartValue = items.reduce((current, item) => {
        const pricing = item.pricing();
        return current + (pricing.total()?.amount || 0);
      }, 0);

      if (cartValue < deliveryCostClass.minOrderValue) {
        this.result.addFee({
          amount: deliveryCostClass.minOrderValue - cartValue,
          isTaxable: true,
          isNetPrice: false,
          meta: {
            adapter: this.constructor.key,
            description: `Mindestbestellwert ${deliveryCostClass.name}`,
          },
        });

        deliveryInfo.push({
          curreny: 'CHF',
          type: DeliveryInfoTypes.MIN_ORDER_VALUE,
          amount: deliveryCostClass.minOrderValue - cartValue,
          description: `Differenz zu Mindestbestellwert ${
            deliveryCostClass.name
          } (CHF ${(deliveryCostClass.minOrderValue / 100).toFixed(2)})`,
        });
      }

      if (cartValue < deliveryCostClass.freeDeliveryThreshold) {
        this.result.addFee({
          amount: deliveryCostClass.deliveryFee,
          isTaxable: true,
          isNetPrice: false,
          meta: {
            adapter: this.constructor.key,
            description: `Liefergebühr ${deliveryCostClass.name}`,
          },
        });

        deliveryInfo.push({
          curreny: 'CHF',
          type: DeliveryInfoTypes.FEE,
          amount: deliveryCostClass.deliveryFee,
          description: `Liefergebühr ${deliveryCostClass.name}`,
        });
      } else {
        this.result.addFee({
          amount: 0,
          isTaxable: false,
          isNetPrice: false,
          meta: {
            adapter: this.constructor.key,
            description: `Liefergebühr Gratis`,
          },
        });

        deliveryInfo.push({
          curreny: 'CHF',
          type: DeliveryInfoTypes.FREE,
          amount: 0,
          description: `Liefergebühr Gratis`,
        });
      }

      OrderDeliveries.update(
        { _id: delivery._id },
        {
          $set: {
            context: {
              ...delivery.context,
              meta: { ...delivery.context.meta, deliveryInfo },
            },
          },
        },
      );
    } else {
      OrderDeliveries.update(
        { _id: delivery._id },
        {
          $set: {
            context: {
              ...delivery.context,
              meta: {
                ...delivery.context.meta,
                deliveryInfo: [
                  {
                    curreny: 'CHF',
                    type: DeliveryInfoTypes.FREE,
                    amount: 0,
                    description: `Gratis abholung`,
                  },
                ],
              },
            },
          },
        },
      );
    }

    return super.calculate();
  }
}

DeliveryPricingDirector.registerAdapter(DeliveryPrice);
