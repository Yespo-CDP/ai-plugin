<catalog_brief>
name: AbSearch
full_name: Abandoned Search
description: Offer relevant products when a user's search returns no results.
variant: omnichannel
</catalog_brief>

<trigger_instruction>
<brief>
Brief:
This is an abandoned search trigger. The main goal is to attract attention and offer a selection of bestsellers or personal recommendations in a situation where the user was looking for a product, but the search did not yield any results. Communication is carried out by sending up to 4 messages to different channels.
</brief>

<start_trigger>
It should start for abandoned search once an hour starting from tomorrow, but no more than once a week for the specific contact (ignore idempotency guard).
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
