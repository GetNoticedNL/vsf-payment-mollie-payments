import Vue from 'vue';
import { StorefrontModule } from '@vue-storefront/core/lib/modules';
import moduleRoutes from './router'
import { setupMultistoreRoutes } from '@vue-storefront/core/lib/multistore'
import config from 'config'
import i18n from '@vue-storefront/i18n'
import { isServer } from '@vue-storefront/core/helpers'
import EventBus from '@vue-storefront/core/compatibility/plugins/event-bus'
import { Logger } from '@vue-storefront/core/lib/logger'

import PaymentReviewComponent from './components/PaymentReview.vue'
import { mutations } from './store/mutations'
import { getters } from './store/getters'
import { actions } from './store/actions'

const PaymentStore = {
  namespaced: true,
  state: {
    payment_methods: [],
    issuers: [],
    issuer: null,
    paymentMethod: '',
    paymentStatusFetched: false
  },
  mutations,
  actions,
  getters
}

export const PaymentModule: StorefrontModule = function ({ store, router }) {
  store.registerModule('payment-service', PaymentStore)
  setupMultistoreRoutes(config, router, moduleRoutes, 10)

  const onAfterPlaceOrder = function (payload) {
    EventBus.$emit('notification-progress-start',[i18n.t('Creating payment request'),'...'].join(''))
    const order_id = payload.confirmation.magentoOrderId
    const payment_data = {
      order_id: order_id,
      payment_description: i18n.t('Order #') + ' ' + payload.confirmation.orderNumber      
    }
    Logger.info('Payment data', 'Payment service', payment_data)()
    store.dispatch('payment-service/createPayment', payment_data).then(createPaymentResponse => {
      if (createPaymentResponse.code !== 200) {
        throw new Error(createPaymentResponse.result)
      }
      const order_comment_data = {
        order_id: createPaymentResponse.result.order_id,
        order_comment: "Payment is created for amount " + createPaymentResponse.result.amount,
        status: "pending_payment"
      }
      store.dispatch('payment-service/postOrderComment', order_comment_data)
      window.location.href = createPaymentResponse.result.payment_gateway_url
    })
    .catch((err) => {
      EventBus.$emit('notification-progress-stop')
      const errorData = {
        'message': err.message,
        'order_id': order_id,
        'redirectUrl': config.paymentService.error_url
      }
      store.dispatch('payment-service/setError', errorData)
    })
  }

  let correctPaymentMethod = false
  let paymentMethodAdditionalData = {}

  const placeOrder = function () {
    if (correctPaymentMethod) {
      EventBus.$emit('checkout-do-placeOrder', paymentMethodAdditionalData)
    }
  }

  if (!isServer) {
    store.dispatch('payment-service/fetchPaymentMethods')

    EventBus.$on('checkout-payment-method-changed', paymentMethodDetails => {
      paymentMethodAdditionalData = {}
      if(typeof paymentMethodDetails === 'object'){
        paymentMethodAdditionalData = paymentMethodDetails
        return
      }
      const paymentMethodCode = paymentMethodDetails

      EventBus.$off('order-after-placed', onAfterPlaceOrder)
      EventBus.$off('checkout-before-placeOrder', placeOrder)
      if (store.getters['payment-service/getPaymentMethods'].some( issuer => issuer.code === paymentMethodCode)) {
        correctPaymentMethod = true
        EventBus.$on('order-after-placed', onAfterPlaceOrder)
        EventBus.$on('checkout-before-placeOrder', placeOrder)
        Logger.info('checkout-before-placeOrder', 'Payment service')()

        const PaymentReview = Vue.extend(PaymentReviewComponent)
        const paymentReviewInstance = (new PaymentReview({
          propsData: {
            header: i18n.t('All set to place your order'),
            message: i18n.t('After placing the order you will be send to the payment gateway and you can pay by:'),
            paymentMethodDetails: store.getters['payment-service/getPaymentMethods'].find( issuer => issuer.code === paymentMethodCode)
          }
        }))
        paymentReviewInstance.$mount('#checkout-order-review-additional')
      } else {
        correctPaymentMethod = false
      }
    })
  }

}

