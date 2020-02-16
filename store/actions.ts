import { PaymentServiceState } from '../types/PaymentServiceState'
import { ActionTree } from 'vuex'
import * as types from './mutation-types'
import fetch from 'isomorphic-fetch'
import i18n from '@vue-storefront/i18n'
import has from 'lodash-es/has'
import { router } from '@vue-storefront/core/app';
import { localizedRoute} from '@vue-storefront/core/lib/multistore'
import { Logger } from '@vue-storefront/core/lib/logger'

export const actions: ActionTree<PaymentServiceState, any> = {
  async fetchPaymentMethods ({ rootState, commit, dispatch }) {
    try {
      const fetchPaymentMethods = await fetch(rootState.config.paymentService.endpoint + '/payment-methods')
      const paymentMethodsJson = await fetchPaymentMethods.json()
      
      if (paymentMethodsJson.count === 0) {
        throw new Error('No payment methods configured')
      }
      let paymentMethods = []
      let backendEnabledPaymentMethods = rootState.config.orders.payment_methods_mapping
      paymentMethodsJson._embedded.methods.forEach(method => {
        if(has(backendEnabledPaymentMethods, method.id)) {
          let paymentMethodConfig = {
            title: method.description,
            code: method.id,
            image: method.image,
            pspMethod: true,
            cost: 0,
            costInclTax: 0,
            default: false,
            offline: false
          }
          paymentMethods.push(paymentMethodConfig)
          commit(types.ADD_METHOD, paymentMethodConfig)
        }
      })
      if (paymentMethods.some( paymentMethod => paymentMethod.code === 'ideal' )) {
        dispatch('fetchIssuers')
      }
      dispatch('checkout/replacePaymentMethods', paymentMethods, { root: true })
    }
    catch (err) {
      Logger.info('Can\'t fetch payment methods', 'Payment service', err)()
      return
    }
  },

  async fetchIssuers ({ rootState, commit }) {
    try {
      const fetchIssuers = await fetch(rootState.config.paymentService.endpoint + '/fetch-issuers')
      const issuersJson = await fetchIssuers.json()
      if (issuersJson.issuers.length === 0) {
        throw new Error('No issuers')
      }
      commit(types.CLEAR_ISSUERS)
      issuersJson.issuers.forEach(issuer => {
        let { name, id, image } = issuer
        let issuerConfig = {
          name: name,
          id: id,
          image: image
        }
        commit(types.ADD_ISSUER, issuerConfig)
      })
    }
    catch (err) {
      Logger.info('Can\'t fetch issuers', 'Payment service', err)()
      return
    }
  },

  createPayment ({ rootState }, payload ) {
    let fetchUrl = rootState.config.paymentService.endpoint + '/post-payment'
    let params = {
      currency: rootState.config.i18n.currencyCode,
      order_id: payload.order_id,
      description: payload.payment_description,
      redirectUrl: location.origin + '/order-status/',
      method: rootState.checkout.paymentDetails.paymentMethod
    }
    if (rootState.checkout.paymentDetails.paymentMethod == 'ideal') {
      params['issuer'] = rootState.checkout.paymentDetails.paymentMethodAdditional.issuer
    }
    Logger.info('Collected payment data. ', 'Payment service', params)()

    return fetch(fetchUrl, {
      method: 'post',
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(params)
    }).then(resp => {
      return resp.json()
    })
  },

  postOrderComment ({ rootState }, payload ) {
    let fetchUrl = rootState.config.paymentService.endpoint + '/order-comments'
    let params = {
      order_id: payload.order_id,
      order_comment: {
        "statusHistory": {
          "comment": payload.order_comment,
          "created_at": new Date(),
          "is_customer_notified": 0,
          "is_visible_on_front": 0,
          "parent_id": payload.order_id,
          "status": payload.status
        }
      }
    }

    return fetch(fetchUrl, {
        method: 'post',
        headers: {
          Accept: 'application/json',
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(params)
    })
    .then(resp => {
      return resp.json()
    })
  },

  getPaymentStatus ({ rootState }, payload ) {
    let fetchUrl = rootState.config.paymentService.endpoint + '/get-payment-status'
    let params = { "token": payload.token }

    return fetch(fetchUrl, {
        method: 'post',
        headers: {
          Accept: 'application/json',
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(params)
    })
    .then(resp => {
      return resp.json()
    })
  },

  setError ({ dispatch }, payload ) {
    const { message, order_id, redirectUrl } = payload
    console.log(payload)
    Logger.error(message, 'Payment service')()
    dispatch('notification/spawnNotification', {
      type: 'error',
      message: i18n.t('Payment is not created - ' + message),
      action1: { label: i18n.t('OK') },
      hasNoTimeout: true
    },
    {root: true})
    const order_comment_data = {
      order_id: order_id,
      order_comment: 'Payment could not be created: ' + message,
      status: "canceled"
    }
    dispatch('postOrderComment', order_comment_data)
    dispatch('checkout/setThankYouPage', false, {root: true})
    router.push(localizedRoute('/', redirectUrl))
  }
  
}
