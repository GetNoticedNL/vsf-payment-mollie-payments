import { MollieState } from '../types/MollieState'
import { ActionTree } from 'vuex'
import * as types from './mutation-types'
import fetch from 'isomorphic-fetch'
import i18n from '@vue-storefront/i18n'
import has from 'lodash-es/has'
import { Logger } from '@vue-storefront/core/lib/logger'

export const actions: ActionTree<MollieState, any> = {
  fetchMethods ({ rootState, commit, dispatch }) {
    return new Promise((resolve, reject) => {
      fetch(rootState.config.mollie.endpoint + '/payment-methods')
      .then(res => {
        res.json()
        .then(json => {
          if (json.count > 0) {
            let molliePaymentMethods = []
            let backendEnabledMolliePaymentMethods = rootState.config.orders.payment_methods_mapping
            json._embedded.methods.forEach(method => {
              if(has(backendEnabledMolliePaymentMethods, method.id)) {
                let paymentMethodConfig = {
                  title: method.description,
                  code: method.id,
                  mollieMethod: true,
                  cost: 0,
                  costInclTax: 0,
                  default: false,
                  offline: false
                }
                molliePaymentMethods.push(paymentMethodConfig)
                commit(types.ADD_METHOD, paymentMethodConfig)
                if(method.id === 'ideal'){
                  dispatch('fetchIssuers')
                }
              }
            })
            dispatch('checkout/replacePaymentMethods', molliePaymentMethods, { root: true })
          }
        })
      })
      .catch(err => {
        reject(err)
      })
    })
  },

  fetchIssuers ({ rootState, commit, dispatch }) {
    return new Promise((resolve, reject) => {
      fetch(rootState.config.mollie.endpoint + '/fetch-issuers')
        .then(res => {
          res.json().then(json => {
            commit(types.CLEAR_ISSUERS)
            if (json.issuers.length > 0) {
              json.issuers.forEach(issuer => {
                let issuerConfig = {
                  name: issuer.name,
                  id: issuer.id,
                  image: issuer.image.size2x
                }
                commit(types.ADD_ISSUER, issuerConfig)
              })
            }
          })
        })
        .catch(err => {
          reject(err)
        })
    })
  },

  createPayment ({ rootState }, payload ) {
    let fetchUrl = rootState.config.mollie.endpoint + '/post-payment'
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
    Logger.info('Collected payment data. ', 'Mollie', params)()

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
    let fetchUrl = rootState.config.mollie.endpoint + '/order-comments'
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
    let fetchUrl = rootState.config.mollie.endpoint + '/get-payment-status'
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
  }
  
}
