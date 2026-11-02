<catalog_brief>
name: OutOfStockWishlist
full_name: Wishlist Item Out of Stock
description: Suggest alternatives when a wishlist item is unavailable.
variant: email
</catalog_brief>

<trigger_instruction>
<brief>
Brief:
This is a wishlist item out of stock trigger. The main goal is to offer an alternative to a product that has been added to the wishlist but is out of stock. Communication is done by sending 1 reminder email.
</brief>

<start_trigger>
It should start for wishlist out of stock segment once an hour starting from tomorrow, but no more than once a week for the specific contact (ignore idempotency guard).
</start_trigger>

<generation_plan>
The main flow should follow:
Send the email and then complete the script
</generation_plan>
</trigger_instruction>
