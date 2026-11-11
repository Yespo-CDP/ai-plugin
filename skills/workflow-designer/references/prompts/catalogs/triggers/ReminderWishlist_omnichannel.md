<catalog_brief>
name: ReminderWishlist
full_name: Wishlist Reminder
description: Remind users about products they added to their wishlist.
variant: omnichannel
</catalog_brief>

<trigger_instruction>
<brief>
Brief:
This is a reminder trigger for a product added to the wishlist. The main goal is to attract the user's attention to the product/products that he added to his favorites. Communication is carried out by sending up to 4 messages to different channels.
</brief>

<start_trigger>
It should start for wishlist reminder segment once a day (any day of week) starting from tomorrow at 15:00, but no more than once a week for the specific contact (ignore idempotency guard).
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
