<catalog_brief>
name: BackInStock
full_name: Back in Stock
description: Notify users when a previously viewed product becomes available.
variant: email
</catalog_brief>

<trigger_instruction>
<brief>
Brief:
This is a product is back in stock trigger. The main goal is to notify the user that the previously viewed product is back in stock and thereby attract their attention. Communication is carried out by sending 1 reminder email.
</brief>

<start_trigger>
It should start for back in stock segment once a day (any day of week) starting from tomorrow at 12:00, but no more than once a week for the specific contact (ignore idempotency guard).
</start_trigger>

<generation_plan>
The main flow should follow:
Send the email and then complete the script
</generation_plan>
</trigger_instruction>
