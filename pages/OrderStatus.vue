<template>
  <div
    :class="{ 'dimmed': !paymentDetailsFetched }"
  >
    <div class="order-status" v-if="paymentDetailsFetched">
      <header v-if="!hasError" class="thank-you-title bg-cl-secondary py35 pl20">
        <div class="container">
          <breadcrumbs
            :routes="[{name: 'Homepage', route_link: '/'}]"
            :active-route="this.$t('Order status')"
          />
          <h2 class="category-title">
            {{ $t('Order status for Order ') + ' # ' + order.increment_id }}
            <span v-if="hasPaymentResult" :class="['status-label', paymentGroupStatus]">{{ paymentStatus }}</span>
          </h2>
        </div>
      </header>
      <div v-if="hasError && !hashIncorrect" class="thank-you-content align-justify py40 pl20">
        <div class="container">
          <div class="row">
            <div class="col-md-6 pl20 pr20">
              <p>{{ $t('There is a problem with getting the payment details for your order') }}</p>
            </div>
          </div>
        </div>
      </div>
      <div v-if="hasError && hashIncorrect" class="thank-you-content align-justify py40 pl20">
        <div class="container">
          <div class="row">
            <div class="col-md-6 pl20 pr20">
              <p>{{ $t('Hash is incorrect, this is not good.') }}</p>
            </div>
          </div>
        </div>
      </div>
      <div v-if="hasError && fetchPaymentStatusFail" class="thank-you-content align-justify py40 pl20">
        <div class="container">
          <div class="row">
            <div class="col-md-6 pl20 pr20">
              <p>{{ $t(fetchPaymentStatusFailMessage) }}</p>
              <a href="/">Return to homepage</a>
            </div>
          </div>
        </div>
      </div>
      <div v-if="!hasError && paymentDetailsFetched" class="thank-you-content align-justify py40 pl20">
        <div class="container">
          <div class="row">
            <div class="col-xs-12 pl20 pr20">
              <div v-if="hasPaymentResult">
                <p>{{ afterTransactionMessage }}</p>
              </div>
              <h4 v-if="OfflineOnly">
                {{ $t('You are offline') }}
              </h4>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import i18n from '@vue-storefront/i18n'
import VueOfflineMixin from 'vue-offline/mixin'
import Breadcrumbs from 'theme/components/core/Breadcrumbs'
// import { localizedRoute } from '@vue-storefront/core/lib/multistore'
// import { router } from '@vue-storefront/core/app'
import { Logger } from '@vue-storefront/core/lib/logger'

export default {
  name: 'OrderStatus',
  mixins: [VueOfflineMixin],
  data () {
    return {
      successPaymentStatus: [
        'paid'
      ],
      pendingPaymentStatus: [
        'pending',
        'open'
      ],
      failPaymentStatus: [
        'expired',
        'failed',
        'canceled'
      ],
      incrementId: '',
      paymentStatus: null,
      paymentGroupStatus: '',
      hasPaymentResult: false,
      hasError: false,
      hashIncorrect: false,
      paymentDetailsFetched: false,
      fetchPaymentStatusFail: false,
      fetchPaymentStatusFailMessage: '',
      afterTransactionMessage: '',
      order: null
    }
  },
  created () {
    this.$bus.$emit('notification-progress-start', [i18n.t('Getting payment status'), '...'].join(''))
    const tokenData = {
      token: this.$route.params.order_token
    }
    this.$store.dispatch('payment-service/getPaymentStatus', tokenData)
      .then((response) => {
        if (response.code !== 200) {
          throw new Error('Invalid payment token')
        }
        this.$store.commit('payment-service/SET_PAYMENT_STATUS_FETCHED', true)
        this.setPaymentStatus(response.result)
      })            
      .catch((err) => {
        this.setError(err.message)
      })
  },
  methods: {
    setPaymentStatus (result) {
      this.$bus.$emit('notification-progress-stop')
      this.paymentDetailsFetched = true
      this.order = result.order
      this.hasPaymentResult = true
      this.paymentStatus = result.payment.status

      let successPaymentMessage = 'Your payment for this order is successfull, thank you for your purchase. We\'ll send the order confirmation and invoice to ' + this.order.customer_email + ' in a few moments'
      let pendingPaymentMessage = 'Your payment details for this order is pending, when we receive more information from the payment provider we will automatically update the payment status and inform you about it by email at ' + this.order.customer_email
      let failedPaymentMessage = 'Your payment for this order has failed.'

      if (this.isPaymentSuccess()) {
        this.paymentGroupStatus = 'success'
        this.afterTransactionMessage = successPaymentMessage
      }
      if (this.isPaymentPending()) {
        this.paymentGroupStatus = 'pending'
        this.afterTransactionMessage = pendingPaymentMessage
      }
      if (this.isPaymentFailed()) {
        this.paymentGroupStatus = 'failed'
        this.afterTransactionMessage = failedPaymentMessage
      }
    },
    fetchPaymentStatusFailed (message) {
      this.$bus.$emit('notification-progress-stop')
      this.hasError = true
      this.paymentDetailsFetched = true
      this.fetchPaymentStatusFail = true
      this.fetchPaymentStatusFailMessage = message
    },
    isPaymentSuccess () {
      return this.successPaymentStatus.includes(this.paymentStatus)
    },
    isPaymentPending () {
      return this.pendingPaymentStatus.includes(this.paymentStatus)
    },
    isPaymentFailed () {
      return this.failPaymentStatus.includes(this.paymentStatus)
    },
    setError (message) {
      this.$bus.$emit('notification-progress-stop')
      Logger.error(message, 'Payment service')()
    }
  },
  components: {
    Breadcrumbs
  }
}
</script>

<style lang="scss" scoped>
.order-status {
  min-height: 800px;
}
.dimmed {
  background-color:rgba(0, 0, 0, 0.2);
  position: fixed;
  width: 100%;
  height: 100%;
}
p {
  line-height: 1.5;
}
span.status-label {
  font-family: Arial;
  display: inline-block;
  padding: 5px 8px;
  color: #fff;
  font-size: 12px;
  text-transform: uppercase;
  font-weight: 600;
  border-radius: 5px;
  margin-right: 7px;
  position: relative;
  top: -8px;
  &.success {
    background-color: #4cd964;
  }
  &.pending {
    background-color: #b3b3b3;
  }
  &.failed {
    background-color: #eb5757;
  }
}

</style>
