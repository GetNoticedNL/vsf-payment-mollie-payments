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
          res.json().then(json => {
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
                    dispatch('fetchIdealIssuers')
                  }
                }
              })
              dispatch('payment/replaceMethods', molliePaymentMethods, { root: true })
            }
          })
        })
        .catch(err => {
          reject(err)
        })
    })
  },

  fetchIdealIssuers ({ rootState, commit, dispatch }) {
    return new Promise((resolve, reject) => {
      fetch(rootState.config.mollie.endpoint + '/ideal-issuers')
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

  fetchBackendOrderDetails ({ rootState }, order_id ) {
    let fetchUrl = rootState.config.mollie.endpoint + '/order-details'
    let params = { "order_id": order_id }

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

  validateHash ({ rootState }, payload ) {
    let fetchUrl = rootState.config.mollie.endpoint + '/validate-hash'

    return fetch(fetchUrl, {
        method: 'post',
        headers: {
          Accept: 'application/json',
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
    })
    .then(resp => {
      return resp.json()
    })
  },

  createPayment ({ rootState, rootGetters }, payload ) {
    let fetchUrl = rootState.config.mollie.endpoint + '/post-payment'
    let total = rootGetters['cart/getTotals'].find(seg => seg.code === 'grand_total').value.toFixed(2)

    let params = {
      amount: {
        currency: rootState.config.i18n.currencyCode,
        value: total
      },
      order_id: payload.order_id,
      hash: payload.hash,
      description: i18n.t('Order #') + ' ' + payload.increment_id,
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

  setMollieTransactionData ({ rootState }, payload ) {
    let fetchUrl = rootState.config.mollie.endpoint + '/set-mollie-transaction-data'
    let params = {
      "order": {
        "entity_id": payload.order_id,
      },
      "mollie_transaction_id": payload.transaction_id,
      "mollie_secret_hash": payload.hash
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

  decryptToken ({ rootState }, payload ) {
    let fetchUrl = rootState.config.mollie.endpoint + '/decrypt-token'
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

  fetchPaymentStatus ( { rootState }, payload ) {
    let fetchUrl = rootState.config.mollie.endpoint + '/order-details'
    let order_id = payload.order_id
    let hash = payload.hash
    let params = { "order_id": parseInt(order_id), "validatePayment": true }

    return fetch(fetchUrl, {
      method: 'post',
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(params)
    })
    .then(resp => { return resp.json() })
    .then((resp) => {
      if (resp.code === 200) {
        let transaction_id = resp.result.transaction_id
        let regen_hash = resp.result.hash
        if(regen_hash != hash){
          return {
            "status": 400,
            "msg": "Hash is incorrect"
          }
        }
        return {
          "status": 200,
          "transaction_id": transaction_id,
          "order": {
            "increment_id": resp.result.increment_id,
            "customer_email": resp.result.customer_email
          }
        }
      } else {
        return {
          "status": 400,
          "msg": "Backend API call has failed"
        }
      }
    })
  },

  getPayment ({ rootState }, payload ) {
    let fetchUrl = rootState.config.mollie.endpoint + '/get-payment'
    let params = {
      id: payload
    }

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
  }

}
