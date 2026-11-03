<catalog_brief>
name: BackInStock
full_name: Back in Stock
description: Notify users when a previously viewed product becomes available.
variant: omnichannel
</catalog_brief>

<trigger_instruction>
<brief>
Brief:
This is a product is back in stock trigger. The main goal is to notify the user that the previously viewed product is back in stock and thereby attract their attention. Communication is carried out by sending up to 4 messages to different channels.
</brief>

<start_trigger>
It should start for back in stock segment once a day (any day of week) starting from tomorrow at 12:00, but no more than once a week for the specific contact (ignore idempotency guard).
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
