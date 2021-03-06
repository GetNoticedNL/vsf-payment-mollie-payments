# Mollie Payments Vue Storefront payment integration module
Mollie Payments API integration for Vue Storefront with Magento 2 as backend system.

![order-status](https://user-images.githubusercontent.com/26965893/60960736-ea744680-a30a-11e9-8c43-d60b53a328a8.png)

Image shown above is the order status page after the customer successfullly paid for an order.

# Purpose
We created this module to make it possible to pay placed orders in Vue Storefront checkout.\
With Magento 2 as a backend system it's now possible to offer your customers all common payment methods within the Vue Storefront checkout when online and give accurate payment status information immediately afterwards.\
Are you missing features you need, please feel free to contact us via https://www.getnoticed.nl/ or create an issue in this Github repository,

# Sign up for a Mollie account
If you haven't done that already, head out to https://www.mollie.com/ to sign up for an account.

# Installation Guide
Follow these steps to install this module in Vue Storefront.\
We tried to be so specific as possible, if you need help don't hesitate to contact us. Please find below the options to get support.

First, make sure you meet these requirements for your Magento 2 installation.

# Requirements for Magento 2
1. Mollie Payments for Magento 2 module installed, you can get it here: https://github.com/mollie/magento2
1. Install Get Noticed Magento 2 Order extension attributes module: 

```shell
composer require getnoticed/module-vsf-mollie
php bin/magento module:enable GetNoticed_VsfMollie
php bin/magento setup:upgrade
```

# Requirements for Vue Storefront API
Add the Vue Storefront API extension we created for the Mollie Payments API: https://github.com/GetNoticedNL/vsf-payment-mollie-payments-api - you can follow the installation steps in the ReadMe in this repository.

# Requirements for Vue Storefront
After making sure to meet the above mentioned requirements, please follow the next steps to integrate this module in Vue Storefront.

Clone this git repository from within your vue-storefront root folder

```shell
git clone git@github.com:GetNoticedNL/vsf-payment-mollie-payments.git src/modules/vsf-payment-getnoticed-mollie
```

# Module registration
Open `src/modules/index.ts`

Add:

```js
...
import { Mollie } from './vsf-payment-getnoticed-mollie'
```

And make sure to also add the module to the registered modules array

```js
...
Mollie
```

# Add configuration settings

Add the config properties in `config/local.json`

```
"mollie": {
  "endpoint": "http://localhost:8080/api/ext/vsf-payment-getnoticed-mollie-api",
  "error_url": "route_to_error_page",
  "invalid_payment_status_check_url": "route_to_invalid_payment_status_page"
},
```

Make sure to set the correct location to your API and the routes to the CMS pages in case of an error or an invalid payment status check.

# Integration to theme
We included a folder `theme-integration` to help you to seemlessly add all the customizations.
We used the default theme, below we'll sum up the changes that are necessary to completely integrate this module to your own theme if you're not using Vue Storefront default theme.

* Add a method to the currentPage mixin to hide header and footer when communication with Mollie API is processing - add condition to show header and footer in components depending on this method
* Remove default ThankYouPage as the customer goes immediately to the Mollie payment gateway to pay for the placed order. The customer comes back to a customized order status page.
* Add customizations to Payment component to only show payment methods configured in Mollie account
* Add customizations to Payment component to let customers who can pay with iDeal to choose for their bank.

![order-review](https://user-images.githubusercontent.com/26965893/60960038-9026b600-a309-11e9-9f94-0290c63e7c7c.png)

# Manage payment methods
To enable payment methods in your Vue Storefront checkout you have to follow these steps:

1. Enable the payment method in your Mollie dashboard
1. Enable the payment method in the Mollie Payments for Magento 2 module in your Magento 2 backend system
1. Add the paymentmethod to the payment_methods_mapping property in the order property config.

**NB:** iDeal payment method example in `config/local.json`:
```
...
"orders": {
  ...
  "payment_methods_mapping": {
    "ideal": "mollie_methods_ideal",
  }   
}

```

![paymentmethods-listing](https://user-images.githubusercontent.com/26965893/60957691-5a7fce00-a305-11e9-8947-35bdeb736123.png)

# Important notes
It's not yet possible to pay for orders that are placed when the user is offline. This feature gets added in a later stadium.
Make sure to test this module extensively when you integrate it in your project. If you find any bugs please reach out. Underneath you'll find info in the ways this is possible.

# Support
This module is built to enable Mollie Payments API in Vue Storefront checkout.
Use at your own responsibility in your project. This module is tested on Vue Storefront 1.9.2. 
If you need any assistance or want to do feature requests you can turn to these channels:

**NB:** Any feedback is more than welcome and we would really like it if you could post in the following places:

* Create issue in this Github repository
* Add comment on the Vue Storefront Forum - Mollie Payments API payment integration Module thread: 
* Join the [Vue Storefront Slack community](https://vuestorefront.slack.com) via [invitation link](https://join.slack.com/t/vuestorefront/shared_invite/enQtMzA4MTM2NTE5NjM2LTI1M2RmOWIyOTk0MzFlMDU3YzJlYzcyYzNiNjUyZWJiMTZjZjc3MjRlYmE5ZWQ1YWRhNTQyM2ZjN2ZkMzZlNTg)

# License
This module is completely free and released under the MIT License.