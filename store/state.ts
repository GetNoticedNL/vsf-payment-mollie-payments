import { PaymentServiceState } from '../types/PaymentServiceState'

export const state: PaymentServiceState = {
  payment_methods: [],
  issuers: [],
  issuer: null,
  paymentMethod: '',
  paymentStatusFetched: false
}
