<template>
  <div>
    <h4>{{ $t('Choose your bank') }}</h4>
    <base-select
      class="col-xs-6 mb10"
      name="iDealIssuer"
      :options="idealIssuers"
      :selected="iDealIssuer"
      :placeholder="$t('Choose your bank')"
      v-model="iDealIssuer"
      autocomplete="ideal-issuer"
      @change="setIdealIssuer"
    />
  </div>
</template>

<script>
import BaseSelect from 'theme/components/core/blocks/Form/BaseSelect'
import { mapGetters } from 'vuex'

export default {
  components: {
    BaseSelect
  },
  data () {
    return {
      iDealIssuer: ''
    }
  },
  watch: {
    'iDealIssuer': function () {
      this.setIdealIssuer()
    }
  },
  computed: {
    ...mapGetters('payment-service', ['getIssuers']),
    payment () {
      return this.$store.state.checkout.paymentDetails
    },
    idealIssuers () {
      return this.getIssuers.map((item) => {
        return {
          value: item.id,
          label: item.name
        }
      })
    }
  },
  methods: {
    setIdealIssuer () {
      this.$bus.$emit('checkout-payment-method-changed', { issuer: this.iDealIssuer })
    }
  }
}
</script>
