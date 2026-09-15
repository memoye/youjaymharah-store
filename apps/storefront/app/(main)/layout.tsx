import { Metadata } from "next"

// import { listCartOptions, retrieveCart } from "@lib/data/cart"
// import { retrieveCustomer } from "@lib/data/customer"
// import { getBaseURL } from "@lib/util/env"
// import { StoreCartShippingOption } from "@medusajs/types"
import { getBaseURL } from "@/lib/util/env"
import { Header } from "@/components/layout/header"
// import CartMismatchBanner from "@modules/layout/components/cart-mismatch-banner"
// import Footer from "@modules/layout/templates/footer"
// import Nav from "@modules/layout/templates/nav"
// import FreeShippingPriceNudge from "@modules/shipping/components/free-shipping-price-nudge"

export const metadata: Metadata = {
  metadataBase: new URL(getBaseURL()),
}

export default async function PageLayout(props: LayoutProps<"/">) {
  // const customer = await retrieveCustomer()
  // const cart = await retrieveCart()
  // let shippingOptions: StoreCartShippingOption[] = []

  // if (cart) {
  // const { shipping_options } = await listCartOptions()

  // shippingOptions = shipping_options
  // }

  return (
    <>
      <Header />
      {/*{customer && cart && (
        <CartMismatchBanner customer={customer} cart={cart} />
      )}*/}

      {/*{cart && (
        <FreeShippingPriceNudge
          variant="popup"
          cart={cart}
          shippingOptions={shippingOptions}
        />
      )}*/}
      {props.children}
      {/*<Footer />*/}
    </>
  )
}
