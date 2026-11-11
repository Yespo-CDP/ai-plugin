<catalog_brief>
name: AbView
full_name: Abandoned Browse
description: Bring users back by reminding them about products they viewed.
variant: omnichannel
</catalog_brief>

<trigger_instruction>
<brief>
Brief:
This is an abandoned views trigger, the main goal of which is to return the user to the site for the purpose of further purchase. In addition to the viewed products, the user is provided with personal recommendations based on the viewed products. Communication is carried out by sending up to 4 messages to different channels.
</brief>

<start_trigger>
It should start for abandoned view segment once an hour starting from tomorrow, but no more than once a week for the specific contact (ignore idempotency guard).
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
