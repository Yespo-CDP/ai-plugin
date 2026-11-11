<catalog_brief>
name: AbView
full_name: Abandoned Browse
description: Bring users back by reminding them about products they viewed.
variant: email
</catalog_brief>

<trigger_instruction>
<brief>
Brief:
This is an abandoned view trigger, the main goal of which is to bring the user back to the site for further purchase. In addition to the viewed products, the user is provided with personalized recommendations based on the viewed products. Communication is carried out by sending up to 3 reminder emails with an interval of 24 hours.
</brief>

<start_trigger>
It should start for abandoned view segment once an hour starting from tomorrow, but no more than once a week for the specific contact (ignore idempotency guard).
</start_trigger>

<generation_plan>
The main flow should follow:
Start by sending an email
Wait 24 hours
Send 2nd email
Wait 24 hours
Send 3rd email
End script
</generation_plan>
</trigger_instruction>
