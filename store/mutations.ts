import { MutationTree } from 'vuex'
import * as types from './mutation-types'

export const mutations: MutationTree<any> = {
  [types.ADD_METHOD] (state, payload) {
    state.payment_methods.push(payload)
  },
  [types.ADD_ISSUER] (state, payload) {
    state.issuers.push(payload)
  },
  [types.CLEAR_ISSUERS] (state) {
    state.issuers = []
  },
  [types.SET_ISSUER] (state, payload) {
    let result = state.issuers.filter(issuer => {
      return issuer.id === payload
    })
    if (result.length > 0) {
      state.issuer = result[0]
    } else {
      state.issuer = null
    }
  },
  [types.SET_PAYMENT_METHOD] (state, payload) {
    state.paymentMethod = payload
  },
  [types.SET_PAYMENT_STATUS_FETCHED] (state, payload) {
    state.paymentStatusFetched = payload
  }
}
