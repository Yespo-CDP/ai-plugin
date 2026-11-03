<catalog_brief>
name: OutOfStock
full_name: Out of Stock
description: Offer available alternatives when a viewed product is unavailable.
variant: omnichannel
</catalog_brief>

<trigger_instruction>
<brief>
Brief:
This is an out of stock trigger. The main goal is to notify the user that the recently viewed product is out of stock and offer alternatives that are in stock. Communication is carried out by sending up to 4 messages to different channels.
</brief>

<start_trigger>
It should start for out of stock segment once an hour starting from tomorrow, but no more than once a week for the specific contact (ignore idempotency guard).
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
