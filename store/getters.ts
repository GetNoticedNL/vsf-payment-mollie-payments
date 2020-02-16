import { PaymentServiceState } from '../types/PaymentServiceState'
import { GetterTree } from 'vuex'

export const getters: GetterTree<PaymentServiceState, any> = {
  getIssuers (state) {
    return state.issuers
  },
  getPaymentMethods (state) {
    return state.payment_methods
  },
  getIssuer (state) {
    return state.issuer
  },  
  paymentMethodDetails (state) {
    return state.paymentMethod
  },
  getPaymentStatusFetched (state) {
    return state.paymentStatusFetched
  }
}
