// This object should represent structure of your modules Vuex state
// It's a good practice is to name this interface accordingly to the KET (for example mailchimpState)
interface Issuer {
  name: string
  id: string
  image: object
}

interface Method {
  title: string
  code: string,
  image: object,
  cost: number
  costInclTax: number
  default: boolean
  offline: boolean
}

// https://stackoverflow.com/questions/25469244/how-can-i-define-an-interface-for-an-array-of-objects-with-typescript
interface Issuers extends Array<Issuer> {}

interface Methods extends Array<Method> {}

export interface PaymentServiceState {
  payment_methods: Methods
  issuers: Issuers
  issuer: Issuer | null
  paymentMethod: string
  paymentStatusFetched: boolean
}
