import MolliePaymentReview from '../components/PaymentReview.vue'
import store from '@vue-storefront/core/store'
import i18n from '@vue-storefront/i18n'
import { localizedRoute} from '@vue-storefront/core/lib/multistore'
import { router } from '@vue-storefront/core/app'
import { Logger } from '@vue-storefront/core/lib/logger'

const setError = function (message, order_id, redirectUrl) {
  Logger.error(message, 'Mollie')()
  store.dispatch('notification/spawnNotification', {
    type: 'error',
    message: i18n.t('Payment is not created - ' + message),
    action1: { label: i18n.t('OK') },
    hasNoTimeout: true
  })
  const order_comment_data = {
    order_id: order_id,
    order_comment: 'Payment could not be created: ' + message,
    status: "canceled"
  }
  store.dispatch('mollie/postOrderComment', order_comment_data)
  store.dispatch('checkout/setThankYouPage', false)
  router.push(localizedRoute('/', redirectUrl))
}

export function afterRegistration ({ Vue, config }) {

  const onAfterPlaceOrderMollie = function (payload) {
    console.log(payload)
    Vue.prototype.$bus.$emit('notification-progress-start',[i18n.t('Creating payment request'),'...'].join(''))
    const order_id = payload.confirmation.magentoOrderId
    const payment_description = i18n.t('Order #') + ' ' + payload.confirmation.orderNumber
    const payment_data = {
      order_id: order_id,
      payment_description: payment_description      
    }
    Logger.info('Payment data', 'Mollie', payment_data)()
    store.dispatch('mollie/createPayment', payment_data)
    .then(createPaymentResponse => {
      if (createPaymentResponse.code !== 200) {
        throw new Error(createPaymentResponse.result)
      }
      const order_comment_data = {
        order_id: createPaymentResponse.result.order_id,
        order_comment: "Payment is created at Mollie for amount " + createPaymentResponse.result.amount,
        status: "pending_payment"
      }
      Logger.info('Transaction data as Order Comment', 'Mollie', order_comment_data)()
      store.dispatch('mollie/postOrderComment', order_comment_data)
      Vue.prototype.$bus.$emit('notification-progress-start', [i18n.t('Redirecting you to payment gateway'), '...'].join(''))
      setTimeout(() => {
        Logger.info('Sending user to Payment Gateway', 'Mollie', createPaymentResponse.result.payment_gateway_url)()
        window.location.href = createPaymentResponse.result.payment_gateway_url
        Vue.prototype.$bus.$emit('notification-progress-stop')
      }, 250)
    })
    .catch((err) => {
      Vue.prototype.$bus.$emit('notification-progress-stop')
      setError(err.message, order_id, config.mollie.error_url)
    })
  }

  let correctPaymentMethod = false
  let paymentMethodAdditionalData = {}

  const placeOrder = function () {
    if (correctPaymentMethod) {
      Vue.prototype.$bus.$emit('checkout-do-placeOrder', paymentMethodAdditionalData)
    }
  }

  if (!Vue.prototype.$isServer) {
    store.dispatch('mollie/fetchMethods')

    Vue.prototype.$bus.$on('checkout-payment-method-changed', paymentMethodDetails => {
      paymentMethodAdditionalData = {}
      if(typeof paymentMethodDetails === 'object'){
        paymentMethodAdditionalData = paymentMethodDetails
        return
      }
      const paymentMethodCode = paymentMethodDetails

      // unregister event as multiple payment methods are from mollie now, the order-after-placed emit could trigger multiple times when mollie methods would get selected
      Vue.prototype.$bus.$off('order-after-placed', onAfterPlaceOrderMollie)
      Vue.prototype.$bus.$off('checkout-before-placeOrder', placeOrder)
      console.log(paymentMethodCode, store.getters['mollie/methods'])
      if (store.getters['mollie/methods'].some( issuer => issuer.code === paymentMethodCode)) {
        correctPaymentMethod = true
        Vue.prototype.$bus.$on('order-after-placed', onAfterPlaceOrderMollie)
        Vue.prototype.$bus.$on('checkout-before-placeOrder', placeOrder)
        Logger.info('checkout-before-placeOrder', 'Mollie')()

        const PaymentReview = Vue.extend(MolliePaymentReview)
        const paymentReviewInstance = (new PaymentReview({
          propsData: {
            header: i18n.t('We use Mollie for secure payments'),
            message: i18n.t('After placing the order you will be send to Mollie and you can pay by:'),
            paymentMethodDetails: store.getters['mollie/methods'].find( issuer => issuer.code === paymentMethodCode)
          }
        }))
        paymentReviewInstance.$mount('#checkout-order-review-additional')
      } else {
        correctPaymentMethod = false
      }
    })
  }
}
