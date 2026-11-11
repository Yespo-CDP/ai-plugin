<catalog_brief>
name: NextBestOffer
full_name: Next Best Offer
description: Recommend complementary or frequently bought together products.
variant: omnichannel
</catalog_brief>

<trigger_instruction>
<brief>
Brief:
This is a next best offer trigger. The main goal is to recommend additional products that can complement the purchased ones or that are often purchased together with the purchased ones. Communication is carried out by sending up to 4 messages to different channels.
</brief>

<start_trigger>
It should start for next best offer segment once an hour starting from tomorrow, but no more than once a week for the specific contact (ignore idempotency guard).
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
