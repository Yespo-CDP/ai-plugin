<catalog_brief>
name: OutOfStockWishlist
full_name: Wishlist Item Out of Stock
description: Suggest alternatives when a wishlist item is unavailable.
variant: omnichannel
</catalog_brief>

<trigger_instruction>
<brief>
Brief:
This is a trigger for a product from the wishlist that is out of stock. The main goal is to offer an alternative to a product that has been added to the favorites but is out of stock. Communication is carried out by sending up to 4 messages to different channels.
</brief>

<start_trigger>
It should start for wishlist out of stock segment once an hour starting from tomorrow, but no more than once a week for the specific contact (ignore idempotency guard).
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
