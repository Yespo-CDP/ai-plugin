<catalog_brief>
name: BackInStockWishlist
full_name: Wishlist Item Back in Stock
description: Notify users when a product in their wishlist is back in stock.
variant: email
</catalog_brief>

<trigger_instruction>
<brief>
Brief:
This is a trigger for a product from the wishlist that is now available. The main goal is to encourage the user to purchase a product that the user added to their wishlist but was not currently available. Communication is done by sending 1 reminder email.
</brief>

<start_trigger>
It should start for wishlist back in stock segment once a day (any day of week) starting from tomorrow at 12:00, but no more than once a week for the specific contact (ignore idempotency guard).
</start_trigger>

<generation_plan>
The main flow should follow:
Send the email and then complete the script
</generation_plan>
</trigger_instruction>
