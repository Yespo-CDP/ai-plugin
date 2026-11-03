<catalog_brief>
name: ReducedPriceView
full_name: Discount on Viewed Products
description: Notify users when products they viewed become cheaper.
variant: omnichannel
</catalog_brief>

<trigger_instruction>
<brief>
Brief:
This is a trigger for a price reduction on reviewed products. The main goal is to draw attention to the fact that reviewed products have become cheaper and thereby motivate to place an order. Communication is carried out by sending up to 4 messages to different channels.
</brief>

<start_trigger>
It should start for discount viewed segment once a day (any day of week) starting from tomorrow at 10:00, but no more than once a week for the specific contact (ignore idempotency guard).
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
