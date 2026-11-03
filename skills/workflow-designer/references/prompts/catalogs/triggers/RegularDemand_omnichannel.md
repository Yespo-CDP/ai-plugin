<catalog_brief>
name: RegularDemand
full_name: Repeat Purchase
description: Encourage replenishment of products with regular demand.
variant: omnichannel
</catalog_brief>

<trigger_instruction>
<brief>
Brief:
This is a regular demand trigger. The main goal is to stimulate repeat sales of products that are ending and need to be restocked. Communication is carried out by sending up to 4 messages to different channels.
</brief>

<start_trigger>
It should start for repeat purchase segment once a day (any day of week) starting from tomorrow at 12:00, but no more than once a week for the specific contact (ignore idempotency guard).
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
