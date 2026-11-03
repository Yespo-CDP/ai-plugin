<catalog_brief>
name: ReducedPriceSimilarWishlist
full_name: Discount on Similar Wishlist Items
description: Promote discounted alternatives similar to items in the wishlist.
variant: email
</catalog_brief>

<trigger_instruction>
<brief>
Brief:
This is a trigger for price reduction on similar items from the wishlist. The main goal is to attract the user's attention with discounted items that are similar to the items added to the favorites. Communication is carried out by sending 1 reminder email.
</brief>

<start_trigger>
It should start for discount similar wishlist segment once a day (any day of week) starting from tomorrow at 12:00, but no more than once a week for the specific contact (ignore idempotency guard).
</start_trigger>

<generation_plan>
The main flow should follow:
Send the email and then complete the script
</generation_plan>
</trigger_instruction>
