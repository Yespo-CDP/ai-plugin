<catalog_brief>
name: NewArrivals
full_name: New Arrivals
description: Show new products from categories the user previously explored.
variant: omnichannel
</catalog_brief>

<trigger_instruction>
<brief>
Brief:
This is a new product trigger. The main goal is to attract the attention of a user who has previously viewed products but has not made a purchase. A message is sent with new products that have appeared in the categories that the user has viewed. Communication is carried out by sending up to 4 messages to different channels.
</brief>

<start_trigger>
It should start for new arrivals segment once a day (any day of week) starting from tomorrow at 12:00, but no more than once a week for the specific contact (ignore idempotency guard).
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
