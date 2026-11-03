<catalog_brief>
name: ReducedPriceSimilarView
full_name: Discount on Similar Viewed Products
description: Highlight discounted products similar to recently viewed products
variant: omnichannel
</catalog_brief>

<trigger_instruction>
<brief>
Brief:
This is a trigger for price reductions on similar products to those viewed. The main goal is to attract attention with products that have been discounted and are similar to those that were recently viewed but not purchased. Communication is carried out by sending up to 4 messages to different channels.
</brief>

<start_trigger>
It should start for discount similar viewed segment once a day (any day of week) starting from tomorrow at 11:00, but no more than once a week for the specific contact (ignore idempotency guard).
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
