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
    Vue.prototype.$bus.$emit('notification-progress-start',[i18n.t('Creating payment request'),'...'].join(''))
    const order_id = payload.confirmation.backendOrderId
    // get increment id and hash
    store.dispatch('mollie/fetchBackendOrderDetails', order_id)
    .then(resp => {
      if(resp.code !== 200){
        throw new Error("Could not fetch backend order details")
      }
      const cartTotal = store.getters['cart/getTotals'].find(seg => seg.code === 'grand_total').value.toFixed(2);
      const hashData = {
        hash: resp.result.hash,
        cart_total: cartTotal,
        order_id: payload.confirmation.backendOrderId,
        increment_id: resp.result.increment_id
      }
      return hashData
    })
    .then(hashData => {
      Logger.info('Hash data', 'Mollie', hashData)()
      store.dispatch('mollie/validateHash', hashData)
      .then(hashResp => {
        Logger.info('Hash validation result', 'Mollie', hashResp.result)()
        if (hashResp.code !== 200) {
          throw new Error("Hashes don't match")
        }
        const payment_data = {
          increment_id: hashData.increment_id,
          order_id: hashData.order_id,
          hash: hashData.hash
        }
        return payment_data
      })
      .then(payment_data => {
        Logger.info('Payment data', 'Mollie', payment_data)()
        store.dispatch('mollie/createPayment', payment_data)
        .then(mollieResp => {
          if (mollieResp.code !== 200) {
            throw new Error("API extension VS failed")
          }
          if(mollieResp.result.hasOwnProperty('status') && typeof mollieResp.result.status !== "string") {
            throw new Error("API Mollie failed")
          }
          if(!mollieResp.result.hasOwnProperty('id')) {
            throw new Error("No transaction id generated")
          }
          Logger.info('Payment result', 'Mollie', mollieResp.result)()
          const transaction_data = {
            order_id: payment_data.order_id,
            transaction_id: mollieResp.result.id,
            hash: payment_data.hash,
            amount: Object.values(mollieResp.result.amount).reverse().join(' '),
            payment_gateway_url: mollieResp.result._links.checkout.href
          }
          return transaction_data
        })
        .then(transaction_data => {
          Logger.info('Transaction data', 'Mollie', transaction_data)()
          store.dispatch('mollie/setMollieTransactionData', transaction_data)
          .then((backendResp) => {
            if (backendResp.code !== 200) {
              throw new Error("'Payment is not linked to order")
            }
            const order_comment_data = {
              order_id: transaction_data.order_id,
              order_comment: "Payment is created at Mollie for amount " + transaction_data.amount,
              status: "pending_payment"
            }
            store.dispatch('mollie/postOrderComment', order_comment_data)
            Vue.prototype.$bus.$emit('notification-progress-start', [i18n.t('Redirecting you to payment gateway'), '...'].join(''))
            setTimeout(() => {
              Logger.info('Sending user to Mollie', 'Mollie', transaction_data.payment_gateway_url)()
              window.location.href = transaction_data.payment_gateway_url
              Vue.prototype.$bus.$emit('notification-progress-stop')
            }, 250)
          })
          .catch((err) => {
            Vue.prototype.$bus.$emit('notification-progress-stop')
            setError(err.message, order_id, config.mollie.error_url)
          })
        })
        .catch((err) => {
          Vue.prototype.$bus.$emit('notification-progress-stop')
          setError(err.message, order_id, config.mollie.error_url)
        })
      })
      .catch((err) => {
        Vue.prototype.$bus.$emit('notification-progress-stop')
        setError(err.message, order_id, config.mollie.error_url)
      })
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
