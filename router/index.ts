import { RouteConfig } from 'vue-router'
import OrderStatus from '../pages/OrderStatus.vue'

let routes: RouteConfig[] = []
routes = routes.concat([
  { name: 'order-status', path: '/order-status/:order_token', component: OrderStatus }
])
export default routes
