<catalog_brief>
name: ReducedPriceWishlist
full_name: Discount on Wishlist Items
description: Notify users about price drops on products added to the wishlist.
variant: email
</catalog_brief>

<trigger_instruction>
<brief>
Brief:
This is a trigger for a price reduction for a product from the wishlist. The main goal is to encourage the customer to purchase the product they added to their wishlist by motivating them with a discount that has appeared on this product. Communication is carried out by sending 1 reminder email.
</brief>

<start_trigger>
It should start for discount wishlist segment once a day (any day of week) starting from tomorrow at 09:00, but no more than once a week for the specific contact (ignore idempotency guard).
</start_trigger>

<generation_plan>
The main flow should follow:
Send the email and then complete the script
</generation_plan>
</trigger_instruction>
