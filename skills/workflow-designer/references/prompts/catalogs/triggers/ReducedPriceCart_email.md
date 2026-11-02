<catalog_brief>
name: ReducedPriceCart
full_name: Discount on Items in Cart
description: Encourage purchase when prices drop on items added to the cart.
variant: email
</catalog_brief>

<trigger_instruction>
<brief>
Brief:
This is a trigger for a price reduction on a product added to the cart. The main goal is to encourage the customer to complete the purchase by motivating him with a discount that has appeared on the products in the cart. Communication is carried out by sending 1 reminder email
</brief>

<start_trigger>
It should start for discount cart items segment once a day (any day of week) starting from tomorrow at 09:00, but no more than once a week for the specific contact (ignore idempotency guard).
</start_trigger>

<generation_plan>
The main flow should follow:
Send the email and then complete the script
</generation_plan>
</trigger_instruction>
