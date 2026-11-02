<catalog_brief>
name: BackInStockWishlist
full_name: Wishlist Item Back in Stock
description: Notify users when a product in their wishlist is back in stock.
variant: omnichannel
</catalog_brief>

<trigger_instruction>
<brief>
Brief:
This is a trigger for a product from the wishlist to become available. The main goal is to encourage the user to purchase a product that the user added to their favorites, but was not available at that time. Communication is carried out by sending up to 4 messages to different channels.
</brief>

<start_trigger>
It should start for wishlist back in stock segment once a day (any day of week) starting from tomorrow at 12:00, but no more than once a week for the specific contact (ignore idempotency guard).
</start_trigger>

<generation_plan>
The main flow should follow:
Start by sending a web push
Next step, send an email
Wait 24 hours
Send viber
Wait 5 minutes
Check if the viber was delivered
If the viber was delivered, wait 24 hours and send sms
If the viber was not delivered - send sms
End of script
</generation_plan>
</trigger_instruction>
