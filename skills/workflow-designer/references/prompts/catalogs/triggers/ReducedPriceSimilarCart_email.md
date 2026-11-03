<catalog_brief>
name: ReducedPriceSimilarCart
full_name: Discount on Similar Cart Items
description: Promote discounted alternatives similar to items left in the cart.
variant: email
</catalog_brief>

<trigger_instruction>
<brief>
Brief:
This is a trigger for a price reduction on similar products to those abandoned in the cart. The main goal is to attract the user's attention to products that have a reduced price and are similar to those added to the cart. If the user does not dare to buy products from the cart, then perhaps the presence of a discount on similar products will persuade him to buy. Communication is carried out by sending 1 reminder email.
</brief>

<start_trigger>
It should start for discount similar cart segment once a day (any day of week) starting from tomorrow at 10:00, but no more than once a week for the specific contact (ignore idempotency guard).
</start_trigger>

<generation_plan>
The main flow should follow:
Send the email and then complete the script
</generation_plan>
</trigger_instruction>
