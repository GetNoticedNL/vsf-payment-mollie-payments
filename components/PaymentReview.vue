<template>
  <div class="mb15 mt20 payment-cash-on-delivery-info-container">
    <div class="bg-cl-secondary px20 py20" style="text-align: center;">
      <p class="weight-700">{{ header }}</p>
      <p>{{ message }}</p>
      <span class="payment-method-details">
        <img :src="paymentMethodDetails.image.svg" width="30"> <span class="payment-method "> {{ paymentMethodDetails.title }}</span>
      </span>
    </div>
  </div>
</template>

<script>
export default {
  name: 'PaymentReview',
  props: {
    header: {
      type: String,
      required: true
    },
    message: {
      type: String,
      required: true
    },
    paymentMethodDetails: {
      type: Object,
      required: true
    }
  }
}
</script>

<style lang="scss" scoped>
  .payment-method-details {
    display: inline-block;
    width: 100%;
    text-align: center;
    .payment-method {
      position: relative;
      top: -6px;
      margin-left: 5px;
    }
  }
</style>
