<catalog_brief>
name: Discounts
full_name: Discounts
description: Promote discounted products from categories the user showed interest in.
variant: email
</catalog_brief>

<trigger_instruction>
<brief>
Brief:
This is a discount trigger. The main goal is to attract the user's attention by sending an email message with products that are discounted and are in the categories that the user has viewed. Communication is carried out by sending 1 reminder email.
</brief>

<start_trigger>
It should start for discounts segment once a month (any day of week) starting from the first Friday of the next month at 15:00, but no more than once the 30 days for the specific contact (ignore idempotency guard).
</start_trigger>

<generation_plan>
The main flow should follow:
Send the email and then complete the script
</generation_plan>
</trigger_instruction>
