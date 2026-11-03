<catalog_brief>
name: InactiveUserReactivation
full_name: Inactive Users Reactivation
description: Re-engage users who haven't interacted with your site for a while.
variant: omnichannel
</catalog_brief>

<trigger_instruction>
<brief>
Brief:
This is a trigger for reactivating inactive users. The main goal is to remind yourself and attract the attention of those who have not visited the site for more than 30 days. Communication is carried out by sending up to 4 messages to different channels.
</brief>

<start_trigger>
It should start for inactive users segment once a day (any day of week) starting from tomorrow at 15:00, but no more than once a 90 days for the specific contact (ignore idempotency guard).
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
