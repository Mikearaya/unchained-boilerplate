import { OrderPricingSheetRowCategories } from 'meteor/unchained:core-pricing';

import formatAddress from '../utils/formatAddress';
import { getDeliveryCostClass } from '../plugins/delivery-price';

const { ROOT_URL } = process.env;

const statusMap = {
  OPEN: 'offen',
  PENDING: 'in verarbeitung',
  CONFIRMED: 'NEU',
  FULLFILLED: 'ausgeliefert',
};

const paymentMethodMap = {
  invoice: 'versendet',
};

const milkCrateFreeMap = {
  accessible: '… ist frei zugänglich',
  not_accessible: '… ist nicht zugänglich',
};

const getDeliveryMethod = (
  deliveryProviderType,
  deliveryCostClass,
  pickupLocation,
) => {
  if (deliveryProviderType === 'SHIPPING') {
    return `Heimlieferung - ${deliveryCostClass.name}`;
  }
  return `Pick-Up bei ${pickupLocation.address.company} ${
    pickupLocation.address.firstName || ''
  }`.trim();
};

const prepareOrderRow = async (order, meta) => {
  const delivery = order.delivery();
  const deliveryProvider = order.delivery().provider();
  const payment = order.payment();
  const orderPricing = order.pricing();
  const items = order.items();
  const discounts = order.discounts();

  const isShipping = deliveryProvider?.type === 'SHIPPING';

  const invoiceAddress = delivery?.context?.address
    ? order.billingAddress
    : null;
  const deliveryAddress = delivery?.context?.address
    ? delivery?.context?.address
    : order.billingAddress;

  const products = items.map((item) => {
    return {
      sku: item.product().warehousing?.sku,
      quantity: item.quantity,
      price: item.pricing().unitPrice().amount / 100,
    };
  });

  const pickupLocation =
    !isShipping &&
    deliveryProvider.run(
      'pickUpLocationById',
      {
        orderDelivery: delivery,
      },
      delivery?.context?.orderPickUpLocationId || 'unchained',
    );

  const discountCodes = discounts.map((discount) => {
    return discount.code;
  });

  const discountTotal = orderPricing.total(
    OrderPricingSheetRowCategories.Discounts,
  );

  const deliveryCostClass = getDeliveryCostClass(
    isShipping ? deliveryAddress.postalCode : 0,
  );

  const deliveryTotal = orderPricing.total(
    OrderPricingSheetRowCategories.Delivery,
  );

  const itemsTotal = orderPricing.total(OrderPricingSheetRowCategories.Items);

  const minimumOrderFee =
    isShipping &&
    itemsTotal.amount < deliveryCostClass.freeDeliveryThreshold &&
    deliveryCostClass.minOrderValue - itemsTotal.amount;

  const deliveryFee =
    isShipping &&
    itemsTotal.amount < deliveryCostClass.freeDeliveryThreshold &&
    deliveryCostClass.deliveryFee;

  return {
    userId: order.userId,
    orderId: order._id,
    orderNumber: order.orderNumber,
    timestamp: order.ordered,
    fullName: [deliveryAddress.firstName, deliveryAddress.lastName]
      .filter(Boolean)
      .join(' '),
    emailAddress: order.contact?.emailAddress,
    phoneNumber: order.contact?.telNumber,
    personalComment: '',
    addressLine: deliveryAddress.addressLine,
    addressLine2: deliveryAddress.addressLine2,
    company: deliveryAddress.company,
    postalCode: parseInt(deliveryAddress.postalCode, 10) || 0,
    city: deliveryAddress.city,
    deliveryDate: '',
    status: statusMap[order.status],
    paymentMethod:
      paymentMethodMap[payment?.provider()?._id] || payment?.provider()?._id,
    deliveryMethod: getDeliveryMethod(
      deliveryProvider?.type,
      deliveryCostClass,
      pickupLocation,
    ),
    milkCrateFree: milkCrateFreeMap[meta.parcelBoxInfo],
    messengerInfo: meta.comment,
    discountTotal: discountTotal.amount / 100,
    couponCode: discountCodes.join(', '),
    trackingNumber: '',
    invoiceAddress: invoiceAddress && formatAddress(invoiceAddress),
    newsletterEnabled: false,
    foundHow: '',
    termsAccepted: true,
    products,
    itemsCost: itemsTotal.amount / 100,
    pickupLocationId: delivery?.context?.orderPickUpLocationId,
    controlPanelLink: `${ROOT_URL}/orders/view/?_id=${order._id}`,
    deliveryCost: deliveryTotal.amount / 100,
    isShipping,
    minimumOrderFee: minimumOrderFee / 100,
    deliveryFee: deliveryFee / 100,
    deliveryCostClass: isShipping && deliveryCostClass.name,
  };
};

export default prepareOrderRow;
